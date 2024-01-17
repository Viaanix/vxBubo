import axios from 'axios';
import { getToken, getRefreshToken, setUserAuthToken, setUserRefreshToken } from './session.mjs';
import { tbHost } from '../index.mjs';
import { getParsedToken } from './utils.mjs';
import { logger } from './logger.mjs';

const log = logger.child({ prefix: 'api' });

const authHeaders = (token) => {
  return {
    headers: {
      Authorization: token || getToken()
    }
  };
};

const jsonContentHeaders = () => {
  return {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  };
};

export const api = axios.create({
  baseURL: 'https://portal.vxolympus.com',
  responseType: 'json'
});

api.interceptors.request.use(
  async function (config) {
    logger.info(`request => ${config.url}`);
    // logger.info(JSON.stringify(config));
    // loggerJson('info', config);
    // if (DEBUG) console.log('request =>', config);
    // Add Auth header unless the endpoint is login
    if (!config.headers.Authorization && config.url !== '/api/auth/login') {
      logger.warn('Adding Authorization Header');
      config.headers.Authorization = getToken(); // Update this request
      api.defaults.headers.common.Authorization = getToken(); // Update Globally
    }
    // Do something before request is sent
    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  }
);

const axiosResponseError = (level, error) => {
  const message = `❌ - Axios Response ${error.status} 
  url: ${error.config.url}
  method: ${error.config.method}
  headers : ${error.config.headers}
  body : ${error.config.body}
  message : ${error.error?.data?.message}
  `;
  return logger.log(level, message);
};
/*
* Axios Response Interceptor
*/
api.interceptors.response.use(
  function (response) {
    return response;
  },
  async function (error) {
    const originalRequest = error.config;
    // logger.error('Axios Response Error');
    axiosResponseError('error', error.response);
    const authFailuresMessages = ['Authentication failed', 'Token has expired'];
    // If auth fails attempt to refresh the auth token or login and generate a fresh set of tokens.
    if (authFailuresMessages.includes(error?.response.data?.message) && error.response.status === 401) {
      logger.info(`💩 Token Refresh Started - ${error.response.status}: ${error.response.data.message}`);
      await refreshExpiredToken();
      originalRequest._retry = true;
      logger.debug('UpdatedTokenResponse =>', originalRequest);
      originalRequest.headers.Authorization = getToken();
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);

// https://tanmaythole.medium.com/optimizing-token-refreshing-preventing-duplicate-api-requests-with-axios-511bde1ef676
const refreshExpiredTokenClosure = () => {
  let isCalled = false;
  let runningPromise;
  return async () => {
    if (isCalled) {
      logger.info('ℹ️ -- isCalled');
      return runningPromise;
    } else {
      logger.info('ℹ️ -- Creating a new call');
      isCalled = true;
      runningPromise = await refreshUserToken();
      return runningPromise;
    }
  };
};

export const refreshExpiredToken = refreshExpiredTokenClosure();

export const checkTokenStatus = async (token) => {
  token = token || getToken();
  if (!token || !tbHost()) {
    console.debug('No Token');
    return false;
  }
  const request = await checkUserToken(token);
  logger.info('checkTokenStatus: request =>', request.status);
  // const response = await request.json();
  // if (request.status !== 200) {
  //   console.log('testToken Failed =>', request.status, response.message);
  //   // TODO: Abstract this away, no localStorage direct calls
  //   // Attempt to refresh token
  //   token = await refreshToken();
  //   return token !== null;
  // }
  return request.status === 200;
};

export const testAndRefreshToken = async (token) => {
  token = token || getToken();
  const tokenTest = await checkTokenStatus(token);
  if (!tokenTest) {
    logger.info('testAndRefreshToken test failed.');
    return await refreshExpiredToken();
  }
  logger.info('testAndRefreshToken test passed.');
  return true;
};

// Api Endpoint Calls
export const getUserRefreshToken = async (token) => {
  const parsedToken = getParsedToken(token);
  const userId = parsedToken?.userId;
  logger.debug(`parsedToke => ${parsedToken}`);
  if (userId) {
    const tokenRequest = await api.get(`/api/user/${userId}/token`, authHeaders(token));
    const tokenResponse = tokenRequest.data;
    logger.debug(`getUserRefreshToken => ${tokenRequest}`);
    if (tokenResponse?.refreshToken) {
      setUserRefreshToken(tokenResponse.refreshToken);
      return getRefreshToken();
    }
  } else {
    return false;
  }
};

export const refreshUserToken = async () => {
  logger.info('refreshing token...');

  const response = await api.post('/api/auth/token', {
    refreshToken: getRefreshToken()
  });

  if (response.status === 200) {
    logger.debug('refreshUserToken success!', response, response);
    if (response.data?.token) {
      setUserAuthToken(response.data.token);
    }
    if (response.data?.refreshToken) {
      setUserRefreshToken(response.data.refreshToken);
    }
  } else {
    logger.error('fetchTokens failed', response);
  }
  return response;
};

export const checkUserToken = async (token) => {
  return await api.get('/api/auth/user', authHeaders(token));
};

export const getWidgetByID = async (widgetId) => {
  return await api.get(`/api/widgetType/${widgetId}`);
};

export const publishWidget = async (widgetJson) => {
  return await api.post('/api/widgetType', widgetJson, jsonContentHeaders());
};
