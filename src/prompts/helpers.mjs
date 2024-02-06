import { Separator } from '@inquirer/prompts';
import { colorize } from '../utils.mjs';

export const promptSeperator = (heading, style) => {
  let message = `- ${heading || ''} -------`;
  if (style) {
    message = colorize(style, message);
  }
  return new Separator(message);
};

export const clearPrevious = { clearPromptOnDone: true };

export const goodbye = () => {
  console.log('🦉 Goodbye!');
  process.exit(1);
};
