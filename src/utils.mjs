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

export const buboOutput = (emoji, style, message) => {
  const emojiMap = {
    bubo: '🦉',
    robot: '🤖',
    warning: '⚠️',
    rocket: '🚀',
    error: '❌',
    success: '✅',
    info: 'ℹ️'
  };

  const newMessage = emoji ? `${emojiMap[emoji] || emojiMap.bubo} ${message}` : message;
  return colorize(style, newMessage);
};

// =============================
// Filesystem Utils
// =============================

/**
 * Checks if a directory exists at the specified path.
 * @param {string} dir - The path of the directory to be checked.
 * @returns {Promise<boolean>} - Returns true if the directory exists, false otherwise.
 */
export const checkPath = async (dir) => {
  return fs.existsSync(dir);
};

/**
 * Creates a file at the specified path and writes data to it.
 * If the data parameter is an object, it is converted to JSON format.
 * The function also validates the path before creating the file.
 * @param {string} filePath - The path where the file should be created.
 * @param {*} data - The data to be written to the file.
 * @throws {Error} - If an error occurs during the file creation process.
 */
export const createFile = async (filePath, data) => {
  if (typeof data === 'object') {
    data = JSON.stringify(data);
  }

  const directoryPath = path.dirname(filePath);
  await validatePath(directoryPath);

  try {
    fs.writeFileSync(filePath, data);
  } catch (error) {
    console.error('createFile => ', error);
    throw new Error(error);
  }
};

/**
 * Validates the path and creates the directory if it doesn't exist.
 * @param {string} directoryPath - The path of the directory to validate.
 */
const validatePath = async (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

/**
 * Reads the contents of a file specified by the filePath parameter.
 * If the file is not found or there is an error reading it, an error is logged and an exception is thrown.
 * @param {string} filePath - The path to the file to be read.
 * @returns {Promise<string>} - The contents of the file specified by filePath.
 */
export const getLocalFile = async (filePath) => {
  const childLogger = logger.child({ prefix: 'utils' });

  try {
    const fileRaw = fs.readFileSync(filePath, 'utf8');
    return fileRaw;
  } catch (error) {
    childLogger.error('getLocalFile =>', error);
    throw new Error(error);
  }
};

/**
 * Performs a deep merge of an array of objects
 * @author inspired by [jhildenbiddle](https://stackoverflow.com/a/48218209).
 /**
  * This code snippet defines a function called `mergeDeep` that performs a deep merge of an array of objects.
  */
export function mergeDeep (...objects) {
  const isObject = (obj) => obj && typeof obj === 'object' && !(obj instanceof Array);
  const filteredObjects = objects.filter(isObject);

  if (filteredObjects.length !== objects.length) {
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
        target[key] = mergeDeep({ ...targetValue }, sourceValue);
      } else {
        target[key] = sourceValue;
      }
    });
  });

  return target;
}
