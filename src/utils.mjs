import path from 'path';
import fs from 'fs';
import localStorage, { getRefreshToken, getToken } from './session.mjs';
import { tbHost } from '../index.mjs';

export const authHeaders = (token) => {
  return {
    headers: {
      Authorization: token || getToken()
    }
  };
};

export const fetchHandler = async (url, params) => {
  // Check if the token is expired or will expire soon refresh token.
  if (isTokenExpired()) {
    console.log('Token is expired, refreshing..');
    await refreshToken();
  }
  //
  // const auth = authHeaders();
  // params.headers = {...auth.headers,...params?.headers}
  // console.log(`fetchHandler => `, params.headers)
  // return await fetch(url, {...params });

  return await fetch(url, { ...authHeaders(), ...params });
};

// export const authFetch = async (url, token) => {
//   return await fetch(url, { ...authHeaders(token) });
// };

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
  const params = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      refreshToken: getRefreshToken()
    })
  };
  const request = await fetch(`${tbHost()}/api/auth/token`, { ...authHeaders(), ...params });
  const response = await request.json();
  if (response.token) {
    localStorage.setItem('token', `Bearer ${response.token}`);
  }
  if (response.refreshToken) {
    localStorage.setItem('refreshToken', response.refreshToken);
  }
  // console.log('refreshToken => ', response);
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
    // console.debug('No Token');
    return false;
  }
  const request = await fetch(`${tbHost()}/api/auth/user`, { ...authHeaders(token) });
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
