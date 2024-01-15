import axios from 'axios';

import { tbHost } from '../../index.mjs';
import { getRefreshToken, getToken, setUserAuthToken, setUserRefreshToken } from '../session.mjs';
import { mergeDeep } from '../utils/helpers.mjs';
import { getParsedToken, isTokenExpired, refreshExpiredToken } from './auth.mjs';

// const axios = require('axios').default;

const DEBUG = false;

const api = axios.create({
  baseURL: 'https://portal.vxolympus.com',
  responseType: 'json'
});

// api.interceptors.response.use(
//   response => response,
//   async (error) => {
//     const originalRequest = error.config;
//     if (error.response.status === 401) {
//       console.log('💩💩💩💩💩💩💩💩💩');
//       const updatedToken = await refreshExpiredToken();
//       originalRequest.headers.Authorization = `Bearer ${updatedToken}`;
//       return api(originalRequest);
//     }
//   }
// );

// Request Interceptor
// api.interceptors.request.use(
//   async function (config) {
//     if (DEBUG) console.log('request =>', config);
//     // Add Auth header unless the endpoint is login
//     if (!config.headers.Authorization && config.url !== '/api/auth/login') {
//       await getTokens();
//       config.headers.Authorization = `Bearer ${authToken}`;
//     }
//     // Do something before request is sent
//     return config;
//   },
//   function (error) {
//     // Do something with request error
//     return Promise.reject(error);
//   }
// );

/*
* Axios Response Interceptor
*/
api.interceptors.response.use(
  function (response) {
    if (DEBUG) console.log(response);
    return response;
  },
  async function (error) {
    const originalRequest = error.config;
    if (DEBUG) console.log(error);
    const authFailuresMessages = ['Authentication failed', 'Token has expired'];
    // If auth fails attempt to refresh the auth token or login and generate a fresh set of tokens.
    if (authFailuresMessages.includes(error.message) && error.response.status === 401) {
      console.log(`💩 Token Refresh Started - ${error.response.status}: ${error.message}`);
      const updatedToken = await refreshExpiredToken();
      originalRequest._retry = true;
      console.log('UpdatedTokenResponse =>', updatedToken, originalRequest);
      // originalRequest.headers.Authorization = `Bearer ${updatedToken}`;
      // return api(originalRequest);
    }
    return Promise.reject(error);
  }
);

// api.defaults.headers.common['Authorization'] = AUTH_TOKEN;
// api.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

// headers: { Authorization: `Bearer ${token}` }

// Add a request interceptor
// api.interceptors.request.use(
//   (response) => {
//     return response;
//   },
//
//   async (error) => {
//     const originalRequest = error.config;
//     console.log('!!! - AXIOS');
//     // logout user's session if refresh token api responds 401 UNAUTHORIZED
//     // if (error.response.status === 401 && originalRequest.url === +`${baseURL}/auth/token`) {
//     //   // clearLocalStorage();
//     //   // axiosInstance.defaults.headers = {};
//     //   // window.location.href = "/login";
//     //   return Promise.reject(error);
//     // }
//
//     // if request fails with 401 UNAUTHORIZED status and 'Token has expired' as response message
//     // then it calls the api to generate new access token
//     //
//     //
//     // if (error.response.data.message === 'Token has expired' && error.response.status === 401) {
//     //   console.log('AXIOS REFRESH TOKEN');
//     //   // const updatedToken = await refreshExpiredToken();
//     //   // originalRequest.headers.Authorization = `Bearer ${updatedToken}`;
//     //   return api(originalRequest);
//     // }
//
//     return Promise.reject(error);
//   });

// @see https://axios-http.com/docs/cancellation
// const controller = new AbortController();

// const requests = {
//   get: (url: string) => api.get(url).then(responseBody),
//   post: (url: string, body: {}) => api.post(url, body).then(responseBody),
//   put: (url: string, body: {}) => api.put(url, body).then(responseBody),
//   delete: (url: string) => api.delete(url).then(responseBody),
// };

// class ResponseError extends Error {
//   constructor (message, res) {
//     super(message);
//     this.response = res;
//   }
// }

const authHeaders = (token) => {
  return {
    headers: {
      Authorization: token || getToken()
    }
  };
};
//
const jsonContentHeaders = () => {
  return {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  };
};
// export const fetchWithAuthHandler = async ({ url, params = [], method = 'GET', token }) => {
//   // if (isTokenExpired(token)) {
//   //   console.log('Token is expired, refreshing..');
//   //   await refreshExpiredToken();
//   // }
//
//   params = [...params, authHeaders(token)];
//   return await fetchHandler(url, params, method);
// };
// export const fetchHandler = async (url, params = [], method = 'GET') => {
//   // Check if the token is expired or will expire soon refresh token.
//
//   params = mergeDeep(...params, { method });
//   // console.log('fetchHandler: params => ', params);
//
//   // const apiCall = async (url, params) => {
//   //   return await fetch(url, { ...params });
//   // };
//
//   try {
//     // console.log('fetchHandler: url => ', url, params);
//     const request = await fetch(url, { ...params });
//     if (!request.ok) {
//       if (request.status === 401) {
//         console.log('401, attempting to refresh');
//         const refresh = await refreshUserToken();
//         console.log('fetchHandler refresh', refresh);
//         // TODO: update auth token in params
//         // retry api call
//         // return
//       }
//       throw new ResponseError('Bad fetch response', request);
//     }
//     return request;
//     // const response = await request.json();
//   } catch (err) {
//     if (err instanceof ResponseError) {
//       // Handle known errors
//       console.log('ResponseError => ', err);
//     } else {
//       // Handle unexpected errors
//       console.log('Unknown => ', err);
//     }
//     // switch (err.request.status) {
//     //   case 400: /* Handle */ break;
//     //   case 401: /* Handle */ break;
//     //   case 404: /* Handle */ break;
//     //   case 500: /* Handle */ break;
//     // }
//   // Handle the error
//   }
//   // return request;
// };

// Api Endpoint Calls
export const getUserRefreshToken = async (token) => {
  const parsedToken = getParsedToken(token);
  const userId = parsedToken?.userId;
  if (userId) {
    const tokenRequest = await api.get(`/api/user/${userId}/token`);
    const tokenResponse = tokenRequest.data;
    console.log('getUserRefreshToken =>', tokenResponse);
    if (tokenResponse?.refreshToken) {
      setUserRefreshToken(tokenResponse.refreshToken);
      return getRefreshToken();
    }
  } else {
    return false;
  }
};

export const refreshUserToken = async () => {
  console.log('refreshing token...');

  const fetchTokens = await api.post('/api/auth/token', {
    refreshToken: getRefreshToken()
  });

  if (fetchTokens.status === 200) {
    const response = fetchTokens.data;
    console.log('refreshUserToken success!', fetchTokens, response);
    if (response?.token) {
      setUserAuthToken(response.token);
    }
    if (response?.refreshToken) {
      setUserRefreshToken(response.refreshToken);
    }
  } else {
    console.log('fetchTokens failed', fetchTokens);
  }
  return fetchTokens;
};

export const checkUserToken = async (token) => {
  return await api.get('/api/auth/user', authHeaders(token));
};

export const getWidgetByID = async (widgetId) => {
  return await api.get(`/api/widgetType/${widgetId}`);
};

export const publishWidget = async (widgetJson) => {
  return await api.post('/api/widgetType', { body: widgetJson });
};
