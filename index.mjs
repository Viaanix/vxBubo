#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { handlePromptError, prompForToken, promptMainMenu } from './src/prompts/main.mjs';
import { promptCreateWidget, promptPublishLocalWidgets, promptPublishModifiedWidgets, promptWidgetGetInteractive } from './src/widgets/prompts.mjs';
import { checkTokenStatus } from './src/api/auth.mjs';
import { bundleLocalWidget, findLocalWidgetsSourceIds } from './src/widgets/base.mjs';
import { promptSetup } from './src/prompts/setup.mjs';
import { devLogging } from './src/logger.mjs';
import { getLocalFile } from './src/utils.mjs';
import { api } from './src/api/api.mjs';
import { goodbye } from './src/prompts/helpers.mjs';
// import { discoverLocalWidgets } from './src/widgets/helper.mjs';

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

export const localWidgetPath = path.join(rootProjectPath, config.widgetWorkingDirectory);
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
  .option('-p, --push', 'Publish local widgets to ThingsBoard')
  .option('-s, --setup', 'Run the vx-bubo setup')
// .option('-b, --bundle', 'Bundle local widget')
  .option('-fp, --force-publish', 'Publish all modified local widgets to ThingsBoard');
// .option('-c, --clean', 'Clean local data such as host, token and widget id');

program.parse();
const options = program.opts();

// TODO: FIX THIS NIGHTMARE!
if (options.deployWidget) {
  await bundleLocalWidget({ widgetPath: options.deployWidget });
  goodbye();
}
// No option selected, lets show main menu
export async function main (answer = null) {
  if (answer) { options[answer] = true; }
  // console.log(`MainFunction => answer: ${answer}`, options, Object.keys(options).length);

  // Check for a token to continue
  if (!await checkTokenStatus()) {
    try {
      await prompForToken();
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
      await prompForToken();
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

  // Get Widget from ThingsBoard
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

  // Publish Local Widget?
  if (options.push) {
    try {
      delete options.push;
      await promptPublishLocalWidgets();
    } catch (error) {
      handlePromptError(error);
    }
  }

  async function showMainMenu () {
    try {
      // const answer =
      await promptMainMenu();
      // options[answer] = true;
      return answer;
    } catch (error) {
      handlePromptError(error);
    }
  }
}

await main();
//
// const yolo = await discoverLocalWidgets();
// console.log('yolo =>', yolo);
