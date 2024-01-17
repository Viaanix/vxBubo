import { api, jsonContentHeaders } from './api.mjs';

export const getWidgetByID = async (widgetId) => {
  return await api.get(`/api/widgetType/${widgetId}`);
};

export const publishWidget = async (widgetJson) => {
  return await api.post('/api/widgetType', widgetJson, jsonContentHeaders());
};

// Widget Bundles
export const getAllWidgetBundles = async () => {
  return await api.get('/api/widgetsBundles');
};

export const getAllWidgetByBundleAlias = async (bundleAlias, isSystem) => {
  return await api.get(`/api/widgetTypesInfos?isSystem=${isSystem}&bundleAlias=${bundleAlias}`);
};
