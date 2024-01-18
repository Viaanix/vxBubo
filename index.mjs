#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import { cosmiconfig } from 'cosmiconfig';
import {
  handlePromptError,
  prompForToken, promptCreateWidget,
  promptMainMenu,
  promptPublishLocalWidgets,
  promptPublishModifiedWidgets,
  promptWidgetGetInteractive
} from './src/prompt.mjs';
import { checkTokenStatus } from './src/api/auth.mjs';
import { findLocalWidgetsSourceIds } from './src/widget.mjs';

const rootProjectPath = process.cwd();
const explorer = await cosmiconfig('bubo', { sync: true, searchPlaces: ['bubo.config.json'] }).search();

export const localWidgetPath = path.join(rootProjectPath, explorer.config.widgetWorkingDirectory);
export const scratchPath = path.join(rootProjectPath, '.bubo');

export const tbHost = () => {
  return explorer.config.thingsBoardHost.trim().replace(/\/+$/g, '');
};

console.clear();

// Go!
const program = new Command();

program
  .name('vx-bubo')
  .description('Your guide to develop Thingsboard Widgets locally')
  // .option('-b, --bundle', 'Bundle local widget')
  .option('-g, --get', 'Get widget from ThingsBoard')
  .option('-p, --push', 'Publish local widgets to ThingsBoard')
  .option('-pm, --publish-modified', 'Publish all modified local widgets to ThingsBoard')
  .option('-c, --clean', 'Clean local data such as host, token and widget id');

program.parse();

const options = program.opts();

// No option selected, lets show main menu
if (Object.keys(options).length === 0) {
  try {
    await showMainMenu();
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

if (options.getWidgetSources) {
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
