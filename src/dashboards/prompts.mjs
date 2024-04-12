import { input, select } from '@inquirer/prompts';
import { clearPrevious, goodbye } from '../prompts/helpers.mjs';
import chalk from 'chalk';
import { logger } from './../logger.mjs';
// import { buboOutput } from '../utils.mjs';
import { storage } from '../session.mjs';
import { fetchAndParseDashboard, publishDashboard } from './base.mjs';

const log = logger.child({ prefix: 'prompts-dashboard' });

export const promptDashboardGetInteractive = async () => {
  const dashboardId = await storage.dashboard || '';
  const dashboards = [];

  const promptGetAction = await select({
    message: '🦉 How would you like to GET a dashboard?',
    choices: [
      {
        name: `Last dashboard (${dashboardId})`,
        value: 'last',
        description: '💾 Use the dashboard of the previous GET',
        disabled: !dashboardId
      },
      {
        name: 'By dashboardId',
        value: 'byId',
        description: '🔑 Enter a new dashboardId to GET'
      }
    ]
  }, clearPrevious);

  if (promptGetAction === 'last') {
    dashboards.push(dashboardId);
  } else if (promptGetAction === 'byId') {
    const answer = await input({
      name: 'dashboardId',
      message: `🦉 What is the dashboard id you would like to ${chalk.bold.green('GET')}?`
    }, clearPrevious);
    if (answer) {
      storage.dashboard = answer.trim();
      dashboards.push(storage.dashboard);
    }
  }
  try {
    await Promise.all(
      dashboards.map((dashboardId) => fetchAndParseDashboard(dashboardId))
    );
    console.log(`🦉 ${chalk.bold.green('Dashboard(s) have been downloaded and ready to develop')}`);
  } catch (error) {
    log.error(error);
    console.log('error =>', error);
    console.log(`🦉 ${chalk.bold.red('Unable to download dashboard')}`);
  }
  goodbye();
};

export const promptDashboardPublishInteractive = async () => {
  const dashboardId = await storage.dashboard || '';

  const promptGetAction = await select({
    message: '🦉 Which dashboard would you like to publish?',
    choices: [
      {
        name: `Last dashboard (${dashboardId})`,
        value: 'publishLast',
        description: '💾 Use the active dashboard id',
        disabled: !dashboardId
      }
    //   {
    //     name: 'By widgetId',
    //     value: 'byId',
    //     description: '🔑 Enter a new dashboardId to GET'
    //   }
    ]
  }, clearPrevious);

  if (promptGetAction) {
    await publishDashboard(dashboardId);
  }
};
