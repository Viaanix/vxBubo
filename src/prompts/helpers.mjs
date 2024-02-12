import { Separator } from '@inquirer/prompts';
import { buboOutput, colorize } from '../utils.mjs';

/**
 * Creates a separator object that can be used in prompts.
 * @param {string} heading - The heading for the separator.
 * @param {string} style - The style to be applied to the separator.
 * @returns {object} - A Separator object with the specified heading and style.
 */
export const promptSeparator = (heading = '', style = '') => {
  let message = `- ${heading} -------`;
  if (style) {
    message = colorize(style, message);
  }
  return new Separator(message);
};

export const clearPrevious = { clearPromptOnDone: true };

/**
 * Logs a success message and exits the process.
 */
export const goodbye = () => {
  const message = buboOutput('bubo', 'success', 'Goodbye!');
  console.log(message);
  process.exit(1);
};
