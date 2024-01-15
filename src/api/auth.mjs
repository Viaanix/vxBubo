import { getToken } from './../session.mjs';
import { tbHost } from '../../index.mjs';
import { checkUserToken, refreshUserToken } from './core.mjs';

export const parseJwt = (token) => {
  if (!token) return null;
  token = token.replace('Bearer', '').trim();
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
};

export const getParsedToken = (token) => {
  token = token || getToken();
  return parseJwt(token);
};

export const isTokenExpired = () => {
  const parsedToken = getParsedToken();
  if (!parsedToken) return true;
  // Fudge factor, will it expire in 5 minutes ?
  const fudge = 5 * 60;
  return (Math.round(Date.now() / 1000) + fudge) > parsedToken.exp;
};

export const checkTokenStatus = async (token) => {
  token = token || getToken();
  if (!token || !tbHost()) {
    console.debug('No Token');
    return false;
  }
  const request = await checkUserToken(token);
  // console.log(`checkTokenStatus: request =>`, request);
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
    console.log(`testAndRefreshToken test failed.`);
    return await refreshExpiredToken();
  }
  console.log(`testAndRefreshToken test passed.`);
  return true
};

// https://tanmaythole.medium.com/optimizing-token-refreshing-preventing-duplicate-api-requests-with-axios-511bde1ef676
const refreshExpiredTokenClosure = () => {
  let isCalled = false;
  let runningPromise;
  return async () => {
    if (isCalled) {
      console.log(`!!!! -- isCalled`);
      return runningPromise;
    } else {
      console.log(`!!!! -- Creating a new call`);
      isCalled = true;
      runningPromise = await refreshUserToken();
      return runningPromise;
    }
  };
};

export const refreshExpiredToken = refreshExpiredTokenClosure();
