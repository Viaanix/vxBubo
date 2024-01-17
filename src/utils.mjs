import path from 'path';
import fs from 'fs';
import { scratchPath, localWidgetPath } from '../index.mjs';
import { logger } from './logger.mjs';

const log = logger.child({ prefix: 'utils' });

export const formatJson = (data) => {
  return JSON.stringify(data, null, 2);
};

// =============================
// Filesystem Utils
// =============================

export const checkPath = async (dir) => {
  return fs.existsSync(dir);
};

// TODO: Update name
export const validatePath = async (dirname) => {
  if (!await checkPath(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
    log.error(`Cannot find ${dirname}, creating it.`);
  }
};

export const createFile = async (filePath, data) => {
  // If object is passed convert to JSON for writing.
  if (data instanceof Object) {
    data = formatJson(data);
  }
  // Validate path before creating a file
  await validatePath(path.dirname(filePath));
  try {
    fs.writeFileSync(filePath, data);
  } catch (error) {
    log.error(error);
    throw new Error(error);
  }
};

export const getLocalFile = async (filePath) => {
  let fileRaw;
  try {
    fileRaw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log.error(error);
    throw new Error(error);
  }
  return fileRaw;
};

export const getWidgetLocal = async (widgetPath) => {
  const widgetJsonRaw = await getLocalFile(widgetPath);
  return JSON.parse(widgetJsonRaw);
};

export const discoverLocalWidgetJsons = async () => {
  const widgetJsonDir = path.join(scratchPath, 'widgets');
  const localWidgets = [];

  await Promise.all(
    fs.readdirSync(widgetJsonDir).map(async (file) => {
      if (!file.includes('bak')) {
        const fileExt = path.extname(file);
        const widgetJsonPath = path.join(widgetJsonDir, file);

        if (fileExt === '.json') {
          const widgetJson = await getWidgetLocal(widgetJsonPath);
          const widgetPath = path.join(localWidgetPath, widgetJson.bundleAlias, widgetJson.name);
          const stats = fs.statSync(widgetJsonPath);
          const payload = {
            name: widgetJson.name,
            id: file.split('.')[0],
            jsonPath: widgetJsonPath,
            widgetPath,
            modified: stats.mtime
          };
          localWidgets.push(payload);
        }
      }
    })
  );
  return localWidgets;
};

export const findLocalWidgetsWithModifiedAssets = async () => {
  const localWidgets = await discoverLocalWidgetJsons();

  return await Promise.all(
    localWidgets.map(async (widget) => {
      if (await checkPath(widget.widgetPath)) {
        const widgetFiles = await fs.readdirSync(widget.widgetPath, { recursive: true });
        for (const widgetAsset of widgetFiles) {
          const widgetAssetPath = path.join(widget.widgetPath, widgetAsset);
          const stats = fs.statSync(widgetAssetPath);
          if (stats.mtime > widget.modified) {
            if (stats.mtime > widget.assetsModified || !widget.assetsModified) widget.assetsModified = stats.mtime;
          }
        }
      }
      return widget;
    })
  );
};

/**
 * Performs a deep merge of an array of objects
 * @author inspired by [jhildenbiddle](https://stackoverflow.com/a/48218209).
 */
export function mergeDeep (...objects) {
  // console.log('objects =>', objects);
  const isObject = (obj) => obj && typeof obj === 'object' && !(obj instanceof Array);
  const objectTest = objects.filter((obj) => isObject(obj));
  // console.log('objectTest =>', objectTest);

  if (objectTest.length !== objects.length) {
    throw new Error('Can only merge objects');
  }
  const target = {};

  objects.forEach(source => {
    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];
      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        target[key] = targetValue.concat(sourceValue);
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
      } else {
        target[key] = sourceValue;
      }
    });
  });
  return target;
}
