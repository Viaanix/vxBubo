import { api, jsonContentHeaders } from '../api/api.mjs';

export const getDashboardById = async (dashboardId) => {
  try {
    const response = await api.get(`/api/dashboard/${dashboardId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to retrieve dashboard: ${error}`);
    throw error;
  }
};

export const getDashboardInfo = async (dashboardId) => {
  try {
    const response = await api.get(`/api/dashboard/info/${dashboardId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to retrieve dashboard: ${error}`);
    throw error;
  }
};
export const publishDashboardJson = async (dashboardJson) => {
  try {
    const response = await api.post('/api/dashboard', dashboardJson, jsonContentHeaders());
    return response;
  } catch (error) {
    console.error('Error publishing widget:', error);
    throw error;
  }
};
