import path from 'path';
import fs from 'node:fs';
import { finished } from 'stream/promises';
import { fileURLToPath } from 'url';
import {
  authFetch,
  createFile,
  formatJson,
  getLocalFile,
  getToken,
  getWidgetDevPaths,
  getWidgetLocal,
  validatePath
} from './utils.js';
import 'dotenv/config';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootProjectPath = path.join(__dirname, '../');
const localWidgetPath = path.join(rootProjectPath, 'widgets');
const scratchPath = path.join(rootProjectPath, '.scratch');

export const widgetJsonPath = (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }

  return path.join(scratchPath, 'widgets', `${widgetId}.json`);
};

export const fetchAndSaveRemoteWidget = async (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }

  const apiUrl = `${process.env.THINGSBOARD_URL}/api/widgetType/${widgetId}`;
  const request = await authFetch(apiUrl);

  if (request.ok) {
    await validatePath(path.join(scratchPath, 'widgets'));
    const stream = fs.createWriteStream(widgetJsonPath(widgetId));
    await finished(fs.ReadStream.fromWeb(request.body).pipe(stream));
  } else {
    const response = await request.json();
    throw Error(response.message);
  }
};

export const parseWidgetExport = async (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
  const widgetJson = await getWidgetLocal(widgetJsonPath(widgetId));
  const widgetPath = path.join(localWidgetPath, widgetJson.name);

  await validatePath(widgetPath);

  const widgetFilePaths = await getWidgetDevPaths(widgetPath, widgetJson.alias);

  // Create local widget files
  await createFile(widgetFilePaths.js, widgetJson.descriptor?.controllerScript);
  await createFile(widgetFilePaths.html, widgetJson.descriptor?.templateHtml);
  await createFile(widgetFilePaths.css, widgetJson.descriptor.templateCss);
};

export const publishLocalWidget = async (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
  let widgetJson = await getWidgetLocal(widgetJsonPath(widgetId));
  const widgetPath = path.join(localWidgetPath, widgetJson.name);

  const widgetFilePaths = await getWidgetDevPaths(widgetPath, widgetJson.alias);

  // console.log('widgetFilePaths =>', widgetFilePaths);

  // Update JSON
  widgetJson.descriptor.controllerScript = await getLocalFile(widgetFilePaths.js);
  widgetJson.descriptor.templateHtml = await getLocalFile(widgetFilePaths.html);
  widgetJson.descriptor.templateCss = await getLocalFile(widgetFilePaths.css);

  widgetJson = formatJson(widgetJson);

  const url = `${process.env.THINGSBOARD_URL}/api/widgetType`;
  const params = {
    headers: {
      Authorization: await getToken(),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: widgetJson
  };
  const request = await fetch(url, { ...params });
  const response = await request.json();

  // Backup current widget
  fs.copyFileSync(widgetJsonPath(widgetId), path.join(scratchPath, 'widgets', `${widgetId}.json.bak`));

  // Update Local Widget Export
  await createFile(widgetJsonPath(widgetId), widgetJson);
};
