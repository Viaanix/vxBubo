import { input, select, confirm, checkbox } from '@inquirer/prompts';
import clipboard from 'clipboardy';
import {
  checkPath,
  findLocalWidgetsWithModifiedAssets,
  getUserRefreshToken, getWidgetLocal,
  validToken
} from './utils.mjs';
import localStorage, { getActiveWidget } from './session.mjs';
import { scratchPath, tbHost } from '../index.mjs';
import chalk from 'chalk';
import { formatDistanceToNow } from 'date-fns';
import path from 'path';
import { fetchAndSaveRemoteWidget, parseWidgetExport, publishLocalWidget } from './package.mjs';

const clearPrevious = { clearPromptOnDone: true };

export const promptMainMenu = async () => {
  const disableToken = await validToken() === false;
  const disableHost = tbHost() === null;

  const answer = await select({
    message: '🦉 What would you like to do?',
    choices: [
      {
        name: 'Set ThingsBoard JWT token',
        value: 'token',
        description: '🎟️ Copy JWT token from ThingsBoard',
        disabled: disableHost
      },
      {
        name: 'Get Widget',
        value: 'get',
        description: '⚡️ Get a widget from ThingsBoard using the widgetId',
        disabled: (disableHost || disableToken)
      },
      {
        name: 'Publish Widget',
        value: 'push',
        description: '🚀 PUSH active widget',
        disabled: (disableHost || disableToken)
      },
      {
        name: 'Publish Multiple Widgets',
        value: 'pushMultiple',
        description: '🚀 PUSH Multiple Widgets',
        disabled: (disableHost || disableToken)
      },
      // {
      //   name: 'bundle',
      //   value: 'bundle',
      //   description: 'Bundle local widget for install'
      // },
      {
        name: 'Clear tokens and active widget id',
        value: 'clean',
        description: '🗑️ Clean local data such as host, token and widget id'
      }
    ]
  }, clearPrevious);
  return answer;
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
    await validToken(token);
    localStorage.setItem('token', token);
    await getUserRefreshToken();
  } catch {
    const message = 'Token is not valid.';
    console.log(message);
    throw new Error(message);
  }
  return promptMainMenu();
};

export const promptGetWidget = async () => {
  let widgetId = await getActiveWidget();
  let promptGetAction;

  if (widgetId) {
    const widgetLocalJsonPath = path.join(scratchPath, 'widgets', `${widgetId}.json`);
    let widgetJson;
    if (await checkPath(widgetLocalJsonPath)) {
      widgetJson = await getWidgetLocal();
    }
    promptGetAction = await confirm({
      name: 'widgetId',
      message: `🦉 Would you like to get widget ${chalk.bold.green(widgetJson.name)} (${widgetJson ? chalk.reset.yellow(widgetId) : ''}) ?`
    }, clearPrevious);
  }
  if (!promptGetAction) {
    const answer = await input({
      name: 'widgetId',
      message: `🦉 What is the widget id you would like to ${chalk.bold.green('get')}?`
    }, clearPrevious);
    if (answer) {
      localStorage.setItem('widgetId', answer.trim());
      widgetId = await getActiveWidget();
    }
  }
  try {
    await fetchAndSaveRemoteWidget(widgetId);

    // Parse Widget Export for local development
    await parseWidgetExport(widgetId);
    console.log(`🦉 Widget ${widgetId} has been downloaded and ready to develop`);
  } catch (error) {
    console.log(`🦉 ${chalk.bold.red(`Unable to download ${widgetId}`)}`);
    console.log(error);
  }
};

export const promptPublishWidget = async () => {
  const widgetId = await getActiveWidget();
  let promptPublishAction;

  if (widgetId) {
    const widgetJson = await getWidgetLocal(path.join(scratchPath, 'widgets', `${widgetId}.json`));
    promptPublishAction = await confirm({
      name: 'publish',
      message: `🦉 Would you like to publish widget ${chalk.bold.green(widgetJson.name)} (${chalk.reset.yellow(widgetId)}) ?`
    }, clearPrevious);
  }
  if (promptPublishAction) {
    await publishLocalWidget(widgetId);
  } else {
    await promptPublishLocalWidgets();
  }
};

export const promptPublishLocalWidgets = async () => {
  const localWidgets = await findLocalWidgetsWithModifiedAssets();

  const widgetChoices = localWidgets.map((widget) => {
    let modifiedAgo;
    if (widget?.assetsModified) {
      modifiedAgo = chalk.italic.dim.yellow(`modified: ${formatDistanceToNow(widget.assetsModified)} ago`);
    }
    return { name: `${widget.name} ${modifiedAgo} `, value: widget };
  });

  const answer = await checkbox({
    message: '🦉 What widgets would you like to publish?',
    choices: widgetChoices
  }, clearPrevious);

  answer.map(async (widget) => {
    return await publishLocalWidget(widget.id);
  });
};
