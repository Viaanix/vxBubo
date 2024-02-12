import path from 'path';
import fs from 'fs';
import { logger } from './logger.mjs';
import chalk from 'chalk';
// import { getWidgetTenant } from './api/widget.mjs';

const log = logger.child({ prefix: 'utils' });

export const formatJson = (data) => {
  return JSON.stringify(data, null, 2);
};

/**
 * Applies a specified style to a given message.
 * @param {string} style - The style to apply to the message. Can be one of: 'error', 'warning', 'success', or 'info'.
 * @param {string} message - The message to be styled.
 * @returns {string} - The styled message with the specified style applied.
 */
export const colorize = (style, message) => {
  const styles = {
    error: chalk.bold.red,
    warning: chalk.bold.yellow,
    success: chalk.bold.green,
    info: chalk.bold.blue
  };

  const styleFunction = styles[style];
  return styleFunction(message);
};

/**
 * Returns a colored and formatted message based on the provided parameters.
 * @param {string} emoji - An optional parameter representing an emoji to be added to the message.
 * @param {string} style - A required parameter representing the style of the message. It can be one of the following: 'error', 'warning', 'success', or 'info'.
 * @param {string} message - A required parameter representing the main content of the message.
 * @returns {string} - A colored and formatted message based on the provided style and message parameters.
 */
export const buboOutput = (emoji = 'bubo', style, message) => {
  const emojiMap = {
    bubo: '🦉',
    robot: '🤖',
    warning: '⚠️',
    rocket: '🚀',
    error: '❌',
    success: '✅',
    info: 'ℹ️'
  };

  const newMessage = `${emojiMap[emoji] || emojiMap.bubo} ${message}`;
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
export const validatePath = async (directoryPath) => {
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
 * @param {...Object} objects - An array of objects to be merged
 * @returns {Object} - A new object that is a deep merge of all the input objects
 */
export function mergeDeep (...objects) {
  const isObject = (obj) => obj && typeof obj === 'object' && !(obj instanceof Array);
  const filteredObjects = objects.filter(isObject);

  if (filteredObjects.length !== objects.length) {
    throw new Error('Can only merge objects');
  }

  const target = {};

  objects.forEach(source => {
    for (const key in source) {
      const targetValue = target[key];
      const sourceValue = source[key];
      const isTargetArray = Array.isArray(targetValue);
      const isSourceArray = Array.isArray(sourceValue);

      if (isTargetArray && isSourceArray) {
        target[key] = targetValue.concat(sourceValue);
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        target[key] = mergeDeep({ ...targetValue }, sourceValue);
      } else {
        Object.assign(target, { [key]: sourceValue });
      }
    }
  });

  return target;
}
