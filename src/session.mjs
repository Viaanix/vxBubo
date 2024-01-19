import { LocalStorage } from 'node-localstorage';
import { api } from './api/api.mjs';
import { logger } from './logger.mjs';

const localStorage = new LocalStorage('./.bubo');
const log = logger.child({ prefix: 'utils' });

export const resetTokens = () => {
  log.info('💾 Deleting Tokens!');
  delete api.defaults.headers.common.Authorization;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};
export const getToken = () => {
  log.info('💾 Getting authToken from localstorage');
  return localStorage.getItem('token');
};

export const getRefreshToken = () => {
  log.info('💾 Getting refreshToken from localstorage');
  return localStorage.getItem('refreshToken');
};

export const getActiveWidget = () => {
  const widgetId = localStorage.getItem('widgetId');
  return widgetId ? widgetId.trim() : widgetId;
};

export const setUserAuthToken = (token) => {
  log.info('💾 Setting authToke in localstorage');
  // Force removal of `Bearer` then add it back to ensure it's a consistent experience. Kludge, yeah so?
  token = token.replace('Bearer', '').trim();
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  localStorage.setItem('token', `Bearer ${token}`);
};

export const setUserRefreshToken = (token) => {
  log.info('💾 Setting refreshToken');
  localStorage.setItem('refreshToken', token);
};

export const setWidgetId = (widgetId) => {
  log.info('💾 Setting widgetId');
  localStorage.setItem('widgetId', widgetId);
};

export default localStorage;
