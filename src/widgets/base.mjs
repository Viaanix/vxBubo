import path from 'path';
import fs from 'node:fs';
import { glob } from 'glob';
import { checkPath, createFile, formatJson, getLocalFile, mergeDeep, validatePath, buboOutput } from '../utils.mjs';
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
    types: ['custom', 'customPretty'],
    extension: 'html'
  },
  {
    property: 'customCss',
    types: ['custom', 'customPretty'],
    extension: 'css'
  },
  {
    property: 'showWidgetActionFunction',
    extension: 'js',
    name: 'showWidgetActionFunction'
  }
];

/**
 * Prepare the local widget JSON by removing resources that have files, creating a protected key, and removing actions.
 *
 * @param {Object} widgetJson - The original widget JSON object.
 * @returns {string} - The formatted JSON string of the modified widget JSON.
 */
const prepareLocalWidgetJson = async (widgetJson) => {
  const newWidgetJson = { ...widgetJson };

  // Remove Resources that we have files for
  for (const key of resourcesWriteMap) {
    delete newWidgetJson.descriptor[key.property];
  }

  // Create a protected key that will allow for a sync
  newWidgetJson.protected = {};
  const widgetProtectedKeys = ['id', 'createdTime', 'tenantId', 'bundleAlias'];
  for (const key of widgetProtectedKeys) {
    if (newWidgetJson[key]) {
      newWidgetJson.protected[key] = newWidgetJson[key];
      delete newWidgetJson[key];
    }
  }

  newWidgetJson.protected.descriptor = {
    defaultConfig: newWidgetJson.descriptor.defaultConfig
  };

  // Remove Actions
  delete newWidgetJson.descriptor.defaultConfig;

  return formatJson(newWidgetJson);
};

/**
 * Fetches a remote widget by its ID, validates the path to save the widget locally,
 * and creates a file with the fetched widget data in JSON format.
 *
 * @param {string} widgetId - The ID of the remote widget to fetch and save locally.
 * @throws {Error} If there is an error during the process.
 */
export const fetchAndSaveRemoteWidgetLocal = async (widgetId) => {
  try {
    // Fetch the remote widget data by its ID
    const response = await getWidgetByID(widgetId);

    // Ensure that the path to save the widget locally exists
    await validatePath(path.join(scratchPath, 'widgets'));

    // Create a file with the fetched widget data in JSON format at the specified path
    await createFile(widgetJsonSourcePath(widgetId), formatJson(response.data));
  } catch (error) {
    // Log and rethrow any errors that occur
    log.error('fetchAndSaveRemoteWidgetLocal =>', error);
    throw Error(error.message);
  }
};

/**
 * Fetches a remote widget by its ID, saves it locally, and then parses its export.
 * @param {string} widgetId - The ID of the widget to fetch and parse.
 * @returns {Promise} - A promise that resolves when the widget is fetched and parsed.
 */
export const fetchAndParseRemoteWidget = async (widgetId) => {
  try {
    await fetchAndSaveRemoteWidgetLocal(widgetId);
    await parseWidgetExport(widgetId);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

export const parseWidgetExport = async (widgetId) => {
  guardRequireWidgetId(widgetId);

  const widgetSourcePath = widgetJsonSourcePath(widgetId);
  const widgetJsonSource = await getWidgetLocal(widgetSourcePath);
  const bundleAlias = await getBundleAliasFromWidgetJson(widgetJsonSource);
  const widgetPath = path.join(localWidgetPath, bundleAlias, widgetJsonSource.name);

  // Create local widget resources
  const outputAction = 'write';
  try {
    await Promise.all([
      processWidgetResources(widgetPath, widgetJsonSource, outputAction),
      processActions(widgetPath, widgetJsonSource, outputAction)
    ]);
  } catch (error) {
    console.error('Error processing widget resources or actions:', error);
    throw new Error(error);
  }

  // Create modified widgetJson named widget.json in the widget root for modification.
  const localWidgetJson = await prepareLocalWidgetJson(widgetJsonSource);
  try {
    await createFile(path.join(widgetPath, 'widget.json'), localWidgetJson);
  } catch (error) {
    console.error('Error creating widget.json:', error);
    throw new Error(error);
  }
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
  // console.debug(`widgetPath => ${widgetPath}`);

  // Get localWidgetJson
  let localWidgetJson = await getWidgetLocal(path.join(widgetPath, 'widget.json'));
  // console.log(localWidgetJson.name);
  if (!widget.id && widgetPath) {
    widgetId = localWidgetJson.protected.id.id;
  }
  // console.log(`widgetId => ${widgetId}`);

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

/**
 * Deploys a widget by publishing it using the provided widgetJson object.
 * @param {Object} widgetJson - The widget object to be published.
 * @returns {Promise<Object>} - The response object from the publishWidget function.
 */
export const deployWidgetJson = async (widgetJson) => {
  try {
    const widgetJsonFormatted = formatJson(widgetJson);
    const request = await publishWidget(widgetJsonFormatted);

    if (request.status === 200) {
      buboOutput({
        emoji: 'bubo',
        style: 'success',
        message: `Widget ${widgetJson.name} has successfully been published`
      });
    } else {
      buboOutput({
        emoji: 'error',
        style: 'error',
        message: `Unable to publish ${widgetJson.name}, ${request.data.message}`
      });
    }

    return request;
  } catch (error) {
    console.error(chalk.red(`🦉 An error occurred while deploying the widget: ${error.message}`));
    throw error;
  }
};

/**
 * Process actions for a widget.
 *
 * @param {string} widgetPath - The path to the widget.
 * @param {object} widgetJson - The widget JSON object.
 * @param {string} output - The output type ('write' or 'bundle').
 * @returns {object} - The formatted actions object.
 * @throws {Error} - If the output value is not 'write' or 'bundle'.
 */
export const processActions = async (widgetPath, widgetJson, output) => {
  let actionsFormatted = {};
  // Parse the defaultConfig property of the widgetJson object into a JavaScript object
  if (widgetJson?.descriptor?.defaultConfig) {
    actionsFormatted = JSON.parse(widgetJson.descriptor.defaultConfig);
  } else {
    actionsFormatted = widgetJson.config;
  }

  // Check if the output value is valid
  if (output !== 'write' && output !== 'bundle') {
    throw new Error('Specify a valid processActions output');
  }

  // Determine the output type
  const isWrite = output === 'write';
  const isBundle = output === 'bundle';
  // Process actions if the actions property exists in the defaultConfig object
  if (actionsFormatted.actions) {
    // Iterate over each action source
    for (const [source, data] of Object.entries(actionsFormatted.actions)) {
      // Iterate over each action
      for (const action of data) {
        const actionPath = path.join(widgetPath, 'actions', source, action.name);
        // Iterate over the actionWriteMap array
        Promise.all(
          actionWriteMap.map(async (a) => {
            // for (const a of actionWriteMap) {
          // Skip if the action type is not included in the types array of the current actionWriteMap item
            if (a?.types && !a.types.includes(action.type)) {
              // console.log(action.type, 'not found in ', a.types);
              return;
            // continue;
            }

            const actionFileName = `${a?.name ? a.name : action.name}.${a.extension}`;
            const actionFilePath = path.join(actionPath, actionFileName);

            if (isWrite) {
              // Skip if the action object does not have a property corresponding to the current actionWriteMap item
              if (!action[a.property]) {
                return;
              // continue;
              }
              await createFile(actionFilePath, action[a.property]);
            } else if (isBundle) {
              let value = 'null';
              // Check if the action file exists and read its content
              if (await checkPath(actionFilePath)) {
                value = await getLocalFile(actionFilePath);
              }
              action[a.property] = value;
            }
          })
        );
      }
    }
  }
  return actionsFormatted;
};

/**
 * Processes the resources of a widget.
 * @param {string} widgetPath - The path to the widget directory.
 * @param {object} widgetJson - The widget JSON object containing the descriptor and resources.
 * @param {string} output - The output mode, either "write" or "bundle".
 * @returns {Promise<object>} - An object containing the processed resources.
 * @throws {Error} - If the output mode is invalid.
 */
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
      if (!widgetAlias) {
        log.error('Cannot find alias');
      }
      const resFileName = resource.name ? `${resource.name}.${resource.extension}` : `${widgetAlias}.${resource.extension}`;
      const resourcePath = path.join(widgetPath, resFileName);

      if (isWrite && widgetJson.descriptor[resource.property]) {
        await createFile(resourcePath, widgetJson.descriptor[resource.property]);
      }

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

/**
 * Searches for widget files in a specified directory, reads their contents, and saves them remotely.
 * @returns {Promise<void>} A promise that resolves when all widget files have been fetched and saved remotely.
 */
export const findLocalWidgetsSourceIds = async () => {
  const widgetFiles = await glob('**/widget.json', {
    cwd: localWidgetPath,
    root: ''
  });

  if (widgetFiles.length === 0) {
    buboOutput({
      emoji: 'warning',
      style: 'warning',
      message: 'There are no widgets to sync'
    });
    return;
  }

  await Promise.all(
    widgetFiles.map(async (widget) => {
      const localWidgetJsonPath = path.join(localWidgetPath, widget);
      const localWidget = await getLocalFile(localWidgetJsonPath);
      const localWidgetJson = JSON.parse(localWidget);
      await fetchAndSaveRemoteWidgetLocal(localWidgetJson.protected.id.id);
    })
  );
};
