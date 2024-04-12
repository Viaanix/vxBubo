#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { handlePromptError, prompForToken as promptForToken, promptMainMenu } from './src/prompts/main.mjs';
import { promptCreateWidget, promptPublishLocalWidgets, promptPublishModifiedWidgets, promptWidgetGetInteractive } from './src/widgets/prompts.mjs';
import { checkTokenStatus } from './src/api/auth.mjs';
import { publishLocalWidget, findLocalWidgetsSourceIds } from './src/widgets/base.mjs';
import { promptSetup } from './src/prompts/setup.mjs';
import { devLogging } from './src/logger.mjs';
import { getLocalFile } from './src/utils.mjs';
import { api } from './src/api/api.mjs';
import { goodbye } from './src/prompts/helpers.mjs';
import { promptDashboardGetInteractive, promptDashboardPublishInteractive } from './src/dashboards/prompts.mjs';

export const rootProjectPath = process.cwd();
export let config = null;

const loadConfig = async () => {
  const configRaw = await getLocalFile(path.join(rootProjectPath, 'bubo.config.json'));
  config = JSON.parse(configRaw);
  api.defaults.baseURL = config.thingsBoardHost;

  if (configRaw.debug) {
    devLogging();
  }
};

await loadConfig();

if (!config) {
  const setup = await promptSetup();
  if (setup) {
    console.log('setup =>', setup);
    await loadConfig();
  } else {
    console.log(`${chalk.bold.red('Unable to load configuration file \'bubo.config.json\'. Run vx-bubo --setup to create')}`);
    process.exit(1);
  }
}
export const localDashboardPath = path.join(rootProjectPath, config.dashboardWorkingDirectory) || 'dashboards';
export const localWidgetPath = path.join(rootProjectPath, config.widgetWorkingDirectory) || 'widgets';
export const scratchPath = path.join(rootProjectPath, '.bubo');

export const tbHost = () => {
  return config.thingsBoardHost.trim().replace(/\/+$/g, '');
};

// console.clear();

// Go!
const program = new Command();
program
  .name('vx-bubo')
  .description('Your guide to developing ThingsBoard locally')
  .option('-g, --get', 'Get widget(s)')
  .option('-p, --push', 'Publish local widget(s)')
  .option('-pm, --publish-modified', '⚠️ Publish all modified local widgets ')
  .option('-dw, --deployWidget <path>', 'Deploy Widget from local path')
  .option('-s, --setup', 'Run the vx-bubo setup')

  // .option('-b, --bundle', 'Bundle local widget')
  .option('-fp, --force-publish', 'Publish all modified local widgets to ThingsBoard');
// .option('-c, --clean', 'Clean local data such as host, token and widget id');

program.parse();
const options = program.opts();

// TODO: FIX THIS NIGHTMARE!
if (options.deployWidget) {
  await publishLocalWidget({ widgetPath: options.deployWidget });
  goodbye();
}
/**
 * The `main` function is the entry point of the program. It handles the main flow of the application based on the user's input.
 * @param {string} answer - The user's input from the main menu.
 * @returns {Promise<void>} - A promise that resolves when the main function completes its execution.
 */
export async function main (answer = null) {
  if (answer) {
    options[answer] = true;
  }

  if (!await checkTokenStatus()) {
    try {
      await promptForToken();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (Object.keys(options).length === 0) {
    try {
      await showMainMenu();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.setup) {
    try {
      delete options.setup;
      await promptSetup();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.token) {
    try {
      delete options.token;
      await promptForToken();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.publishModified || options.forcePublish) {
    try {
      delete options.publishModified;
      await promptPublishModifiedWidgets(options?.forcePublish);
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.create) {
    try {
      delete options.create;
      await promptCreateWidget();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.get) {
    try {
      delete options.get;
      await promptWidgetGetInteractive();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.sync) {
    try {
      delete options.sync;
      await findLocalWidgetsSourceIds();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.push) {
    try {
      delete options.push;
      await promptPublishLocalWidgets();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.getDashboard) {
    try {
      delete options.getDashboard;
      await promptDashboardGetInteractive();
    } catch (error) {
      handlePromptError(error);
    }
  }

  if (options.pushDashboard) {
    try {
      delete options.pushDashboard;
      await promptDashboardPublishInteractive();
    } catch (error) {
      handlePromptError(error);
    }
  }

  /**
   * Shows the main menu to the user and returns the user's answer.
   * @returns {Promise<string>} - A promise that resolves with the user's answer.
   */
  async function showMainMenu () {
    try {
      const answer = await promptMainMenu();
      // options[answer] = true;
      return answer;
    } catch (error) {
      handlePromptError(error);
    }
  }
}

await main();
