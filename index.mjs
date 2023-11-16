#!/usr/bin/env node

import { Command } from 'commander';
import { prompForToken, promptWidgetId, promptMenu, prompForHost, promptPublishLocalWidgets } from './src/prompt';
import { getActiveWidget, getToken, validToken } from './src/utils';
import { fetchAndSaveRemoteWidget, parseWidgetExport, publishLocalWidget } from './src/package';

const program = new Command();
program
  .name('vx-bubo')
  .description('Your guide to develop Thingsboard Widgets locally')
  .option('-h, --host <url>', 'ThingsBoard URL you wish to connect to if you opt to not set an env variable')
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

if (options.host) {
  await prompForHost();
  await showMainMenu();
}

if (options.token) {
  await prompForToken();
  await showMainMenu();
}

// Check for a token to continue
if (!getToken() || !validToken()) {
  await prompForToken();
  await showMainMenu();
}

if (options.widget) {
  await promptWidgetId();
  await showMainMenu();
}

if (options.pushMultiple) {
  await promptPublishLocalWidgets();
  await showMainMenu();
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
  await showMainMenu();
}

// Publish Local Widget?
if (options.push) {
  await publishLocalWidget(widgetId);
  await showMainMenu();
}

async function showMainMenu () {
  const answer = await promptMenu();
  options[answer] = true;
  console.log(`You have made a wise choice ${answer}`);
}