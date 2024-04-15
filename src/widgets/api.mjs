import { api, jsonContentHeaders } from '../api/api.mjs';

/**
 * Retrieves a widget by its ID using an API call.
 * @param {number} widgetId - The ID of the widget to retrieve.
 * @returns {Promise<object>} - The widget object with the specified ID.
 */
export const getWidgetByID = async (widgetId) => {
  try {
    const response = await api.get(`/api/widgetType/${widgetId}`);
    return response;
  } catch (error) {
    throw new Error(`Failed to retrieve widget with ID ${widgetId}`);
  }
};

/**
 * Sends a POST request to a specific API endpoint with a JSON payload.
 * @param {object} widgetJson - The JSON payload to be sent in the POST request.
 * @returns {Promise<object>} - The response from the API.
 */
export const publishWidget = async (widgetJson) => {
  try {
    const response = await api.post('/api/widgetType', widgetJson, jsonContentHeaders());
    return response;
  } catch (error) {
    console.error('Error publishing widget:', error);
    throw error;
  }
};

/**
 * Creates a new widget by making HTTP requests to an API.
 * @param {string} bundleAlias - The alias of the widget bundle.
 * @param {boolean} isSystem - Indicates whether the widget is a system widget.
 * @param {string} alias - The alias of the widget.
 * @param {object} payload - The payload data for creating the widget.
 * @returns {Promise<object>} - The created widget object.
 */
export const createWidget = async (bundleAlias, isSystem, alias, payload) => {
  try {
    const params = { bundleAlias, isSystem, alias };
    const baseWidget = await api.get('/api/widgetType', { params });
    payload.descriptor = baseWidget.data.descriptor;
    const result = await api.post('/api/widgetType', payload, jsonContentHeaders());
    return result.data;
  } catch (error) {
    throw new Error('Failed to create widget');
  }
};

/**
 * Retrieves all widget bundles from the API.
 * @returns {Promise<Array>} A promise that resolves to an array of widget bundles.
 */
export const getAllWidgetBundles = async () => {
  try {
    const response = await api.get('/api/widgetsBundles');
    return response.data;
  } catch (error) {
    console.error('Failed to retrieve widget bundles:', error);
    throw error;
  }
};

/**
 * Retrieves information about widget types from an API.
 * @param {string} bundleAlias - The alias of the bundle to retrieve widget types for.
 * @param {boolean} isSystem - Indicates whether the widget types should be system-level or not.
 * @returns {Promise} - A promise that resolves with the response from the API.
 */
export const getAllWidgetByBundleAlias = async (bundleAlias, isSystem) => {
  try {
    const params = { bundleAlias, isSystem };
    const response = await api.get('/api/widgetTypesInfos', { params });
    return response;
  } catch (error) {
    throw new Error(`Failed to retrieve widget types: ${error.message}`);
  }
};

/**
 * Retrieves information about a specific tenant.
 * @param {string} tenantId - The ID of the tenant.
 * @returns {Promise} A promise that resolves to the information about the tenant.
 */
export const getWidgetTenant = async (tenantId) => {
  try {
    const response = await api.get(`/api/tenant/info/${tenantId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to retrieve tenant information: ${error.message}`);
  }
};
