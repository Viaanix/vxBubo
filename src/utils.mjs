import path from 'path';
import fs from 'fs';
import localStorage, { getToken } from './session.mjs';
import { tbHost } from '../index.mjs';

export const authFetch = async (url, token) => {
  const authHeader = {
    headers: {
      Authorization: token || await getToken()
    }
  };
  return fetch(url, { ...authHeader });
};

// TODO: rename
export const validToken = async (token) => {
  token = token || getToken();
  if (!token || !tbHost()) {
    // console.debug('No Token');
    return false;
  }
  const apiUrl = `${tbHost()}/api/auth/user`;
  const request = await authFetch(apiUrl, token);
  const response = await request.json();
  if (request.status !== 200) {
    console.log('testToken Failed =>', request.status, response.message);
    // TODO: Abstract this away, no localStorage direct calls
    // Remove token if failed/expired
    localStorage.removeItem('token');
    return false;
  }
  return true;
};

export const formatJson = (data) => {
  return JSON.stringify(data, null, 2);
};

// =============================
// Filesystem Utils
// =============================

export const checkPath = async (dir) => {
  return fs.existsSync(dir);
};

// TODO: Update name
export const validatePath = async (dirname) => {
  if (!await checkPath(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
    console.debug(`Cannot find ${dirname}, creating it.`);
  }
};

export const createFile = async (filePath, data) => {
  // Validate path before creating a file
  await validatePath(path.dirname(filePath));
  try {
    fs.writeFileSync(filePath, data);
  } catch (error) {
    throw new Error(error);
  }
};

export const getLocalFile = async (filePath) => {
  let fileRaw;
  try {
    fileRaw = await fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
  return fileRaw;
};

export const getWidgetRemote = async (widgetId) => {
  const apiUrl = `${tbHost()}/api/widgetType/${widgetId}`;
  return await authFetch(apiUrl);
};

export const getWidgetLocal = async (widgetPath) => {
  const widgetJsonRaw = await getLocalFile(widgetPath);
  return JSON.parse(widgetJsonRaw);
};
