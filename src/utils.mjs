import path from 'path';
import fs from 'fs';
// import { scratchPath, localWidgetPath } from '../index.mjs';
import { logger } from './logger.mjs';
import chalk from 'chalk';
// import { getWidgetTenant } from './api/widget.mjs';

const log = logger.child({ prefix: 'utils' });

export const formatJson = (data) => {
  return JSON.stringify(data, null, 2);
};

export const colorize = (style, message) => {
  const styles = {
    error: chalk.bold.red,
    warning: chalk.bold.yellow, // Orange color
    success: chalk.bold.green,
    info: chalk.bold.blue
  };

  return styles[style](message);
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
    log.error('createFile => ', error);
    throw new Error(error);
  }
};

export const getLocalFile = async (filePath) => {
  let fileRaw;
  try {
    fileRaw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log.error('getLocalFile =>', error);
    throw new Error(error);
  }
  return fileRaw;
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
