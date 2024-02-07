import { Separator } from '@inquirer/prompts';
import { buboOutput, colorize } from '../utils.mjs';

export const promptSeperator = (heading, style) => {
  let message = `- ${heading || ''} -------`;
  if (style) {
    message = colorize(style, message);
  }
  return new Separator(message);
};

export const clearPrevious = { clearPromptOnDone: true };

export const goodbye = () => {
  console.log(buboOutput('bubo', 'success', 'Goodbye!'));
  process.exit(1);
};
