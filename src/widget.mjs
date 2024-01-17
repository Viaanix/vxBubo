import path from 'path';
import fs from 'node:fs';
import { glob } from 'glob';
import { checkPath, createFile, formatJson, getLocalFile, getWidgetLocal, mergeDeep, validatePath } from './utils.mjs';
import { localWidgetPath, scratchPath } from '../index.mjs';
import chalk from 'chalk';
import { getWidgetByID, publishWidget } from './api/widget.mjs';
import { logger } from './logger.mjs';

const log = logger.child({ prefix: 'widget' });

// Helpers
const guardRequireWidgetId = (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
};

export const widgetJsonPath = (widgetId) => {
  guardRequireWidgetId(widgetId);
  return path.join(scratchPath, 'widgets', `${widgetId}.json`);
};

const resourcesWriteMap = [
  {
    property: 'controllerScript',
    extension: 'js'
  },
  {
    property: 'templateHtml',
    extension: 'html'
  },
  {
    property: 'templateCss',
    extension: 'css'
  },
  {
    property: 'settingsSchema',
    extension: 'json',
    name: 'settingsSchema'
  },
  {
    property: 'dataKeySettingsSchema',
    extension: 'json',
    name: 'dataKeySettingsSchema'
  }
];

const actionWriteMap = [
  {
    property: 'customFunction',
    extension: 'js'
  },
  {
    property: 'customHtml',
    extension: 'html'
  },
  {
    property: 'customCss',
    extension: 'css'
  },
  {
    property: 'showWidgetActionFunction',
    extension: 'js'
  }
];

export const fetchAndParseRemoteWidget = async (widgetId) => {
  await fetchAndSaveRemoteWidget(widgetId);
  await parseWidgetExport(widgetId);
};

// Actions
export const fetchAndSaveRemoteWidget = async (widgetId) => {
  try {
    const response = await getWidgetByID(widgetId);
    await validatePath(path.join(scratchPath, 'widgets'));
    await createFile(widgetJsonPath(widgetId), formatJson(response.data));
  } catch (error) {
    log.error(error);
    throw Error(error.message);
  }
};

const prepareLocalWidgetJson = async (widgetJson) => {
  // Remove Resources that we have files for
  resourcesWriteMap.forEach((key) => {
    delete widgetJson.descriptor[key.property];
  });
  // Create a protected key that will allow for a sync
  widgetJson.protected = {};
  const widgetProtectedKeys = ['id', 'createdTime', 'tenantId', 'bundleAlias'];
  widgetProtectedKeys.forEach((key) => {
    widgetJson.protected[key] = widgetJson[key];
    delete widgetJson[key];
  });

  widgetJson.protected.descriptor = {
    defaultConfig: widgetJson.descriptor.defaultConfig
  };

  // Remove Actions
  delete widgetJson.descriptor.defaultConfig;
  return formatJson(widgetJson);
};

export const parseWidgetExport = async (widgetId) => {
  guardRequireWidgetId(widgetId);

  const widgetSourcePath = widgetJsonPath(widgetId);
  const widgetJsonSource = await getWidgetLocal(widgetSourcePath);

  const widgetPath = path.join(localWidgetPath, widgetJsonSource.bundleAlias, widgetJsonSource.name);

  // Create local widget resources
  const outputAction = 'write';
  await processWidgetResources(widgetPath, widgetJsonSource, outputAction);

  // Create local widget actions
  await processActions(widgetPath, widgetJsonSource, outputAction);

  // Create modified widgetJson named widget.json in the widget root for modification.
  const localWidgetJson = await prepareLocalWidgetJson(widgetJsonSource);
  await createFile(path.join(widgetPath, 'widget.json'), localWidgetJson);
};

export const publishLocalWidget = async (widgetId) => {
  guardRequireWidgetId(widgetId);

  const widgetSourcePath = widgetJsonPath(widgetId);
  const widgetJsonSource = await getWidgetLocal(widgetSourcePath);
  const widgetPath = path.join(localWidgetPath, widgetJsonSource.bundleAlias, widgetJsonSource.name);

  // Get localWidgetJson
  let localWidgetJson = await getWidgetLocal(path.join(widgetPath, 'widget.json'));

  // Move Protected Keys back to root
  localWidgetJson = mergeDeep(localWidgetJson, localWidgetJson.protected);
  delete localWidgetJson.protected;
  // return await createFile(path.join(widgetPath, 'widget.unprotected.json'), localWidgetJson);

  // Process widget resources
  const outputAction = 'bundle';
  const resources = await processWidgetResources(widgetPath, localWidgetJson, outputAction);
  localWidgetJson.descriptor = { ...localWidgetJson.descriptor, ...resources };

  // Process widget actions
  localWidgetJson.descriptor.defaultConfig = JSON.stringify(await processActions(widgetPath, localWidgetJson, outputAction));
  const widgetJson = formatJson(localWidgetJson);
  // return await createFile(path.join(widgetPath, 'test.json'), widgetJson);

  const request = await publishWidget(widgetJson);
  if (request.status === 200) {
    // Backup current widget
    fs.copyFileSync(widgetJsonPath(widgetId), path.join(scratchPath, 'widgets', `${widgetId}.json.bak`));

    // Update Local Widget Export
    await createFile(widgetJsonPath(widgetId), widgetJson);

    // If the widget name  was modified, update the directory name
    if (widgetJsonSource.name !== localWidgetJson.name) {
      await fs.renameSync(widgetPath, path.join(localWidgetPath, widgetJsonSource.bundleAlias, localWidgetJson.name));
    }

    console.log(chalk.green(`🦉 Widget ${localWidgetJson.name} has successfully been published`));
  } else {
    console.log(chalk.red(`🦉 Unable to publish ${localWidgetJson.name}, ${request.data.message}`));
  }
};

const processActions = async (widgetPath, widgetJson, output) => {
  const actionsFormatted = JSON.parse(widgetJson.descriptor.defaultConfig);
  const isWrite = output === 'write';
  const isBundle = output === 'bundle';

  if (!isWrite && !isBundle) {
    throw new Error('Specify a valid processActions output');
  }

  // Process Actions
  if (actionsFormatted.actions) {
    const actionSources = Object.entries(actionsFormatted.actions);
    await Promise.all(
      actionSources.map(async ([source, data]) => {
        await data.map(async (action) => {
          const actionPath = path.join(widgetPath, 'actions', source, action.name);
          // Create widget action resources
          actionWriteMap.map(async (a) => {
            const actionFileName = `${a?.name ? a.name : action.name}.${a.extension}`;
            const actionFilePath = path.join(actionPath, actionFileName);
            if (isWrite) {
              if (!action[a.property]) return;
              await createFile(path.join(actionPath, actionFileName), action[a.property]);
            } else if (isBundle) {
              let value = 'null';
              if (await checkPath(actionFilePath)) {
                value = await getLocalFile(path.join(actionPath, actionFileName));
              }
              action[a.property] = value;
            }
          });
          return action;
        });
      })
    );
  }
  return actionsFormatted;
};

const processWidgetResources = async (widgetPath, widgetJson, output) => {
  const isWrite = output === 'write';
  const isBundle = output === 'bundle';
  const updatedResources = {};

  if (!isWrite && !isBundle) {
    throw new Error('Specify a valid processWidgetResources output');
  }

  await Promise.all(
    resourcesWriteMap.map(async (resource) => {
      const resFileName = resource.name ? `${resource.name}.${resource.extension}` : `${widgetJson.alias}.${resource.extension}`;
      const resourcePath = path.join(widgetPath, resFileName);

      // Write
      if (isWrite && widgetJson.descriptor[resource.property]) {
        await createFile(path.join(widgetPath, resFileName), widgetJson.descriptor[resource.property]);
      }
      // Bundle
      if (isBundle) {
        let value = '';
        if (await checkPath(resourcePath)) {
          value = await getLocalFile(resourcePath);
        }
        updatedResources[resource.property] = value;
      }
    })
  );
  return updatedResources;
};

export const findLocalWidgetsSourceIds = async () => {
  const widgetFiles = await glob('**/widget.json', {
    cwd: localWidgetPath,
    root: ''
  });
  // console.log('findLocalWidgetsSourceIds =>', widgetFiles);

  return await Promise.all(
    widgetFiles.map(async (widget) => {
      const localWidgetJsonPath = path.join(localWidgetPath, widget);
      const localWidget = await getLocalFile(localWidgetJsonPath);
      const localWidgetJson = JSON.parse(localWidget);
      return await fetchAndSaveRemoteWidget(localWidgetJson.protected.id.id);
    })
  );
};
