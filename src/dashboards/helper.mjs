import path from 'path';
import { scratchPath } from '../../index.mjs';

export const guardRequireDashboardId = (dashboardId) => {
  if (!dashboardId) {
    throw new Error('Specify a dashboardId');
  }
};

export const dashboardJsonSourcePath = (dashboardId) => {
  // Ensure a valid dashboardId is provided
  guardRequireDashboardId(dashboardId);

  // Concatenate the scratchPath, 'dashboards' directory, and dashboardId with a '.json' extension
  const jsonPath = path.join(scratchPath, 'dashboards', `${dashboardId}.json`);
  return jsonPath;
};

// export const getLocalDashboards = async () => {
//   const dashboardFiles = await glob('**/widget.json', {
//     cwd: localWidgetPath,
//     root: ''
//   });
// };
