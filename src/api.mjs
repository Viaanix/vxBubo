import { tbHost } from '../index.mjs';
import { getToken } from './session.mjs';

// const authFetch = async (url, token) => {
//   const authHeader = {
//     headers: {
//       Authorization: token || await getToken()
//     }
//   };
//   return fetch(url, { ...authHeader });
// };

export const postWidgetToTb = async (widgetJson) => {
  const url = `${tbHost()}/api/widgetType`;
  const params = {
    headers: {
      Authorization: getToken(),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: widgetJson
  };
  const request = await fetch(url, { ...params });
  await request.json();
};
