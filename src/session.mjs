import { LocalStorage } from 'node-localstorage';

const localStorage = new LocalStorage('./.bubo');

export const getToken = () => {
  console.log('getting token from localstorage');
  return localStorage.getItem('token');
};

export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

export const getActiveWidget = () => {
  const widgetId = localStorage.getItem('widgetId');
  return widgetId ? widgetId.trim() : widgetId;
};

export const setUserAuthToken = (token) => {
  // Force removal of `Bearer` then add it back to ensure it's a consistent experience. Kludge, yeah so?
  token = token.replace('Bearer', '').trim();
  localStorage.setItem('token', `Bearer ${token}`);
};

export const setUserRefreshToken = (token) => {
  localStorage.setItem('refreshToken', token);
};

export default localStorage;
