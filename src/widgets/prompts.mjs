import { checkbox, confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { formatDistanceToNow, compareDesc } from 'date-fns';
import { fetchAndParseRemoteWidget, publishLocalWidget } from './base.mjs';
import { getParsedToken } from '../api/auth.mjs';
import { createWidget, getAllWidgetBundles, getAllWidgetByBundleAlias } from './api.mjs';
import { discoverLocalWidgets } from './helper.mjs';
import { promptSeperator, clearPrevious, goodbye } from '../prompts/helpers.mjs';
import { getActiveWidget, setWidgetId } from '../session.mjs';
import { logger } from './../logger.mjs';
import { buboOutput } from '../utils.mjs';

const log = logger.child({ prefix: 'prompts-widget' });

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
    log.error(error);
    console.log('error =>', error);
    console.log(`🦉 ${chalk.bold.red('Unable to download widget')}`);
  }
  goodbye();
};

export const promptSelectWidgetBundle = async (promptMessage) => {
  const parsedToken = getParsedToken();
  const widgetBundles = await getAllWidgetBundles();

  promptMessage = promptMessage || 'Select a Widget Bundle';

  const bundleChoicesFormatted = widgetBundles.data.map(bundle => {
    const isSystem = parsedToken.tenantId !== bundle.tenantId.id;
    return {
      name: isSystem ? `${bundle.title} ${`${chalk.yellow('(system)')}`}` : bundle.title,
      type: isSystem ? 'system' : 'tenant',
      value: { bundleAlias: bundle.alias, isSystem },
      description: bundle.description
    };
  });

  const bundleChoicesGrouped = Map.groupBy(bundleChoicesFormatted, bundle => {
    return bundle.type;
  });

  const bundleChoices = [
    promptSeperator('Tenant Bundles'),
    ...bundleChoicesGrouped.get('tenant').sort((a, b) => a.name.localeCompare(b.name)),
    promptSeperator('System Bundles'),
    ...bundleChoicesGrouped.get('system').sort((a, b) => a.name.localeCompare(b.name))
  ];

  return select({
    message: `🦉 ${promptMessage}`,
    loop: false,
    choices: bundleChoices
  });
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

  return checkbox({
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

export const promptPublishModifiedWidgets = async (force = false) => {
  const publishWidgets = async (widgets) => {
    return await Promise.all(
      widgets.map((widget) => {
        // console.log(`Publishing ${widget.name} ${widget.value.id}`);
        return publishLocalWidget(widget.value);
      })
    );
  };

  const localWidgets = await getLocalWidgetChoices();
  const modifiedWidgets = localWidgets.filter((widget) => widget?.modifiedAgo);
  if (modifiedWidgets.length === 0) {
    console.log(chalk.yellowBright('🦉 No changes to widgets found.'));
    goodbye();
  }
  let answer = false;

  if (!force) {
    const widgetList = modifiedWidgets.map((widget) => `\n- ${widget.name}`);
    answer = await confirm({ message: `Do you about to publish the following widgets? ${widgetList} \n` });
  } else {
    console.log(buboOutput('warning', 'info', 'Force publishing all modified widgets'));
  }

  if (answer || force) {
    await publishWidgets(modifiedWidgets);
  } else {
    console.log(buboOutput('bubo', 'info', 'No widgets were published.'));
  }
  goodbye();
};

export const promptPublishLocalWidgets = async () => {
  const localWidgets = await getLocalWidgetChoices();

  // Group Widgets by modified and unmodified
  const widgetGrouping = Object.groupBy(localWidgets, widget => {
    return widget.modifiedAgo !== '' ? 'modified' : 'clean';
  });

  const widgetChoices = [];

  if (widgetGrouping?.modified?.length) {
    widgetChoices.push(promptSeperator('Modified Widgets', 'success'));
    widgetGrouping.modified.sort((a, b) => compareDesc(a.value.assetsModified, b.value.assetsModified));
    widgetChoices.push(...widgetGrouping.modified);
    if (widgetGrouping?.clean?.length) {
      widgetChoices.push(promptSeperator('Widgets'));
    }
  }

  if (widgetGrouping?.clean?.length) {
    widgetGrouping.clean.sort((a, b) => a.name.localeCompare(b.name));
    widgetChoices.push(...widgetGrouping.clean);
  }

  if (!widgetChoices.length) {
    console.log(buboOutput('warning', 'error', 'No widgets found to publish'));
    goodbye();
  }

  const answer = await checkbox({
    message: '🦉 What widgets would you like to publish?',
    choices: widgetChoices,
    loop: false,
    required: true
  }, clearPrevious);

  await Promise.all(
    answer.map(async (widget) => {
      return await publishLocalWidget(widget);
    })
  );
  goodbye();
};

// Helpers
const getLocalWidgetChoices = async () => {
  const localWidgets = await discoverLocalWidgets();
  if (localWidgets.length === 0) {
    return localWidgets;
  }
  return localWidgets.map((widget) => {
    let modifiedAgo = '';
    if (widget?.assetsModified > widget?.modified) {
      modifiedAgo = chalk.italic.yellow(`modified: ${formatDistanceToNow(widget.assetsModified)} ago`);
    }
    return { name: `${widget.name} ${modifiedAgo} `, value: widget, modifiedAgo };
  });
};
