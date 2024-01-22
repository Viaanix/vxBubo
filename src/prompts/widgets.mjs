import { getActiveWidget, setWidgetId } from '../session.mjs';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { fetchAndParseRemoteWidget, publishLocalWidget } from '../widget.mjs';
import { getParsedToken } from '../api/auth.mjs';
import { createWidget, getAllWidgetBundles, getAllWidgetByBundleAlias } from '../api/widget.mjs';
import { findLocalWidgetsWithModifiedAssets } from '../utils.mjs';
import { formatDistanceToNow } from 'date-fns';
import { clearPrevious, goodbye } from './main.mjs';

export const promptWidgetGetInteractive = async () => {
  const widgetId = await getActiveWidget() || '';
  let widgets = [];

  const promptGetAction = await select({
    message: '🦉 How would you like to GET a widget?',
    choices: [
      {
        name: `Last Widget (${widgetId})`,
        value: 'last',
        description: '💾 Use the widgetId of the previous GET',
        disabled: !widgetId
      },
      {
        name: 'By widgetId',
        value: 'newWidgetId',
        description: '🔑 Enter a new widgetId to GET'
      },
      {
        name: 'From Widget Bundle',
        value: 'bundle',
        description: '🎁 Browse and select a widget(s) from a Widget Bundle'
      }
    ]
  }, clearPrevious);

  if (promptGetAction === 'last') {
    widgets.push(widgetId);
  } else if (promptGetAction === 'newWidgetId') {
    const answer = await input({
      name: 'widgetId',
      message: `🦉 What is the widget id you would like to ${chalk.bold.green('GET')}?`
    }, clearPrevious);
    if (answer) {
      setWidgetId(answer.trim());
      widgets.push(getActiveWidget());
    }
  } else if (promptGetAction === 'bundle') {
    const bundleAnswer = await promptSelectWidgetBundle();
    const widgetsFromBundleAnswer = await promptSelectWidgetsFromWidgetBundle(bundleAnswer.bundleAlias, bundleAnswer.isSystem);
    widgets = [...widgets, ...widgetsFromBundleAnswer];
  }

  try {
    await Promise.all(
      widgets.map((widgetId) => fetchAndParseRemoteWidget(widgetId))
    );
    console.log(`🦉 ${chalk.bold.green('Widgets have been downloaded and ready to develop')}`);
  } catch (error) {
    console.log(`🦉 ${chalk.bold.red('Unable to download widget')}`);
  }
  goodbye();
};

export const promptSelectWidgetBundle = async (promptMessage) => {
  const parsedToken = getParsedToken();
  const widgetBundles = await getAllWidgetBundles();

  promptMessage = promptMessage || 'Select a Widget Bundle';

  const bundleChoices = widgetBundles.data.map(bundle => {
    const isSystem = parsedToken.tenantId !== bundle.tenantId.id;
    return {
      name: isSystem ? `${bundle.title} ${`${chalk.yellow('(system)')}`}` : bundle.title,
      value: { bundleAlias: bundle.alias, isSystem },
      description: bundle.description
    };
  });

  const bundleAnswer = await select({
    message: `🦉 ${promptMessage}`,
    loop: false,
    choices: bundleChoices.sort((a, b) => a.name.localeCompare(b.name))
  });
  return bundleAnswer;
};

export const promptSelectWidgetsFromWidgetBundle = async (bundleAlias, isSystem) => {
  const bundleWidgets = await getAllWidgetByBundleAlias(bundleAlias, isSystem);
  const widgetChoices = bundleWidgets.data.map(widget => {
    return {
      name: widget.name,
      value: widget.id.id,
      description: widget.description
    };
  });

  return await checkbox({
    message: '🦉 Select widget(s)',
    loop: false,
    required: true,
    choices: widgetChoices.sort((a, b) => a.name.localeCompare(b.name))
  }, clearPrevious);
};

export const promptCreateWidget = async () => {
  const widgetBundleAnswer = await promptSelectWidgetBundle('Select a Widget Bundle');
  const widgetNameAnswer = await input({
    message: 'Enter the name of your new widget'
  });
  const typeAnswer = await select({
    message: 'Select a widget type',
    choices: [
      {
        name: 'Time Series',
        value: { bundleAlias: 'charts', alias: 'basic_timeseries' },
        description: 'Displays changes to timeseries data over time. For example, temperature or humidity readings.'

      },
      {
        name: 'Latest Values',
        value: { bundleAlias: 'cards', alias: 'attributes_card' },
        description: 'Displays one or more latest values of the entity. Supports multiple entities.'

      },
      {
        name: 'Control Widget',
        value: { bundleAlias: 'gpio_widgets', alias: 'basic_gpio_control' },
        description: "Allows to change state of the GPIO for target device using RPC commands. Requires handling of the RPC commands in the device firmware. Uses 'getGpioStatus' and 'setGpioStatus' RPC calls"

      },
      {
        name: 'Alarm Widget',
        value: { bundleAlias: 'alarm_widgets', alias: 'alarms_table' },
        description: 'Displays alarms based on defined time window and other filters.'

      },
      {
        name: 'Static Widget',
        value: { bundleAlias: 'cards', alias: 'html_card' }
      }
    ]
  });

  const payload = {
    name: widgetNameAnswer,
    bundleAlias: widgetBundleAnswer.bundleAlias
  };
  const createNewWidget = await createWidget(typeAnswer.bundleAlias, true, typeAnswer.alias, payload);
  const answer = await confirm({ message: `🦉 Would you like to download ${createNewWidget.data.name}?` });
  if (answer) fetchAndParseRemoteWidget(createNewWidget.data.id.id);
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
    choices: widgetChoices.sort((a, b) => a.modifiedAgo.localeCompare(b.modifiedAgo)),
    loop: false,
    required: true
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
  // if (localWidgets.length === 0) {
  // return localWidgets;
  // }
  return localWidgets.map((widget) => {
    let modifiedAgo = '';
    if (widget?.assetsModified) {
      modifiedAgo = chalk.italic.yellow(`modified: ${formatDistanceToNow(widget.assetsModified)} ago`);
    }
    return { name: `${widget.name} ${modifiedAgo} `, value: widget, modifiedAgo };
  });
};
