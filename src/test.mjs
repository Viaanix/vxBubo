import { fetchHandler } from './api.mjs';

const payload = {
  headers: {
    Penis: 'application/json'
  },
  method: 'POST',
  body: 'asasdasdasd'
};
fetchHandler('/api', payload);
