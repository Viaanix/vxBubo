import { parseJwt, refreshUserToken, checkTokenStatus, getUserRefreshToken, testAndRefreshToken, getParsedToken, refreshExpiredTokenClosure, checkUserToken } from '../api/auth.mjs';
import { api } from './api.mjs';
import { getToken, getRefreshToken, setUserAuthToken, setUserRefreshToken } from '../session.mjs';
import { logger } from '../logger.mjs';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('API Authentication Tests', () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  test('test_parseJwt', () => {
    const token = 'Bearer abc.def.ghi';
    const expectedPayload = { user: 'test' };
    const payload = parseJwt(token);
    expect(payload).toEqual(expectedPayload);
  });

  test('test_refreshUserToken', async () => {
    mock.onPost('/api/auth/token').reply(200, {
      token: 'newToken',
      refreshToken: 'newRefreshToken'
    });
    const response = await refreshUserToken();
    expect(response.status).toBe(200);
    expect(getToken()).toBe('Bearer newToken');
    expect(getRefreshToken()).toBe('newRefreshToken');
  });

  test('test_checkTokenStatus', async () => {
    mock.onGet('/api/auth/user').reply(200);
    const status = await checkTokenStatus('validToken');
    expect(status).toBe(true);
  });

  test('test_getUserRefreshToken', async () => {
    const userId = '123';
    const refreshToken = 'refreshToken123';
    mock.onGet(`/api/user/${userId}/token`).reply(200, { refreshToken });
    const result = await getUserRefreshToken('validToken');
    expect(result).toBe(refreshToken);
  });

  test('test_testAndRefreshToken', async () => {
    mock.onGet('/api/auth/user').reply(200);
    const result = await testAndRefreshToken('validToken');
    expect(result).toBe(true);
  });

  test('test_getParsedToken', () => {
    const token = 'Bearer abc.def.ghi';
    localStorage.setItem('token', token);
    const expectedPayload = { user: 'test' };
    const payload = getParsedToken();
    expect(payload).toEqual(expectedPayload);
  });

  test('test_refreshExpiredTokenClosure', async () => {
    const refreshFunction = refreshExpiredTokenClosure();
    mock.onPost('/api/auth/token').reply(200, {
      token: 'newToken',
      refreshToken: 'newRefreshToken'
    });
    const firstCall = await refreshFunction();
    const secondCall = await refreshFunction();
    expect(firstCall).toEqual(secondCall);
  });

  test('test_checkUserToken', async () => {
    mock.onGet('/api/auth/user').reply(200);
    const response = await checkUserToken('validToken');
    expect(response.status).toBe(200);
  });
});
