import { api, jsonContentHeaders } from '../api/api.mjs';

export const getWidgetByID = async (widgetId) => {
  return await api.get(`/api/widgetType/${widgetId}`);
};

export const publishWidget = async (widgetJson) => {
  return await api.post('/api/widgetType', widgetJson, jsonContentHeaders());
};

export const createWidget = async (bundleAlias, isSystem, alias, payload) => {
  const params = {
    bundleAlias,
    isSystem,
    alias
  };
  const baseWidget = await api.get('/api/widgetType', { params });
  payload.descriptor = baseWidget.data.descriptor;
  return await api.post('/api/widgetType', payload, jsonContentHeaders());
};

// Widget Bundles
export const getAllWidgetBundles = async () => {
  return await api.get('/api/widgetsBundles');
};

export const getAllWidgetByBundleAlias = async (bundleAlias, isSystem) => {
  const params = {
    bundleAlias,
    isSystem
  };
  return await api.get('/api/widgetTypesInfos', { params });
};

export const getWidgetTenant = async (tenantId) => {
  return await api.get(`/api/tenant/info/${tenantId}`);
};
