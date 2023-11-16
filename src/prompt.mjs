import { input, select, confirm, checkbox } from '@inquirer/prompts';
import clipboard from 'clipboardy';
import localStorage from './session.mjs';
import { getActiveWidget, getHost, validToken } from './utils.mjs';

export const promptMenu = async () => {
  const disableToken = await validToken() === false;
  const disableHost = getHost() === null;
  const disableWidget = getActiveWidget() === null;

  const answer = await select({
    message: 'What would you like to do?',
    choices: [
      {
        name: 'set host',
        value: 'host',
        description: 'Specify the ThingsBoard URL you wish to work with'
      },
      {
        name: 'set token',
        value: 'token',
        description: 'Copy JWT token from ThingsBoard',
        disabled: disableHost
      },
      {
        name: 'set widget id',
        value: 'widget',
        description: 'specify the widget you would like to work with',
        disabled: (disableHost || disableToken)
      },
      {
        name: 'clean',
        value: 'clean',
        description: 'Clean local data such as host, token and widget id'
      },
      {
        name: 'get',
        value: 'get',
        description: 'GET Widget from ThingsBoard',
        disabled: (disableHost || disableToken || disableWidget)
      },
      {
        name: 'push',
        value: 'push',
        description: 'PUSH active widget',
        disabled: (disableHost || disableToken || disableWidget)
      },
      {
        name: 'push multiple',
        value: 'pushMultiple',
        description: 'PUSH Multiple Widgets',
        disabled: (disableHost || disableToken)
      }
      // {
      //   name: 'bundle',
      //   value: 'bundle',
      //   description: 'Bundle local widget for install'
      // },
    ]
  });

  return answer;
};

export const prompForHost = async () => {
  const answer = await input({
    message: 'What is the url for the ThingsBoard instance you would like to work with?'
  });

  const urlClean = answer.trim().replace(/\/+$/g, '');

  // TODO: Test URL
  try {
    new URL(urlClean);
    localStorage.setItem('host', urlClean);
    return localStorage.getItem('host');
  } catch {
    const message = `ThingsBoard host ${urlClean} is not valid.`;
    console.log(message);
    throw new Error(message);
  }
};

export const prompForToken = async () => {
  await confirm({
    message: `Login to ThingsBoard click => ${getHost()}/security then press "Copy JWT token". Finished?`
  });

  const clip = clipboard.readSync();
  try {
    await validToken(clip);
    localStorage.setItem('token', clip);
    return localStorage.getItem('token');
  } catch {
    const message = 'Token is not valid.';
    console.log(message);
    throw new Error(message);
  }
};

export const promptWidgetId = async () => {
  const answer = await input({
    name: 'widgetId',
    message: 'What is the widget bundle id you would like to work on?'
  });
  if (answer) {
    localStorage.setItem('widgetId', answer);
  }
  return localStorage.getItem('widgetId');
};

export const promptPublishLocalWidgets = async () => {
  // TODO: Get a list of all local widgets
  const choices = [
    { name: 'npm', value: 'npm' }
  ];

  const answer = await checkbox({
    message: 'What widgets would you like to publish?',
    choices
  });

  // TODO: Handle publishing all selected widgets
  console.log('promptPublishLocalWidgets=>', answer);
};
