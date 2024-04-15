import path from 'path';
import fs from 'fs';
import { confirm, input } from '@inquirer/prompts';
import { clearPrevious } from './helpers.mjs';
import { checkPath, createFile, getLocalFile, validatePath } from '../utils.mjs';
import { rootProjectPath } from '../../index.mjs';
import { logger } from './../logger.mjs';

const log = logger.child({ prefix: 'setup' });
/**
 * Prompts the user to create a config file.
 * If the user chooses to create the config file, the function asks for the ThingsBoard URL and the folder/path to download 'widgets' to.
 * It then validates the path, checks if a .gitignore file exists, and if so, asks the user if it can add a specific line to it.
 * Finally, it writes the config file with the provided information.
 * @returns {Promise<boolean>} A boolean value indicating whether the user chose to create a config file or not.
 */
export const promptSetup = async () => {
  const setup = await confirm({
    message: '🦉 Would you like to create a config file? '
  }, clearPrevious);

  if (setup) {
    const thingsBoardUrlAnswer = await input({
      message: '🦉 What is the url to the ThingsBoard install you would like to work with?',
      default: 'https://demo.thingsboard.io/',
      transformer: (input, answer) => {
        return input.trim().replace(/\/$/, '');
      }
    });

    const widgetPathAnswer = await input({
      message: '🦉 What is the folder/path I should download \'widgets\' to from the root of your project?',
      default: 'widgets'
    });

    const widgetFolderPath = path.join(rootProjectPath, widgetPathAnswer);
    await validatePath(widgetFolderPath);

    const gitIgnorePath = path.join(rootProjectPath, '.gitignore');
    if (await checkPath(gitIgnorePath)) {
      const gitIgnoreAnswer = await confirm({
        message: '🦉 I see you have a .gitignore file, can I add the following line `.bubo`?'
      });
      if (gitIgnoreAnswer) {
        const gitIgnoreRaw = await getLocalFile(gitIgnorePath);
        if (gitIgnoreRaw.includes('.bubo')) {
          console.log('.gitignore contains .bubo, no changes made.');
        } else {
          try {
            await fs.appendFileSync(gitIgnorePath, '.bubo');
          } catch (error) {
            log.error('promptSetup =>', error);
            throw new Error(error);
          }
        }
      }
    }

    // Write Config file
    const configPayload = {
      thingsBoardHost: thingsBoardUrlAnswer,
      widgetWorkingDirectory: widgetPathAnswer
    };
    const configPath = path.join(rootProjectPath, 'bubo.config.json');
    await createFile(configPath, configPayload);
  }
  return setup;
};
