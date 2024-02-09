import path from 'path';
import fs from 'node:fs';
import { glob } from 'glob';
import { checkPath, createFile, formatJson, getLocalFile, mergeDeep, validatePath } from '../utils.mjs';
import { localWidgetPath, scratchPath } from '../../index.mjs';
import chalk from 'chalk';
import { getWidgetByID, publishWidget } from './api.mjs';
import { widgetJsonSourcePath, getWidgetLocal, getBundleAliasFromWidgetJson, guardRequireWidgetId, getAliasFromWidgetJson } from './helper.mjs';

import { logger } from '../logger.mjs';
const log = logger.child({ prefix: 'widget' });

// Helpers
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
  // {
  //   property: 'defaultConfig',
  //   extension: 'json',
  //   name: 'defaultConfig'
  // }
];
const actionWriteMap = [
  {
    property: 'customFunction',
    types: ['custom', 'customPretty'],
    extension: 'js'
  },
  {
    property: 'customHtml',
    types: ['customPretty'],
    extension: 'html'
  },
  {
    property: 'customCss',
    types: ['customPretty'],
    extension: 'css'
  },
  {
    property: 'showWidgetActionFunction',
    extension: 'js',
    name: 'showWidgetActionFunction'
  }
];

const prepareLocalWidgetJson = async (widgetJson) => {
  // Remove Resources that we have files for
  resourcesWriteMap.forEach((key) => {
    delete widgetJson.descriptor[key.property];
  });
  // Create a protected key that will allow for a sync
  widgetJson.protected = {};
  const widgetProtectedKeys = ['id', 'createdTime', 'tenantId', 'bundleAlias'];
  widgetProtectedKeys.forEach((key) => {
    if (widgetJson[key]) {
      widgetJson.protected[key] = widgetJson[key];
      delete widgetJson[key];
    }
  });

  widgetJson.protected.descriptor = {
    defaultConfig: widgetJson.descriptor.defaultConfig
  };

  // Remove Actions
  delete widgetJson.descriptor.defaultConfig;
  return formatJson(widgetJson);
};

// Actions

export const fetchAndSaveRemoteWidgetLocal = async (widgetId) => {
  try {
    const response = await getWidgetByID(widgetId);
    await validatePath(path.join(scratchPath, 'widgets'));
    await createFile(widgetJsonSourcePath(widgetId), formatJson(response.data));
  } catch (error) {
    log.error('fetchAndSaveRemoteWidgetLocal =>', error);
    throw Error(error.message);
  }
};

export const fetchAndParseRemoteWidget = async (widgetId) => {
  await fetchAndSaveRemoteWidgetLocal(widgetId);
  await parseWidgetExport(widgetId);
};

export const parseWidgetExport = async (widgetId) => {
  guardRequireWidgetId(widgetId);

  const widgetSourcePath = widgetJsonSourcePath(widgetId);
  const widgetJsonSource = await getWidgetLocal(widgetSourcePath);
  const bundleAlias = await getBundleAliasFromWidgetJson(widgetJsonSource);
  const widgetPath = path.join(localWidgetPath, bundleAlias, widgetJsonSource.name);

  // Create local widget resources
  const outputAction = 'write';
  await processWidgetResources(widgetPath, widgetJsonSource, outputAction);

  // Create local widget actions
  await processActions(widgetPath, widgetJsonSource, outputAction);

  // Create modified widgetJson named widget.json in the widget root for modification.
  const localWidgetJson = await prepareLocalWidgetJson(widgetJsonSource);
  await createFile(path.join(widgetPath, 'widget.json'), localWidgetJson);
};

export const publishLocalWidget = async (widget) => {
  // console.log('publishLocalWidget =>', widget);
  // guardRequireWidgetId(widget.id);
  const bundleOutput = await bundleLocalWidget(widget);
  return await deployWidgetJson(bundleOutput);
};

export const bundleLocalWidget = async (widget) => {
  let widgetId = widget.id || null;
  const widgetPath = widget.widgetPath;

  // Get localWidgetJson
  let localWidgetJson = await getWidgetLocal(path.join(widgetPath, 'widget.json'));
  if (!widget.id && widgetPath) {
    widgetId = localWidgetJson.id;
  }

  const widgetSourcePath = widgetJsonSourcePath(widgetId);
  const widgetJsonSource = await getWidgetLocal(widgetSourcePath);
  const bundleAlias = await getBundleAliasFromWidgetJson(widgetJsonSource);
  // const widgetPath = path.join(localWidgetPath, widgetLocalPath);

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

  // If the widget name  was modified, update the directory name
  if (widgetJsonSource.name !== localWidgetJson.name) {
    await fs.renameSync(widgetPath, path.join(localWidgetPath, bundleAlias, localWidgetJson.name));
  }

  await Promise.all([
    backupLocalWidgetBundle(widgetId, widgetJson),
    createFile(widgetJsonSourcePath(widgetId), widgetJson)
  ]);

  return localWidgetJson;
};

export const backupLocalWidgetBundle = async (widgetId, widgetJson) => {
  return fs.copyFileSync(widgetJsonSourcePath(widgetId), path.join(scratchPath, 'widgets', `${widgetId}.json.bak`));
};

export const deployWidgetJson = async (widgetJson) => {
  const widgetJsonFormatted = formatJson(widgetJson);
  const request = await publishWidget(widgetJsonFormatted);
  if (request.status === 200) {
    console.log(chalk.green(`🦉 Widget ${widgetJson.name} has successfully been published`));
  } else {
    console.log(chalk.red(`🦉 Unable to publish ${widgetJson.name}, ${request.data.message}`));
  }
  return request;
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
          actionWriteMap.map(async (a) => {
            // Only Process if action type matches
            if (a?.types && !a.types.includes(action.type)) {
              return;
            }

            // Create widget action resources
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
      const widgetAlias = getAliasFromWidgetJson(widgetJson);
      if (!widgetAlias) log.error('Cannot find alias');
      const resFileName = resource.name ? `${resource.name}.${resource.extension}` : `${widgetAlias}.${resource.extension}`;
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

  if (!widgetFiles.length) {
    console.log('🦉 There are no widgets to sync');
  }

  return await Promise.all(
    widgetFiles.map(async (widget) => {
      const localWidgetJsonPath = path.join(localWidgetPath, widget);
      const localWidget = await getLocalFile(localWidgetJsonPath);
      const localWidgetJson = JSON.parse(localWidget);
      return await fetchAndSaveRemoteWidgetLocal(localWidgetJson.protected.id.id);
    })
  );
};
