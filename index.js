import { Command } from 'commander';
import { prompForToken, promptWidgetId } from './src/prompt.js';
import { getActiveWidget, getToken, testToken } from './src/utils.js';
import { fetchAndSaveRemoteWidget, parseWidgetExport, publishLocalWidget } from './src/package.js';

const program = new Command();
program
  .option('-h, --host <url>', 'ThingsBoard URL you wish to connect to if you opt to not set an env variable')
  .option('-w, --widget <widiget-id>', 'specify the widget you would like to work with')
  .option('-b, --bundle', 'Bundle local widget')
  .option('-g, --get', 'GET widget from ThingsBoard')
  .option('-p, --push', 'PUSH local widget ThingsBoard')
  .option('-c, --clear', 'Clear local data such as token and widget id');

program.parse();
const options = program.opts();

// Step 1 - Maintenance Options
// if (options.host){}
// if (options.bundle){}
// if (options.clear){}

// Step 2 - Get the token and test
let token = await getToken();
if (!token || !testToken(token)) {
  token = await prompForToken();
}

// Step 3 - Get the widget id
let widgetId = await getActiveWidget();
if (!widgetId || options.widget) {
  widgetId = await promptWidgetId();
}

// Step 4 - Fun Stuff
// Are we getting the widget?
if (options.get) {
  await fetchAndSaveRemoteWidget(widgetId);
  // Parse Widget Export for local development
  await parseWidgetExport(widgetId);
}

// Publish Local Widget?
if (options.push) {
  await publishLocalWidget(widgetId);
}
