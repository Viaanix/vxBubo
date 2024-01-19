import axios from 'axios';
import { getToken, resetTokens } from '../session.mjs';
import { logger, axiosResponseError } from '../logger.mjs';
import { refreshExpiredToken } from './auth.mjs';

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
    // Add Auth header unless the endpoint is login
    if (!config.headers.Authorization && config.url !== '/core/auth/login' && getToken()) {
      log.info('Adding Authorization Header');
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

/*
* Axios Response Interceptor
*/
api.interceptors.response.use(
  function (response) {
    return response;
  },
  async function (error) {
    const originalRequest = error.config;
    axiosResponseError('error', error.response);
    const authFailuresMessages = ['Authentication failed', 'Token has expired'];
    // If auth fails lets try to fix the situation.
    if (error.response.status === 401) {
      // If we failed refreshing all hope is lost, nuke the tokens.
      if (originalRequest.url === '/api/auth/token') {
        resetTokens();
        return Promise.reject(error);
      // Attempt to refresh the token
      } else if (authFailuresMessages.includes(error?.response.data?.message)) {
        log.info(`💩 Token Refresh Started - ${error.response.status}: ${error.response.data.message}`);
        try {
          await refreshExpiredToken();
        } catch (error) {
          return Promise.reject(error);
        }
        originalRequest._retry = true;
        log.debug('UpdatedTokenResponse =>', originalRequest);
        originalRequest.headers.Authorization = getToken();
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);
