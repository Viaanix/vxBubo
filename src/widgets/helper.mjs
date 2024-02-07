import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { compareDesc } from 'date-fns';
import { localWidgetPath, scratchPath } from '../../index.mjs';
import { checkPath, getLocalFile } from '../utils.mjs';
import { getWidgetTenant } from './api.mjs';
import { logger } from '../logger.mjs';

const log = logger.child({ prefix: 'widget-helper' });

export const guardRequireWidgetId = (widgetId) => {
  if (!widgetId) {
    throw new Error('Specify a widgetId');
  }
};

export const widgetJsonSourcePath = (widgetId) => {
  guardRequireWidgetId(widgetId);
  return path.join(scratchPath, 'widgets', `${widgetId}.json`);
};

export const getWidgetLocal = async (widgetPath) => {
  const widgetJsonRaw = await getLocalFile(widgetPath);
  return JSON.parse(widgetJsonRaw);
};

export const getBundleAliasFromWidgetJson = async (widgetJson) => {
  if (widgetJson?.bundleAlias) {
    return widgetJson.bundleAlias;
  } else {
    const fqnChunk = widgetJson.fqn.split('.');
    if (fqnChunk.length < 2) {
      console.log(widgetJson.tenantId.id);
      log.error(`Cannot find bundleAlias ${widgetJson.tenantId.id}`);
      const tenantInfo = await getWidgetTenant(widgetJson.tenantId.id);
      log.error(`Cannot find bundleAlias but found tenantName ${tenantInfo.data.name}`);
      // console.log('tenantInfo =>', tenantInfo);
      return tenantInfo.data.name;
    }
    log.info(`widgetJSON fqn: ${widgetJson.fqn} bundleAlias: ${fqnChunk[0]} alias: ${fqnChunk[1]}`);
    return fqnChunk[0];
  }
};

export const getAliasFromWidgetJson = (widgetJson) => {
  if (widgetJson?.alias) {
    return widgetJson.alias;
  } else {
    const fqnChunk = widgetJson.fqn.split('.');
    return fqnChunk[1] || fqnChunk[0];
  }
};

// export const discoverLocalWidgetJsons = async () => {
//   const widgetJsonDir = path.join(scratchPath, 'widgets');
//   const localWidgets = [];
//
//   try {
//     await Promise.all(
//       fs.readdirSync(widgetJsonDir).map(async (file) => {
//         if (!file.includes('bak')) {
//           const fileExt = path.extname(file);
//           const widgetJsonSourcePath = path.join(widgetJsonDir, file);
//
//           if (fileExt === '.json') {
//             const widgetJson = await getWidgetLocal(widgetJsonSourcePath);
//             const bundleAlias = getBundleAliasFromWidgetJson(widgetJson);
//             const widgetPath = path.join(localWidgetPath, bundleAlias, widgetJson.name);
//             const stats = fs.statSync(widgetJsonSourcePath);
//             const payload = {
//               name: widgetJson.name,
//               id: file.split('.')[0],
//               jsonPath: widgetJsonSourcePath,
//               widgetPath,
//               modified: stats.mtime
//             };
//             localWidgets.push(payload);
//           }
//         }
//       })
//     );
//   } catch (error) {
//     // console.log('Error =>', error);
//   }
//   return localWidgets;
// };

export const discoverLocalWidgets = async () => {
  const widgetFiles = await glob('**/widget.json', {
    cwd: localWidgetPath,
    root: ''
  });

  let localWidgets = await Promise.all(
    widgetFiles.map(async (widget) => {
      const widgetJsonPath = path.join(localWidgetPath, widget);
      const widgetJson = await getWidgetLocal(widgetJsonPath);
      const referenceJsonPath = path.join(scratchPath, 'widgets', `${widgetJson.protected.id.id}.json`);
      const widgetPathChunk = widget.replace('/widget.json', '');
      const widgetPath = path.join(localWidgetPath, widgetPathChunk);
      const stats = fs.statSync(referenceJsonPath);
      return {
        name: widgetJson.name,
        id: widgetJson.protected.id.id,
        jsonPath: widgetJsonPath,
        widgetPath,
        modified: stats.mtime,
        assetsModified: await findModifiedAgo(widgetPath)
      };
    })
  );
  // Remove ignored widgets. TODO: Improve this so it clear to the user these were ignored.
  localWidgets = localWidgets.filter((widget) => widget?.assetsModified && widget?.assetsModified !== 'ignore');
  return localWidgets.sort((a, b) => compareDesc(a.assetsModified, b.assetsModified));
};

export const findModifiedAgo = async (widgetPath) => {
  if (await checkPath(widgetPath)) {
    let recentlyModified;
    const widgetFiles = await fs.readdirSync(widgetPath, { recursive: true });
    for (const widgetAsset of widgetFiles) {
      if (widgetAsset === '.ignore') return 'ignore';
      const widgetAssetPath = path.join(widgetPath, widgetAsset);
      const stats = fs.statSync(widgetAssetPath);
      // console.log(widgetAsset, stats.mtime);
      if (stats.mtime > recentlyModified || !recentlyModified) {
        recentlyModified = stats.mtime;
      }
    }
    return recentlyModified;
  }
};

// TODO: DONE NEED DIS
// export const findLocalWidgetsWithModifiedAssets = async () => {
//   // const localWidgets = await discoverLocalWidgetJsons();
//   const localWidgets = await discoverLocalWidgets();
//
//   if (localWidgets.length === 0) {
//     console.log('Nada');
//     return;
//   }
//   return await Promise.all(
//     localWidgets.map(async (widget) => {
//       if (await checkPath(widget.widgetPath)) {
//         const widgetFiles = await fs.readdirSync(widget.widgetPath, { recursive: true });
//         for (const widgetAsset of widgetFiles) {
//           const widgetAssetPath = path.join(widget.widgetPath, widgetAsset);
//           const stats = fs.statSync(widgetAssetPath);
//           if (stats.mtime > widget.modified) {
//             if (stats.mtime > widget.assetsModified || !widget.assetsModified) widget.assetsModified = stats.mtime;
//           }
//         }
//       }
//       return widget;
//     })
//   );
// };
