import path from 'path';
import { input, select, confirm, checkbox } from '@inquirer/prompts';
import clipboard from 'clipboardy';
import chalk from 'chalk';
import { formatDistanceToNow } from 'date-fns';
import { scratchPath, tbHost } from '../index.mjs';
import { checkPath, findLocalWidgetsWithModifiedAssets, getWidgetLocal } from './utils.mjs';
import { getActiveWidget, setUserAuthToken, setWidgetId } from './session.mjs';
import {
  fetchAndParseRemoteWidget,
  fetchAndSaveRemoteWidget,
  parseWidgetExport,
  publishLocalWidget
} from './widget.mjs';
import { checkTokenStatus, getParsedToken, getUserRefreshToken } from './api/auth.mjs';
import { getAllWidgetBundles, getAllWidgetByBundleAlias } from './api/widget.mjs';

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
        name: 'Get Widget Interactive',
        value: 'getInteractive',
        description: '⚡️ Get widget(s) using the interactive prompt',
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

export const promptWidgetGetInteractive = async () => {
  const promptGetAction = await select({
    message: '🦉 How would you like to GET a widget?',
    choices: [
      {
        name: 'Last Widget',
        value: 'last',
        description: 'Use the widgetId of the previous GET'
      },
      {
        name: 'By widgetId',
        value: 'widgetId',
        description: 'Enter a new widgetId to GET'
      },
      {
        name: 'From Bundle',
        value: 'bundle',
        description: 'Browse and select a widget(s) from a Widget Bundle'
      }
    ]
  }, clearPrevious);

  if (promptGetAction === 'bundle') {
    const parsedToken = getParsedToken();

    const widgetBundles = await getAllWidgetBundles();
    const bundleChoices = widgetBundles.data.map(bundle => {
      return {
        name: bundle.title,
        value: { bundleAlias: bundle.alias, isSystem: parsedToken.tenantId !== bundle.tenantId.id },
        description: bundle.description
      };
    });
    const promptSelectBundle = await select({
      message: '🦉 Select a bundle',
      loop: false,
      choices: bundleChoices.sort((a, b) => a.name.localeCompare(b.name))
    });

    const bundleWidgets = await getAllWidgetByBundleAlias(promptSelectBundle.bundleAlias, promptSelectBundle.isSystem);
    const widgetChoices = bundleWidgets.data.map(widget => {
      return {
        name: widget.name,
        value: widget.id.id,
        description: widget.description
      };
    });
    const widgetSelection = await checkbox({
      message: '🦉 Select widget(s)',
      loop: false,
      choices: widgetChoices.sort((a, b) => a.name.localeCompare(b.name))
    });

    await Promise.all(
      widgetSelection.map((widgetId) => fetchAndParseRemoteWidget(widgetId))
    );
    goodbye();
  }
};

export const promptPublishModifiedWidgets = async () => {
  const localWidgets = await findLocalWidgetsWithModifiedAssets();

  const modifiedWidgets = localWidgets.filter((widget) => widget?.assetsModified);
  if (modifiedWidgets) {
    await Promise.all(
      modifiedWidgets.map((widget) => {
        return publishLocalWidget(widget.id);
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
