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
