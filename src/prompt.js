import prompts from 'prompts';
import clipboard from 'clipboardy';
import localStorage from './session.js';
import 'dotenv/config';

export const prompForToken = async () => {
  await prompts({
    type: 'confirm',
    name: 'token',
    message: `Please press "Copy JWT token" on ThingsBoard click => ${process.env.THINGSBOARD_URL}/security. Done?`
  });
  const input = clipboard.readSync();
  // TODO: Test token
  localStorage.setItem('token', input);
  return localStorage.getItem('token');
};

export const promptWidgetId = async () => {
  const questions = [
    {
      type: 'text',
      name: 'widgetId',
      message: 'What is the widget bundle id you would like to work on?'
    }
  ];
  const response = await prompts(questions);
  if (response) {
    localStorage.setItem('widgetId', response.widgetId);
  }

  return localStorage.getItem('widgetId') || null;
};

// export const promptPublishLocalWidgets = async () => {
//   const questions = [
//     {
//       type: 'multiselect',
//       name: 'publishWidigetIds',
//       choices: [
//
//       ],
//       message: 'What is the widget bundle id you would like to work on?'
//     }
//   ];
//   const response = await prompts(questions);
//   if (response) {
//     localStorage.setItem('widgetId', response.widgetId);
//   }
//
//   return localStorage.getItem('widgetId') || null;
// };
