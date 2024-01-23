#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import { handlePromptError, prompForToken, promptMainMenu } from './src/prompts/main.mjs';
import { promptCreateWidget, promptPublishLocalWidgets, promptPublishModifiedWidgets, promptWidgetGetInteractive } from './src/prompts/widgets.mjs';
import { checkTokenStatus } from './src/api/auth.mjs';
import { findLocalWidgetsSourceIds } from './src/widget.mjs';
import { promptSetup } from './src/prompts/setup.mjs';
import { devLogging } from './src/logger.mjs';
import { getLocalFile } from './src/utils.mjs';

export const rootProjectPath = process.cwd();
export let config = null;

const loadConfig = async () => {
  const configRaw = await getLocalFile(path.join(rootProjectPath, 'bubo.config.json'));
  config = JSON.parse(configRaw);
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
  .option('-s, --setup', 'Run the vx-bubo setup');
// .option('-b, --bundle', 'Bundle local widget')
// .option('-pm, --publish-modified', 'Publish all modified local widgets to ThingsBoard')
// .option('-c, --clean', 'Clean local data such as host, token and widget id');

program.parse();

const options = program.opts();

// TODO: FIX THIS NIGHTMARE!

// No option selected, lets show main menu
if (Object.keys(options).length === 0) {
  try {
    await showMainMenu();
  } catch (error) {
    handlePromptError(error);
  }
}

if (options.setup) {
  try {
    await promptSetup();
  } catch (error) {
    handlePromptError(error);
  }
}

if (options.token) {
  try {
    await prompForToken();
  } catch (error) {
    handlePromptError(error);
  }
}

// Check for a token to continue
if (!checkTokenStatus()) {
  try {
    await prompForToken();
  } catch (error) {
    handlePromptError(error);
  }
}

if (options.publishModified) {
  try {
    await promptPublishModifiedWidgets();
  } catch (error) {
    handlePromptError(error);
  }
}

if (options.create) {
  try {
    await promptCreateWidget();
  } catch (error) {
    handlePromptError(error);
  }
}

// Get Widget from ThingsBoard
if (options.get) {
  try {
    await promptWidgetGetInteractive();
  } catch (error) {
    handlePromptError(error);
  }
}

if (options.sync) {
  try {
    await findLocalWidgetsSourceIds();
  } catch (error) {
    handlePromptError(error);
  }
}

// Publish Local Widget?
if (options.push) {
  try {
    await promptPublishLocalWidgets();
  } catch (error) {
    handlePromptError(error);
  }
}

async function showMainMenu () {
  try {
    const answer = await promptMainMenu();
    options[answer] = true;
  } catch (error) {
    handlePromptError(error);
  }
}
