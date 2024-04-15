import { logger } from '../logger.mjs';
import { checkTokenStatus, getUserRefreshToken } from '../api/auth.mjs';
import { tbHost, main } from '../../index.mjs';
import { confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import clipboard from 'clipboardy';
import { setUserAuthToken } from '../session.mjs';
import { clearPrevious } from './helpers.mjs';

/**
 * Handles prompt errors.
 * @param {Error} error - The error object that occurred.
 */
export const handlePromptError = (error) => {
  if (!error.message.includes('User force closed the prompt')) {
    logger.error('handlePromptError', error);
    console.error('!!! ERROR =>', error);
  }
};

/**
 * Displays a menu of options for the user to choose from.
 * The function checks the token status and the ThingsBoard host to determine which options should be enabled or disabled.
 * The user can select options such as setting the ThingsBoard JWT token, creating a widget, getting widgets, syncing widget sources, publishing widgets, and more.
 * @returns {Promise<string>} The selected option from the menu.
 */
export const promptMainMenu = async () => {
  // Check token status and ThingsBoard host
  const disableToken = await checkTokenStatus() === false;
  const disableHost = tbHost() === null;

  // Define menu choices
  const choices = [
    {
      name: disableToken ? `${chalk.bold.red('Set ThingsBoard JWT token')}` : 'Set ThingsBoard JWT token',
      value: 'token',
      description: '🎟️ Set ThingsBoard JWT tokend',
      disabled: disableHost
    },
    {
      name: 'Get Dashboard',
      value: 'getDashboard',
      description: 'Download a dashboard from ThingsBoard',
      disabled: (disableHost || disableToken)
    },
    {
      name: 'Publish Dashboard',
      value: 'pushDashboard',
      description: 'Publish a dashboard to ThingsBoard',
      disabled: (disableHost || disableToken)
    },
    {
      name: 'Create Widget',
      value: 'create',
      description: 'Create a new widget in a Widget bundle',
      disabled: (disableHost || disableToken)
    },
    {
      name: 'Get Widget(s)',
      value: 'get',
      description: `🕹️ ${chalk.bold.green('GET')} widget(s) using the interactive prompt`,
      disabled: (disableHost || disableToken)
    },
    {
      name: 'Publish Widgets',
      value: 'push',
      description: '🚀 Publish Widgets to ThingsBoard',
      disabled: (disableHost || disableToken)
    },
    {
      name: 'Publish ALL Modified Widgets',
      value: 'publishModified',
      description: '🤖 Publish all modified widgets',
      disabled: (disableHost || disableToken)
    },
    {
      name: 'Sync Widget Sources',
      value: 'sync',
      description: '♻️ Download widget data for local widgets',
      disabled: (disableHost || disableToken)
    },
    {
      name: 'Bundle Local Widget',
      value: 'bundle',
      description: 'Bundle local widget for install',
      disabled: true
    },
    {
      name: 'Data Converters',
      value: 'dataconverters',
      description: '',
      disabled: true
    },
    {
      name: 'Rule Chain',
      value: 'rulechain',
      description: '',
      disabled: true
    },
    {
      name: 'Dashboard',
      value: 'dashboard',
      description: '',
      disabled: true
    },
    {
      name: 'Clear tokens and active widget id',
      value: 'clean',
      description: '🗑️ Clean local data such as host, token and widget id',
      disabled: true
    }
  ];

  // Display menu and get user selection
  const mainMenuAnswer = await select({
    message: '🦉 What would you like to do?',
    choices,
    loop: false
  }, clearPrevious);

  // Return selected option
  return await main(mainMenuAnswer);
};

/**
 * Prompts the user to enter their Thingsboard Auth Token by displaying a message with instructions.
 * It then checks the validity of the token, sets it as the user's authentication token, and retrieves the user's refresh token.
 */
export const prompForToken = async () => {
  try {
    // Display instructions to obtain the Thingsboard Auth Token
    await confirm({
      message: `🦉 Let's get your Thingsboard Auth Token.
      ${chalk.reset('1) Login to ThingsBoard')}
      ${chalk.reset(`2) Open this URL => ${tbHost()}/security `)}
      ${chalk.reset(`3) Press the button ${chalk.bold.green('"Copy JWT token"')} ${chalk.reset('to copy the token to your clipboard')}`)}
          
      Finished?`
    }, clearPrevious);

    // Read the token from the clipboard
    const clip = clipboard.readSync();
    const token = clip.startsWith('Bearer') ? clip : `Bearer ${clip}`;

    // Check the validity of the token
    await checkTokenStatus(token);

    // Set the token as the user's authentication token
    setUserAuthToken(token);

    // Retrieve the user's refresh token
    await getUserRefreshToken();
  } catch (error) {
    // Handle any errors that occur during the process
    logger.error('prompForToken Error', error);
    console.error('prompForToken Error =>', error);
  }

  // Return to the main function
  return await main();
};
