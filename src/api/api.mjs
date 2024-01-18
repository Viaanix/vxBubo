import axios from 'axios';
import { getToken } from '../session.mjs';
import { logger } from '../logger.mjs';
import { refreshExpiredToken } from './auth.mjs';
import qs from 'qs';

const log = logger.child({ prefix: 'api-core' });

export const authHeaders = (token) => {
  return {
    headers: {
      Authorization: token || getToken()
    }
  };
};

export const jsonContentHeaders = () => {
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
    log.info(`request => ${config.url}`);
    // logger.info(JSON.stringify(config));
    // loggerJson('info', config);
    // if (DEBUG) console.log('request =>', config);
    // Add Auth header unless the endpoint is login
    if (!config.headers.Authorization && config.url !== '/core/auth/login') {
      log.warn('Adding Authorization Header');
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
  return log.log(level, message);
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
      log.info(`💩 Token Refresh Started - ${error.response.status}: ${error.response.data.message}`);
      await refreshExpiredToken();
      originalRequest._retry = true;
      log.debug('UpdatedTokenResponse =>', originalRequest);
      originalRequest.headers.Authorization = getToken();
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);
