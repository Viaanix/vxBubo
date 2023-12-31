import { LocalStorage } from 'node-localstorage';

const localStorage = new LocalStorage('./.bubo');

export const getToken = () => {
  return localStorage.getItem('token');
};

export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

export const getActiveWidget = () => {
  const widgetId = localStorage.getItem('widgetId');
  return widgetId ? widgetId.trim() : widgetId;
};

export default localStorage;
