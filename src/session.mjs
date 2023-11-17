import { LocalStorage } from 'node-localstorage';

const localStorage = new LocalStorage('./.bubo');

export const getHost = () => {
  return localStorage.getItem('host');
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const getActiveWidget = () => {
  return localStorage.getItem('widgetId');
};

export default localStorage;
