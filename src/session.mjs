import { LocalStorage } from 'node-localstorage';

const localStorage = new LocalStorage('./.bubo');

// export const getToken = async () => {
//   return localStorage.getItem('token');
// };
//
// export const getActiveWidget = async () => {
//   return localStorage.getItem('widgetId');
// };
//
// export const getHost = async () => {
//   return localStorage.getItem('thingsBoardHost');
// };
//

export default localStorage;
