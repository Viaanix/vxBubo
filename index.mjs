#!/usr/bin/env node
import { Command } from 'commander';
import {
  prompForToken,
  promptMainMenu,
  promptPublishLocalWidgets,
  promptGetWidget,
  promptPublishWidget
} from './src/prompt.mjs';
import { refreshToken, validToken } from './src/utils.mjs';
import { getToken } from './src/session.mjs';
import path from 'path';
import { cosmiconfig } from 'cosmiconfig';

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
  .option('-p, --push', 'Publish local widget ThingsBoard')
  .option('-pm, --push-multiple', 'Publish Multiple local widgets to ThingsBoard')
  .option('-c, --clean', 'Clean local data such as host, token and widget id');

program.parse();

const options = program.opts();

// Show Menu!
if (getToken() && await !validToken()) {
  await refreshToken();
}

// No option selected, lets show main menu
if (Object.keys(options).length === 0) {
  await showMainMenu();
}

if (options.token) {
  await prompForToken();
}

// Check for a token to continue
if (!getToken() || !validToken()) {
  await prompForToken();
}

if (options.pushMultiple) {
  await promptPublishLocalWidgets();
}

// Get Widget from ThingsBoard
if (options.get) {
  await promptGetWidget();
}

// Publish Local Widget?
if (options.push) {
  await promptPublishWidget();
}

async function showMainMenu () {
  const answer = await promptMainMenu();
  options[answer] = true;
}
