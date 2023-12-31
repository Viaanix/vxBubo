import path from 'path';
import fs from 'fs';
import localStorage, { getRefreshToken, getToken } from './session.mjs';
import { tbHost, scratchPath, localWidgetPath } from '../index.mjs';

export const authHeaders = (token) => {
  return {
    headers: {
      Authorization: token || getToken()
    }
  };
};

export const fetchHandler = async (url, params = {}) => {
  // Check if the token is expired or will expire soon refresh token.
  if (isTokenExpired()) {
    console.log('Token is expired, refreshing..');
    await refreshToken();
  }
  // TODO : Improve this.
  const auth = authHeaders();
  if (params?.headers) {
    params.headers = { ...auth.headers, ...params?.headers };
  } else {
    params.headers = { ...auth.headers };
  }
  return await fetch(url, { ...params });
};

export const parseJwt = (token) => {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
};

const getParsedToken = (token) => {
  token = token || getToken();
  return parseJwt(token.replace('Bearer', '').trim());
};

export const isTokenExpired = () => {
  const parsedToken = getParsedToken();
  // Fudge factor, will it expire in 5 minutes ?
  const fudge = 5 * 60;
  return (Math.round(Date.now() / 1000) + fudge) > parsedToken.exp;
};

export const refreshToken = async () => {
  console.log('refreshing token...');
  const params = {
    headers: {
      Authorization: getToken(),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      refreshToken: getRefreshToken()
    })
  };
  const request = await fetch(`${tbHost()}/api/auth/token`, { ...params });
  if (request.status === 200) {
    const response = await request.json();
    if (response.token) {
      localStorage.setItem('token', `Bearer ${response.token}`);
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
  }
  return getToken();
};

export const getUserRefreshToken = async () => {
  const parsedToken = getParsedToken();
  const tokenRequest = await fetch(`${tbHost()}/api/user/${parsedToken.userId}/token`, { ...authHeaders() });
  const tokenResponse = await tokenRequest.json();
  if (tokenResponse.refreshToken) {
    localStorage.setItem('refreshToken', tokenResponse.refreshToken);
  }
};

// TODO: rename
export const validToken = async (token) => {
  token = token || getToken();
  if (!token || !tbHost()) {
    console.debug('No Token');
    return false;
  }
  const request = await fetch(`${tbHost()}/api/auth/user`, { ...authHeaders(token) });
  const response = await request.json();
  if (request.status !== 200) {
    console.log('testToken Failed =>', request.status, response.message);
    // TODO: Abstract this away, no localStorage direct calls
    // Attempt to refresh token
    token = await refreshToken();
    return token !== null;
  }
  return request.status === 200;
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
    fileRaw = fs.readFileSync(filePath, 'utf8');
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

export const discoverLocalWidgetJsons = async () => {
  const widgetJsonDir = path.join(scratchPath, 'widgets');
  const localWidgets = [];

  await Promise.all(
    fs.readdirSync(widgetJsonDir).map(async (file) => {
      if (!file.includes('bak')) {
        const fileExt = path.extname(file);
        const widgetJsonPath = path.join(widgetJsonDir, file);

        if (fileExt === '.json') {
          const widgetJson = await getWidgetLocal(widgetJsonPath);
          const widgetPath = path.join(localWidgetPath, widgetJson.name);
          const stats = fs.statSync(widgetJsonPath);
          const payload = {
            name: widgetJson.name,
            id: file.split('.')[0],
            jsonPath: widgetJsonPath,
            widgetPath,
            modified: stats.mtime
          };
          localWidgets.push(payload);
        }
      }
    })
  );
  return localWidgets;
};

export const findLocalWidgetsWithModifiedAssets = async () => {
  const localWidgets = await discoverLocalWidgetJsons();

  return await Promise.all(
    localWidgets.map(async (widget) => {
      const widgetPath = path.join(localWidgetPath, widget.name);
      if (await checkPath(widgetPath)) {
        const widgetFiles = await fs.readdirSync(widgetPath, { recursive: true });

        for (const widgetAsset of widgetFiles) {
          const widgetAssetPath = path.join(widgetPath, widgetAsset);
          const stats = fs.statSync(widgetAssetPath);

          if (stats.mtime > widget.modified) {
            if (stats.mtime > widget.assetsModified || !widget.assetsModified) widget.assetsModified = stats.mtime;
          }
        }
      }
      return widget;
    })
  );
};
