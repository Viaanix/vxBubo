import { api, authHeaders } from './api.mjs';
import { tbHost } from '../../index.mjs';
import { getToken, getRefreshToken, setUserAuthToken, setUserRefreshToken } from '../session.mjs';
import { logger } from '../logger.mjs';

const log = logger.child({ prefix: 'api-auth' });

export const parseJwt = (token) => {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
};

export const getParsedToken = (token) => {
  token = token || getToken();
  return parseJwt(token.replace('Bearer', '').trim());
};

// https://tanmaythole.medium.com/optimizing-token-refreshing-preventing-duplicate-api-requests-with-axios-511bde1ef676
const refreshExpiredTokenClosure = () => {
  let isCalled = false;
  let runningPromise;
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

export const testAndRefreshToken = async (token) => {
  token = token || getToken();
  const tokenTest = await checkTokenStatus(token);
  if (!tokenTest) {
    log.info('testAndRefreshToken test failed.');
    return await refreshExpiredToken();
  }
  log.info('testAndRefreshToken test passed.');
  return true;
};

// Api Endpoint Calls
export const getUserRefreshToken = async (token) => {
  const parsedToken = getParsedToken(token);
  const userId = parsedToken?.userId;
  log.debug(`parsedToke => ${parsedToken}`);
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
};

export const refreshUserToken = async () => {
  log.info('refreshing token...');
  try {
    const response = await api.post('/api/auth/token', {
      refreshToken: getRefreshToken()
    });
    if (response.status === 200) {
      log.debug('refreshUserToken success!', response, response);
      // log.debug('refreshUserToken success!', response, response);
      if (response.data?.token) {
        setUserAuthToken(response.data.token);
      }
      if (response.data?.refreshToken) {
        setUserRefreshToken(response.data.refreshToken);
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
