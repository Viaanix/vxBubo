
export const getWidgetByID = async (widgetId) => {
  return await instance.get(`/widgetType/${widgetId}`);
};

export const publishWidget = async (widgetJson) => {
  return await instance.post('/widgetType', { body: widgetJson });
};
