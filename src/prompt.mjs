import path from 'path';
import { input, select, confirm, checkbox } from '@inquirer/prompts';
import clipboard from 'clipboardy';
import chalk from 'chalk';
import { formatDistanceToNow } from 'date-fns';
import { scratchPath, tbHost } from '../index.mjs';
import { checkPath, findLocalWidgetsWithModifiedAssets, getWidgetLocal } from './utils.mjs';
import { getActiveWidget, setUserAuthToken, setWidgetId } from './session.mjs';
import { fetchAndSaveRemoteWidget, parseWidgetExport, publishLocalWidget } from './widget.mjs';
import { checkTokenStatus, getUserRefreshToken } from './api/auth.mjs';

const clearPrevious = { clearPromptOnDone: true };

export const goodbye = () => {
  console.log('🦉 Goodbye!');
  process.exit(1);
};

export const promptMainMenu = async () => {
  const disableToken = await checkTokenStatus() === false;
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
        name: 'Get Widget Bundles',
        value: 'getBundles',
        description: '⚡️ Get a widget from ThingsBoard using the widgetId',
        disabled: (disableHost || disableToken)
      },
      {
        name: 'Get Widget Sources',
        value: 'getWidgetSources',
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
        name: 'Publish Modified Widgets',
        value: 'publishModified',
        description: '🤖🚀 Publish all modified widgets',
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

export const promptGetWidget = async () => {
  let widgetId = await getActiveWidget();
  let promptGetAction;

  if (widgetId) {
    const widgetLocalJsonPath = path.join(scratchPath, 'widgets', `${widgetId}.json`);
    let widgetJson;
    let messageChunk = `id: ${widgetId} ${chalk.red('unable to locate local json.')}`;
    if (await checkPath(widgetLocalJsonPath)) {
      widgetJson = await getWidgetLocal(widgetLocalJsonPath);
      messageChunk = `${chalk.bold.green(widgetJson.name)} (${chalk.reset.yellow(widgetId)})`;
    }
    promptGetAction = await confirm({
      name: 'widgetId',
      message: `🦉 Would you like to get widget  ${messageChunk}?`
    }, clearPrevious);
  }
  if (!promptGetAction) {
    const answer = await input({
      name: 'widgetId',
      message: `🦉 What is the widget id you would like to ${chalk.bold.green('get')}?`
    }, clearPrevious);
    if (answer) {
      setWidgetId(answer.trim());
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
  goodbye();
};

export const promptPublishModifiedWidgets = async () => {
  const localWidgets = await findLocalWidgetsWithModifiedAssets();

  const modifiedWidgets = localWidgets.filter((widget) => widget?.assetsModified);
  if (modifiedWidgets) {
    await Promise.all(
      modifiedWidgets.map(async (widget) => {
        return await publishLocalWidget(widget.id);
      })
    );
  } else {
    console.log(chalk.yellowBright('🦉 No changes to widgets found.'));
  }
  goodbye();
};

export const promptPublishLocalWidgets = async () => {
  const widgetChoices = await getLocalWidgetChoices();

  const answer = await checkbox({
    message: '🦉 What widgets would you like to publish?',
    choices: widgetChoices
  }, clearPrevious);

  await Promise.all(
    answer.map(async (widget) => {
      return await publishLocalWidget(widget.id);
    })
  );
  goodbye();
};

// Helpers
const getLocalWidgetChoices = async () => {
  const localWidgets = await findLocalWidgetsWithModifiedAssets();
  return localWidgets.map((widget) => {
    let modifiedAgo = '';
    if (widget?.assetsModified) {
      modifiedAgo = chalk.italic.dim.yellow(`modified: ${formatDistanceToNow(widget.assetsModified)} ago`);
    }
    return { name: `${widget.name} ${modifiedAgo} `, value: widget };
  });
};
