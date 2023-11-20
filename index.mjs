#!/usr/bin/env node
import { Command } from 'commander';
import { prompForToken, promptWidgetId, promptMenu, promptPublishLocalWidgets } from './src/prompt.mjs';
import { refreshToken, validToken } from './src/utils.mjs';
import { fetchAndSaveRemoteWidget, parseWidgetExport, publishLocalWidget } from './src/package.mjs';
import { getToken, getActiveWidget } from './src/session.mjs';
import path from 'path';
import { cosmiconfig } from 'cosmiconfig';

const rootProjectPath = process.cwd();
const explorer = await cosmiconfig('bubo', { sync: true, searchPlaces: ['bubo.config.json'] }).search();

export const localWidgetPath = path.join(rootProjectPath, explorer.config.widgetWorkingDirectory);
export const scratchPath = path.join(rootProjectPath, '.bubo');

export const tbHost = () => {
  return explorer.config.thingsBoardHost.trim().replace(/\/+$/g, '');
};

// Go!
const program = new Command();
program
  .name('vx-bubo')
  .description('Your guide to develop Thingsboard Widgets locally')
  .option('-w, --widget <widiget-id>', 'specify the widget you would like to work with')
  // .option('-b, --bundle', 'Bundle local widget')
  .option('-g, --get', 'GET widget from ThingsBoard')
  .option('-p, --push', 'PUSH local widget ThingsBoard')
  .option('-c, --clean', 'Clean local data such as host, token and widget id');

program.parse();
const options = program.opts();

// No option selected, show main menu
if (Object.keys(options).length === 0) {
  await showMainMenu();
}

if (options.token) {
  await prompForToken();
  await refreshToken();
}

// Check for a token to continue
if (!getToken() || !validToken()) {
  await prompForToken();
  await showMainMenu();
}

if (options.widget) {
  await promptWidgetId();
  // await showMainMenu();
}

if (options.pushMultiple) {
  await promptPublishLocalWidgets();
  // await showMainMenu();
}

let widgetId = await getActiveWidget();

// Get Widget from ThingsBoard
if (options.get) {
  if (!widgetId) {
    widgetId = await promptWidgetId();
  }

  await fetchAndSaveRemoteWidget(widgetId);
  // Parse Widget Export for local development
  await parseWidgetExport(widgetId);
  console.log(`Widget ${widgetId} has been downloaded and ready to develop`);
  // await showMainMenu();
}

// Publish Local Widget?
if (options.push) {
  await publishLocalWidget(widgetId);
  // await showMainMenu();
}

async function showMainMenu () {
  const answer = await promptMenu();
  options[answer] = true;
  console.log(`You have made a wise choice ${answer}`);
}
