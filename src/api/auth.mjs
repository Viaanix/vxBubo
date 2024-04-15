import { api, authHeaders } from './api.mjs';
import { tbHost } from '../../index.mjs';
import { getToken, getRefreshToken, setUserAuthToken, setUserRefreshToken } from '../session.mjs';
import { logger } from '../logger.mjs';

const log = logger.child({ prefix: 'api-auth' });

/**
 * Parses a JWT token and returns the decoded payload.
 * @param {string} token - The JWT token to parse.
 * @returns {object} - The decoded payload as a JavaScript object.
 */
export const parseJwt = (token) => {
  // Remove "Bearer" prefix and trim whitespace from the token
  const cleanedToken = token.replace(/^Bearer\s+/i, '').trim();

  // Split the token into three parts (header, payload, signature)
  const payload = cleanedToken.split('.');

  // Decode the payload from base64 and parse it as JSON
  const decodedPayload = JSON.parse(atob(payload));

  return decodedPayload;
};

/**
 * Retrieves the token from local storage if not provided, removes the "Bearer" prefix, and parses the token.
 * @param {string} [token] - The token to be parsed. If not provided, the token is retrieved from local storage.
 * @returns {object} - The parsed token.
 */
export const getParsedToken = (token) => {
  token = token || getToken(); // If token is not provided, retrieve it from local storage
  token = token.replace('Bearer', '').trim(); // Remove "Bearer" prefix and trim whitespace
  return parseJwt(token); // Parse the token
};

/**
 * This function returns a closure that prevents duplicate API requests for refreshing an expired token.
 * @see https://tanmaythole.medium.com/optimizing-token-refreshing-preventing-duplicate-api-requests-with-axios-511bde1ef676
 * @returns {Function} The closure that can be called to refresh the user token.
 */
const refreshExpiredTokenClosure = () => {
  let isCalled = false;
  let runningPromise;

  /**
   * The closure function that refreshes the user token.
   * @returns {Promise} The promise that resolves with the refreshed token.
   */
  return async () => {
    if (isCalled) {
      log.info('ℹ️ -- isCalled');
      return runningPromise;
    } else {
      log.info('ℹ️ -- Creating a new call');
      isCalled = true;
      runningPromise = await refreshUserToken();
      return runningPromise;
    }
  };
};

export const refreshExpiredToken = refreshExpiredTokenClosure();

/**
 * Checks the status of a token by making an API request to the server.
 * @param {string} token - The token to be checked. If not provided, it retrieves the token from local storage.
 * @returns {boolean} - A boolean value indicating the status of the token. `true` if the token is valid, and `false` otherwise.
 */
export const checkTokenStatus = async (token) => {
  token = token || getToken();

  if (!token || !tbHost()) {
    log.debug('No Token');
    return false;
  }

  const request = await checkUserToken(token);
  log.info(`checkTokenStatus: request => ${request.status}`);

  if (request.status !== 200) {
    log.error(`testToken Failed => ${request.status}`);
  }

  return request.status === 200;
};

/**
 * Checks the validity of a token and refreshes it if necessary.
 * @param {string} token - The token string to be tested and refreshed.
 * @returns {Promise<boolean>} - A boolean value indicating whether the token test passed or failed.
 */
export const testAndRefreshToken = async (token) => {
  // If token is not provided, retrieve it from local storage
  token = token || getToken();

  // Check the validity of the token
  const tokenTest = await checkTokenStatus(token);

  if (!tokenTest) {
    // Token test failed, log a message and refresh the token
    log.info('testAndRefreshToken test failed.');
    return await refreshExpiredToken();
  } else {
    // Token test passed, log a message and return true
    log.info('testAndRefreshToken test passed.');
    return true;
  }
};

/**
 * Retrieves the refresh token for a user.
 * @param {string} token - The user token used for authentication.
 * @returns {Promise<string|boolean>} - The refresh token obtained from the server, or false if the user ID is not found.
 */
export const getUserRefreshToken = async (token) => {
  try {
    const parsedToken = getParsedToken(token);
    const userId = parsedToken?.userId;
    log.debug(`parsedToken => ${parsedToken}`);

    if (userId) {
      const tokenRequest = await api.get(`/api/user/${userId}/token`, authHeaders(token));
      const tokenResponse = tokenRequest.data;
      log.debug(`getUserRefreshToken => ${tokenRequest}`);

      if (tokenResponse?.refreshToken) {
        setUserRefreshToken(tokenResponse.refreshToken);
        return getRefreshToken();
      }
    } else {
      return false;
    }
  } catch (error) {
    log.error(`Error in getUserRefreshToken: ${error}`);
    throw error;
  }
};

/**
 * Refreshes the user's authentication token.
 * Makes an HTTP POST request to the `/api/auth/token` endpoint with the user's refresh token as the payload.
 * If the request is successful and returns a status code of 200, the function updates the user's authentication token and refresh token in the local storage.
 * @returns {Promise<Object>} The response object from the HTTP POST request.
 */
export const refreshUserToken = async () => {
  try {
    log.info('Refreshing token...');
    const response = await api.post('/api/auth/token', {
      refreshToken: getRefreshToken()
    });
    if (response.status === 200) {
      log.debug('refreshUserToken success!', response);
      const { token, refreshToken } = response.data || {};
      if (token) {
        setUserAuthToken(token);
      }
      if (refreshToken) {
        setUserRefreshToken(refreshToken);
      }
      return response;
    }
  } catch (error) {
    log.error('fetchTokens failed');
    throw new Error(error);
  }
};

export const checkUserToken = async (token) => {
  return await api.get('/api/auth/user', authHeaders(token));
};
