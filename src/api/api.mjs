import axios from 'axios';
import { getToken, resetTokens } from '../session.mjs';
import { logger } from '../logger.mjs';
import { refreshExpiredToken } from './auth.mjs';

const log = logger.child({ prefix: 'api-core' });

/**
 * Returns an object with a `headers` property that contains an `Authorization` header.
 * The value of the `Authorization` header is either the provided `token` or the result of calling the `getToken` function.
 *
 * @param {string} token - The token to be used for the `Authorization` header.
 * @returns {Object} - An object with a `headers` property that contains an `Authorization` header.
 */
export const authHeaders = (token) => {
  return {
    headers: {
      Authorization: token || getToken()
    }
  };
};

/**
 * Returns the headers object for making a JSON content request.
 * @returns {Object} The headers object.
 */
export const jsonContentHeaders = () => {
  return {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  };
};

export const api = axios.create({
  responseType: 'json'
});

api.interceptors.request.use(
  async function (config) {
    // log.info(`request => ${config.url}`);
    // Add Auth header unless the endpoint is login
    if (!config.headers.Authorization && config.url !== '/api/auth/login' && getToken()) {
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

/**
 * Intercept the response from an API request and handle authentication failures.
 * If the response status is 401 (Unauthorized), it checks if the original request was for refreshing the token.
 * If not, it attempts to refresh the expired token and resend the original request with the updated token.
 * If the token refresh fails or the original request was for refreshing the token, it resets the tokens and rejects the error.
 * Otherwise, it rejects the error.
 *
 * @param {Object} response - The response object from the API request.
 * @returns {Object} - The response object.
 * @throws {Error} - If the authentication fails or an error occurs during token refresh.
 */
api.interceptors.response.use(
  function (response) {
    return response;
  },
  async function (error) {
    const originalRequest = error.config;
    log.http(error);
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
          originalRequest._retry = true;
          log.debug('UpdatedTokenResponse =>', originalRequest);
          originalRequest.headers.Authorization = getToken();
          return api(originalRequest);
        } catch (error) {
          return Promise.reject(error);
        }
      }
    }
    return Promise.reject(error);
  }
);
