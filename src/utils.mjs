import path from 'path';
import fs from 'fs';
import { getToken } from './session.mjs';
import { tbHost, scratchPath, localWidgetPath } from '../index.mjs';
import { checkUserToken } from './api/core.mjs';
import { checkTokenStatus } from './api/auth.mjs';

// export const authHeaders = (token) => {
//   return {
//     headers: {
//       Authorization: token || getToken()
//     }
//   };
// };
//
// export const fetchHandler = async (url, params = {}) => {
//   // Check if the token is expired or will expire soon refresh token.
//   if (isTokenExpired()) {
//     console.log('Token is expired, refreshing..');
//     await refreshToken();
//   }
//   // TODO : Improve this.
//   const auth = authHeaders();
//   if (params?.headers) {
//     params.headers = { ...auth.headers, ...params?.headers };
//   } else {
//     params.headers = { ...auth.headers };
//   }
//   return await fetch(url, { ...params });
// };

// export const parseJwt = (token) => {
//   if (!token) return null;
//   token = token?.replace('Bearer', '').trim();
//   return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
// };

// const getParsedToken = (token) => {
//   token = token || getToken();
//   return parseJwt(token);
// };

// export const isTokenExpired = () => {
//   const parsedToken = getParsedToken();
//   if (!parsedToken) return true;
//   // Fudge factor, will it expire in 5 minutes ?
//   const fudge = 5 * 60;
//   return (Math.round(Date.now() / 1000) + fudge) > parsedToken.exp;
// };

// // TODO: Dont like this.. there has to be a better way
// let tokenRefreshInProgress = false;
// let activeTokenRefresh = false;

// export const refreshToken = async () => {
//   if (tokenRefreshInProgress) {
//     console.log('token refresh in progress, returning active token refresh');
//     return activeTokenRefresh;
//   } else {
//     console.log('Lets Refresh the token!');
//     activeTokenRefresh = refreshUserToken();
//     return activeTokenRefresh;
//   }
// };

// export const refreshUserToken = async () => {
//   console.log('refreshing token...');
//   tokenRefreshInProgress = true;
//   const params = {
//     headers: {
//       Authorization: getToken(),
//       Accept: 'application/json',
//       'Content-Type': 'application/json'
//     },
//     method: 'POST',
//     body: JSON.stringify({
//       refreshToken: getRefreshToken()
//     })
//   };
//   const request = await fetch(`${tbHost()}/api/auth/token`, { ...params });
//   if (request.status === 200) {
//     const response = await request.json();
//     if (response.token) {
//       localStorage.setItem('token', `Bearer ${response.token}`);
//     }
//     if (response.refreshToken) {
//       localStorage.setItem('refreshToken', response.refreshToken);
//     }
//   }
//   tokenRefreshInProgress = false;
//   // TODO: refactor anything that calls this to not use the return and call local storage.
//   return getToken();
// };

// export const getUserRefreshToken = async () => {
//   const parsedToken = getParsedToken();
//   const tokenRequest = await fetch(`${tbHost()}/api/user/${parsedToken.userId}/token`, { ...authHeaders() });
//   const tokenResponse = await tokenRequest.json();
//   if (tokenResponse.refreshToken) {
//     localStorage.setItem('refreshToken', tokenResponse.refreshToken);
//   }
// };

// // TODO: rename
// export const validToken = async (token) => {
//   return await checkTokenStatus(token);
// };

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

export const discoverLocalWidgetJsons = async () => {
  const widgetJsonDir = path.join(scratchPath, 'widgets');
  const localWidgets = [];

  await Promise.all(
    fs.readdirSync(widgetJsonDir).map(async (file) => {
      if (!file.includes('bak')) {
        const fileExt = path.extname(file);
        const widgetJsonPath = path.join(widgetJsonDir, file);

        if (fileExt === '.json') {
          const widgetJson = await getWidgetLocal(widgetJsonPath);
          const widgetPath = path.join(localWidgetPath, widgetJson.name);
          const stats = fs.statSync(widgetJsonPath);
          const payload = {
            name: widgetJson.name,
            id: file.split('.')[0],
            jsonPath: widgetJsonPath,
            widgetPath,
            modified: stats.mtime
          };
          localWidgets.push(payload);
        }
      }
    })
  );
  return localWidgets;
};

export const findLocalWidgetsWithModifiedAssets = async () => {
  const localWidgets = await discoverLocalWidgetJsons();

  return await Promise.all(
    localWidgets.map(async (widget) => {
      const widgetPath = path.join(localWidgetPath, widget.name);
      if (await checkPath(widgetPath)) {
        const widgetFiles = await fs.readdirSync(widgetPath, { recursive: true });

        for (const widgetAsset of widgetFiles) {
          const widgetAssetPath = path.join(widgetPath, widgetAsset);
          const stats = fs.statSync(widgetAssetPath);

          if (stats.mtime > widget.modified) {
            if (stats.mtime > widget.assetsModified || !widget.assetsModified) widget.assetsModified = stats.mtime;
          }
        }
      }
      return widget;
    })
  );
};
