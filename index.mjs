#!/usr/bin/env node
import { Command } from 'commander';

// import { validToken } from './src/utils.mjs';
import path from 'path';
import { cosmiconfig } from 'cosmiconfig';
import {
  prompForToken,
  promptGetWidget,
  promptMainMenu,
  promptPublishLocalWidgets,
  promptPublishModifiedWidgets
} from './src/prompt.mjs';
import { checkTokenStatus, testAndRefreshToken } from './src/api/auth.mjs';

const explorer = await cosmiconfig('bubo', { sync: true, searchPlaces: ['bubo.config.json'] }).search();
export const tbHost = () => {
  return explorer.config.thingsBoardHost.trim().replace(/\/+$/g, '');
};
const rootProjectPath = process.cwd();

export const localWidgetPath = path.join(rootProjectPath, explorer.config.widgetWorkingDirectory);
export const scratchPath = path.join(rootProjectPath, '.bubo');

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

// if (getToken() && await !validToken()) {
//   await refreshToken();
// }
// await testAndRefreshToken();

// console.log(`!!! Checked token`)

// No option selected, lets show main menu
if (Object.keys(options).length === 0) {
  await showMainMenu();
}

// if (options.token) {
//   await prompForToken();
// }

// Check for a token to continue
// if (!await checkTokenStatus()) {
//   await prompForToken();
// }

if (options.publishModified) {
  await promptPublishModifiedWidgets();
}

// Get Widget from ThingsBoard
if (options.get) {
  await promptGetWidget();
}

// Publish Local Widget?
if (options.push) {
  await promptPublishLocalWidgets();
}

async function showMainMenu () {
  console.log('showMainMenu');

  const answer = await promptMainMenu();
  options[answer] = true;
}
