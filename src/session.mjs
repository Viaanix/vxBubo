import { LocalStorage } from 'node-localstorage';

const localStorage = new LocalStorage('./.bubo');

export const getToken = () => {
  return localStorage.getItem('token');
};

export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

export const getActiveWidget = () => {
  return localStorage.getItem('widgetId').trim();
};

export default localStorage;
