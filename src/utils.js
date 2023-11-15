import path from 'path';
import fs from 'fs';
import localStorage from './session.js';
import 'dotenv/config';

export const getToken = async () => {
  return localStorage.getItem('token');
};

export const getActiveWidget = async () => {
  return localStorage.getItem('widgetId');
};

export const authFetch = async (url, token) => {
  const authHeader = {
    headers: {
      Authorization: token || await getToken()
    }
  };
  return fetch(url, { ...authHeader });
};

export const testToken = async (token) => {
  if (!token) return false;
  const apiUrl = `${process.env.THINGSBOARD_URL}/api/auth/user`;
  const request = await authFetch(apiUrl, token);
  const response = await request.json();
  if (request.status !== 200) {
    console.log('testToken Failed =>', request.status, response.message);
    // Remove token if failed/expired
    localStorage.removeItem('token');
    return false;
  }
  return true;
};

export const formatJson = (data) => {
  return JSON.stringify(data, null, 4);
};

export const validatePath = async (dirname) => {
  if (!fs.existsSync(dirname)) {
    console.log(`Cannot find ${dirname}, creating it.`);
    await fs.mkdirSync(dirname, { recursive: true });
  }
};

export const createFile = async (filePath, data) => {
  try {
    fs.writeFileSync(filePath, data);
  } catch (error) {
    throw new Error(error);
  }
};

export const getLocalFile = async (path) => {
  let fileRaw;
  try {
    fileRaw = await fs.readFileSync(path, 'utf8');
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
  return fileRaw;
};

export const getWidgetLocal = async (widgetPath) => {
  const widgetJsonRaw = await getLocalFile(widgetPath);
  return JSON.parse(widgetJsonRaw);
};

export const getWidgetDevPaths = async (widgetPath, alias) => {
  return {
    css: path.join(widgetPath, `${alias}.css`),
    html: path.join(widgetPath, `${alias}.html`),
    js: path.join(widgetPath, `${alias}.js`)
  };
};
