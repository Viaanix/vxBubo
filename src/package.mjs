import path from 'path';
import fs from 'node:fs';
import { finished } from 'stream/promises';
import {
  checkPath,
  createFile,
  formatJson,
  getLocalFile,
  getWidgetLocal,
  validatePath,
  fetchHandler
} from './utils.mjs';
import { localWidgetPath, scratchPath, tbHost } from '../index.mjs';
import chalk from 'chalk';

// Helpers
export const widgetJsonPath = (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
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
  }
  // {
  //   property: 'showWidgetActionFunction',
  //   extension: 'js',
  // }
];

// Actions
export const fetchAndSaveRemoteWidget = async (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }

  const request = await fetchHandler(`${tbHost()}/api/widgetType/${widgetId}`);

  if (request.ok) {
    await validatePath(path.join(scratchPath, 'widgets'));
    const stream = fs.createWriteStream(widgetJsonPath(widgetId));
    await finished(fs.ReadStream.fromWeb(request.body).pipe(stream));
  } else {
    const response = await request.json();
    throw Error(response.message);
  }
};

export const parseWidgetExport = async (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
  const outputAction = 'write';
  const widgetJson = await getWidgetLocal(widgetJsonPath(widgetId));

  // Create local widget resources
  await processWidgetResources(widgetJson, outputAction);

  // Create local widget actions
  if (widgetJson.descriptor.defaultConfig) {
    await processActions(widgetJson, outputAction);
  }
};

export const publishLocalWidget = async (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
  const outputAction = 'bundle';
  let widgetJson = await getWidgetLocal(widgetJsonPath(widgetId));
  const widgetName = widgetJson.name;

  // Process widget resources
  const resources = await processWidgetResources(widgetJson, outputAction);
  widgetJson.descriptor = { ...widgetJson.descriptor, ...resources };

  // Process widget actions
  if (widgetJson.descriptor.defaultConfig) {
    widgetJson.descriptor.defaultConfig = JSON.stringify(await processActions(widgetJson, outputAction));
  }

  // const widgetPath = path.join(localWidgetPath, widgetJson.name);
  // const widgetTestFile = path.join(widgetPath, 'test.json')
  widgetJson = formatJson(widgetJson);

  // await createFile(path.join(widgetPath, 'test.json'), widgetJson);

  const params = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: widgetJson
  };
  const request = await fetchHandler(`${tbHost()}/api/widgetType`, params);
  if (request.status === 200) {
    // const response = await request.json();
    // console.log(response);

    // Backup current widget
    fs.copyFileSync(widgetJsonPath(widgetId), path.join(scratchPath, 'widgets', `${widgetId}.json.bak`));

    // Update Local Widget Export
    await createFile(widgetJsonPath(widgetId), widgetJson);
    console.log(chalk.green(`🦉 Widget ${widgetName} has successfully been published`));
  }
};

const processActions = async (widgetJson, output) => {
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
          const actionPath = path.join(localWidgetPath, widgetJson.name, 'actions', source, action.name);
          // Create widget action resources
          actionWriteMap.map(async (a) => {
            const actionFileName = `${a.property}.${a.extension}`;
            const actionFilePath = path.join(actionPath, actionFileName);
            if (isWrite) {
              if (!action[a.property]) return;
              await createFile(path.join(actionPath, actionFileName), action[a.property]);
            } else if (isBundle && await checkPath(actionFilePath)) {
              action[a.property] = await getLocalFile(path.join(actionPath, actionFileName));
            }
          });
          return action;
        });
      })
    );
  }
  return actionsFormatted;
};

const processWidgetResources = async (widgetJson, output) => {
  const isWrite = output === 'write';
  const isBundle = output === 'bundle';
  const widgetPath = path.join(localWidgetPath, widgetJson.name);
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
      if (isBundle && await checkPath(resourcePath)) {
        const data = await getLocalFile(resourcePath);
        if (widgetJson.descriptor[resource.property]) {
          updatedResources[resource.property] = data;
        }
      }
    })
  );
  return updatedResources;
};
