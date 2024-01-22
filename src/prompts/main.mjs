import { logger } from '../logger.mjs';
import { checkTokenStatus, getUserRefreshToken } from '../api/auth.mjs';
import { tbHost } from '../../index.mjs';
import { confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import clipboard from 'clipboardy';
import { setUserAuthToken } from '../session.mjs';

export const clearPrevious = { clearPromptOnDone: true };
export const goodbye = () => {
  console.log('🦉 Goodbye!');
  process.exit(1);
};

export const handlePromptError = (error) => {
  if (!error.message.includes('User force closed the prompt')) {
    logger.error(error);
  }
};

export const promptMainMenu = async () => {
  const disableToken = await checkTokenStatus() === false;
  const disableHost = tbHost() === null;

  const mainMenuAnswer = await select({
    message: '🦉 What would you like to do?',
    pageSize: 12,
    loop: false,
    choices: [
      {
        name: disableToken ? `${chalk.bold.red('Set ThingsBoard JWT token')}` : 'Set ThingsBoard JWT token',
        value: 'token',
        description: '🎟️ Copy JWT token from ThingsBoard',
        disabled: disableHost
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
        name: 'Sync Widget Sources',
        value: 'sync',
        description: '♻️ Download widget data for local widgets',
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
    ]
  }, clearPrevious);
  return mainMenuAnswer;
};

export const prompForToken = async () => {
  await confirm({
    message: `🦉 Let's get your Thingsboard Auth Token.
    ${chalk.reset('1) Login to ThingsBoard')}
    ${chalk.reset(`2) Open this URL => ${tbHost()}/security `)}
    ${chalk.reset(`3) Press the button ${chalk.bold.green('"Copy JWT token"')} ${chalk.reset('to copy the token to your clipboard')}`)}
        
    Finished?`
  }, clearPrevious);

  const clip = clipboard.readSync();
  try {
    const token = clip.startsWith('Bearer') ? clip : `Bearer ${clip}`;
    await checkTokenStatus(token);
    setUserAuthToken(token);
    await getUserRefreshToken();
  } catch (error) {
    // const message = 'Token is not valid.';
    console.log(error);
    // throw new Error(message);
  }
  return promptMainMenu();
};
