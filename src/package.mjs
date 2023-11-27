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

export const widgetJsonPath = (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
  return path.join(scratchPath, 'widgets', `${widgetId}.json`);
};

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
  const outputAction = 'bundle';

  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }

  let widgetJson = await getWidgetLocal(widgetJsonPath(widgetId));

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
  // const response = await request.json();
  // console.log(response);

  // Backup current widget
  fs.copyFileSync(widgetJsonPath(widgetId), path.join(scratchPath, 'widgets', `${widgetId}.json.bak`));

  // Update Local Widget Export
  await createFile(widgetJsonPath(widgetId), widgetJson);
};

const resourcesWriteMap = [
  {
    extension: 'js',
    property: 'controllerScript'
  },
  {
    extension: 'html',
    property: 'templateHtml'
  },
  {
    extension: 'css',
    property: 'templateCss'
  },
  {
    extension: 'json',
    property: 'settingsSchema',
    name: 'settingsSchema'
  },
  {
    extension: 'json',
    property: 'dataKeySettingsSchema',
    name: 'dataKeySettingsSchema'
  }
];

const actionWriteMap = [
  {
    extension: 'js',
    property: 'customFunction'
  },
  {
    extension: 'html',
    property: 'customHtml'
  },
  {
    extension: 'css',
    property: 'customCss'
  },
  {
    extension: 'js',
    property: 'showWidgetActionFunction'
  }
];

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
