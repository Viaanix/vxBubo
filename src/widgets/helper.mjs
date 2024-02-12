import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { compareDesc } from 'date-fns';
import { localWidgetPath, scratchPath } from '../../index.mjs';
import { checkPath, getLocalFile } from '../utils.mjs';
import { getWidgetTenant } from './api.mjs';
import { logger } from '../logger.mjs';

const log = logger.child({ prefix: 'widget-helper' });

/**
 * Validates if a widgetId is provided.
 * @param {string} widgetId - The ID of the widget that needs to be validated.
 * @throws {Error} - Throws an error if widgetId is not provided.
 */
export const guardRequireWidgetId = (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
};

/**
 * Returns the path to the JSON file corresponding to the provided widgetId.
 * @param {string} widgetId - The ID of the widget.
 * @returns {string} - The path to the JSON file.
 */
export const widgetJsonSourcePath = (widgetId) => {
  // Ensure a valid widgetId is provided
  guardRequireWidgetId(widgetId);

  // Concatenate the scratchPath, 'widgets' directory, and widgetId with a '.json' extension
  const jsonPath = path.join(scratchPath, 'widgets', `${widgetId}.json`);

  return jsonPath;
};

/**
 * Retrieves the contents of a widget JSON file from the local file system.
 * @param {string} widgetPath - The path to the widget JSON file on the local file system.
 * @returns {Promise<object>} - The parsed JSON object from the widget JSON file.
 */
export const getWidgetLocal = async (widgetPath) => {
  try {
    const widgetJsonRaw = await getLocalFile(widgetPath);
    return JSON.parse(widgetJsonRaw);
  } catch (error) {
    console.error(`Error retrieving widget JSON file: ${error}`);
    throw error;
  }
};

/**
 * Retrieves the bundle alias from a widget JSON object.
 * If the bundle alias is not present, it extracts the first chunk of the fully qualified name (fqn) property.
 * If the fqn property has less than 2 chunks, it logs an error message and fetches the tenant info.
 * @param {Object} widgetJson - The widget JSON object containing the bundleAlias and fqn properties.
 * @returns {Promise<string>} - The bundle alias or the first chunk of the fqn property.
 */
export const getBundleAliasFromWidgetJson = async (widgetJson) => {
  if (widgetJson?.bundleAlias) {
    return widgetJson.bundleAlias;
  } else {
    const { fqn } = widgetJson;
    const fqnChunks = fqn.split('.');
    if (fqnChunks.length < 2) {
      log.error(`Cannot find bundleAlias ${widgetJson.tenantId.id}`);
      const tenantInfo = await getWidgetTenant(widgetJson.tenantId.id);
      log.error(`Cannot find bundleAlias but found tenantName ${tenantInfo.name}`);
      return tenantInfo.name;
    }
    const [bundleAlias] = fqnChunks;
    log.info(`widgetJSON fqn: ${fqn} bundleAlias: ${bundleAlias} alias: ${fqnChunks[1]}`);
    return bundleAlias;
  }
};

/**
 * Retrieves the alias from the given widget JSON object.
 *
 * @param {Object} widgetJson - The widget JSON object.
 * @returns {string} The alias of the widget. If the alias is not present, it returns the second chunk of the fully qualified name (fqn) or the first chunk if the fqn has only one chunk.
 */
export const getAliasFromWidgetJson = (widgetJson) => {
  const { alias, fqn } = widgetJson;
  if (alias) {
    return alias;
  }
  const fqnChunk = fqn.split('.');
  return fqnChunk[1] || fqnChunk[0];
};

/**
 * Discovers local widgets by searching for `widget.json` files in a specified directory.
 * Retrieves information about each widget, such as its name, ID, file path, and modification timestamp.
 * Checks for any modifications made to the widget's assets and sorts the discovered widgets based on the most recent modification.
 * @returns {Promise<Array<Object>>} An array of objects representing the discovered local widgets, sorted based on the most recent modification timestamp.
 * Each object contains the following properties:
 * - `name`: The name of the widget.
 * - `id`: The ID of the widget.
 * - `jsonPath`: The file path to the `widget.json` file.
 * - `widgetPath`: The file path to the widget directory.
 * - `modified`: The modification timestamp of the reference JSON file.
 * - `assetsModified`: The most recent modification timestamp of the widget's assets.
 */
export const discoverLocalWidgets = async () => {
  const widgetFiles = await glob('**/widget.json', {
    cwd: localWidgetPath,
    root: ''
  });

  const localWidgets = await Promise.all(
    widgetFiles.map(async (widget) => {
      const widgetJsonPath = path.join(localWidgetPath, widget);
      const widgetJson = await getWidgetLocal(widgetJsonPath);
      const referenceJsonPath = path.join(scratchPath, 'widgets', `${widgetJson.protected.id.id}.json`);
      const widgetPath = path.join(localWidgetPath, path.dirname(widget));

      const stats = fs.statSync(referenceJsonPath);
      const assetsModified = await findModifiedAgo(widgetPath);

      const payload = {
        name: widgetJson.name,
        id: widgetJson.protected.id.id,
        jsonPath: widgetJsonPath,
        widgetPath,
        modified: stats.mtime,
        assetsModified: stats.mtime > assetsModified || assetsModified === 'ignore' ? stats.mtime : assetsModified,
        ignore: assetsModified === 'ignore'
      };

      return payload;
    })
  );
  // Remove ignored widgets. TODO: Improve this so it clear to the user these were ignored.
  const filteredWidgets = localWidgets.filter((widget) => !widget.ignore);
  return filteredWidgets.sort((a, b) => compareDesc(a.assetsModified, b.assetsModified));
};

/**
 * Finds the most recent modification time of the files in the given widget directory.
 * @param {string} widgetPath - The path to the widget directory.
 * @returns {Promise<Date|string|undefined>} - The most recent modification time of the files.
 * If the widgetPath does not exist, returns undefined.
 * If the widget should be ignored, returns the string 'ignore'.
 */
export const findModifiedAgo = async (widgetPath) => {
  // Check if the widgetPath exists
  if (await checkPath(widgetPath)) {
    let recentlyModified;

    // Read all the files in the widgetPath directory
    const widgetFiles = await fs.readdirSync(widgetPath, { recursive: true });

    // Iterate over each file in the widgetPath directory
    for (const widgetAsset of widgetFiles) {
      // If the file is named '.ignore', ignore the widget
      if (widgetAsset === '.ignore') return 'ignore';

      const widgetAssetPath = path.join(widgetPath, widgetAsset);
      const stats = fs.statSync(widgetAssetPath);

      // Compare the modification time of the file with the current recentlyModified value
      if (stats.mtime > recentlyModified || !recentlyModified) {
        recentlyModified = stats.mtime;
      }
    }

    return recentlyModified;
  }
};
