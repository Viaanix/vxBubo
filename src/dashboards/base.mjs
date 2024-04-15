import path from 'path';
import { localDashboardPath, scratchPath } from '../../index.mjs';
import { getDashboardById, getDashboardInfo, publishDashboardJson } from './api.mjs';
import { createFile, formatJson, getLocalFile, mergeDeep, validatePath, getScratchFile } from '../utils.mjs';
import { dashboardJsonSourcePath } from './helper.mjs';
import { processActions } from '../widgets/base.mjs';

export const prepareLocalDashboardJson = async (dashboardJson) => {
  const newDashJson = { ...dashboardJson };

  // Remove Resources that we have files for
  //   for (const key of resourcesWriteMap) {
  //     delete newDashJson.descriptor[key.property];
  //   }

  // Create a protected key that will allow for a sync
  newDashJson.protected = {};
  const protectedKeys = [
    'id',
    'createdTime',
    'tenantId',
    'ownerId',
    'customerId',
    'assignedCustomers'
  ];
  for (const key of protectedKeys) {
    if (newDashJson[key]) {
      newDashJson.protected[key] = newDashJson[key];
      delete newDashJson[key];
    }
  }

  //   newDashJson.protected.descriptor = {
  //     defaultConfig: newDashJson.descriptor.defaultConfig
  //   };

  // Remove Actions
  //   delete newDashJson.descriptor.defaultConfig;

  return formatJson(newDashJson);
};

export const fetchDashboard = async (dashboardId) => {
  return getDashboardById(dashboardId);
};

export const saveDashboard = async (dashboardJson) => {
  await validatePath(path.join(scratchPath, 'dashboards'));
  return await createFile(dashboardJsonSourcePath(dashboardJson.id.id), formatJson(dashboardJson));
};

export const generateDashboardSettings = async (dashboardJson) => {
  const dashboardDetails = await getDashboardInfo(dashboardJson.id.id);
  const dashboardGroups = dashboardDetails.groups.map((group) => group.name);
  const dashboardLocalName = [dashboardJson.name, ...dashboardGroups].filter(n => n).join('-');
  const dashboardPath = path.join(localDashboardPath, dashboardLocalName);

  return { dashboardLocalName, dashboardDetails, dashboardGroups, dashboardPath };
};

export const parseDashboard = async (dashboardJson) => {
  const { dashboardPath } = await generateDashboardSettings(dashboardJson);
  const localDashboardJson = await prepareLocalDashboardJson(dashboardJson);
  await createFile(path.join(dashboardPath, 'dashboard.json'), localDashboardJson);

  if (dashboardJson.configuration.widgets) {
    Object.values(dashboardJson.configuration.widgets).map(async (widget) => {
      return await parseDashboardWidget(dashboardPath, widget, 'write');
    });
  }
};

export const parseDashboardWidget = async (dashboardPath, widgetJson, action) => {
  const dashboardWidgetPath = path.join(dashboardPath, 'widgets');
  const widgetname = [widgetJson.config?.title, widgetJson.typeFullFqn].join('-');
  const widgetPath = path.join(dashboardWidgetPath, widgetname);
  if (action === 'write') {
    await createFile(path.join(widgetPath, 'widget.json'), widgetJson);
  }

  if (widgetJson.config?.actions && Object.keys(widgetJson.config?.actions).length > 0) {
    // console.log('Processing Actions');
    widgetJson.config = await processActions(widgetPath, widgetJson, action);
  }
  return widgetJson;
};

export const bundleDashboard = async (localDashboardJson) => {
  localDashboardJson = JSON.parse(localDashboardJson);
  let dashboardJson = localDashboardJson;

  if (dashboardJson?.protected) {
    dashboardJson = mergeDeep(dashboardJson, dashboardJson.protected);
    delete dashboardJson.protected;
  }

  const { dashboardPath } = await generateDashboardSettings(dashboardJson);

  // Read local widget directory for changes
  if (dashboardJson.configuration.widgets) {
    for (const [key, value] of Object.entries(dashboardJson.configuration.widgets)) {
      dashboardJson.configuration.widgets[key] = await parseDashboardWidget(dashboardPath, value, 'bundle');
    }
  }
  return dashboardJson;
};

export const publishDashboard = async (dashboardId) => {
  const dashboardJson = await getScratchFile('dashboard', dashboardId);
  const settings = await generateDashboardSettings(dashboardJson);
  const localDashboardJson = await getLocalFile(path.join(settings.dashboardPath, 'dashboard.json'));
  const bundle = await bundleDashboard(localDashboardJson);
  const pubResponse = await publishDashboardJson(formatJson(bundle));
  return pubResponse;
};

export const fetchAndParseDashboard = async (dashboardId) => {
  try {
    const dashboardJson = await fetchDashboard(dashboardId);
    await saveDashboard(dashboardJson);
    await parseDashboard(dashboardJson);
  } catch (error) {
    console.error(`Failed to retrieve dashboard: ${error}`);
    throw error;
  }
};
