import * as p from '@clack/prompts';

// const group = await p.group(
//   {
//     name: () => p.text({ message: 'What is your name?' }),
//     age: () => p.text({ message: 'What is your age?' }),
//     color: ({ results }) =>
//       p.multiselect({
//         message: `What is your favorite color ${results.name}?`,
//         options: [
//           { value: 'red', label: 'Red' },
//           { value: 'green', label: 'Green' },
//           { value: 'blue', label: 'Blue' },
//         ],
//       }),
//   },
//   {
//     // On Cancel callback that wraps the group
//     // So if the user cancels one of the prompts in the group this function will be called
//     onCancel: ({ results }) => {
//       p.cancel('Operation cancelled.');
//       process.exit(0);
//     },
//   }
// );

// p.intro(`🦉 Bubo`);

const mainMenu = await p.select({
  message: '🦉 What would you like to do?',
  options: [
    { value: 'token', label: 'Set ThingsBoard JWT token', hint: '🎟️ Copy JWT token from ThingsBoard' },
    { value: 'widget', label: 'Widgets', hint: '⚡️ Get widget(s) from ThingsBoard using the widgetId' },
    { value: 'widget_bundle', label: 'Widget Bundle', hint: '' },
    { value: 'data_convertes', label: 'Data Converters', hint: '' },
    { value: 'dashboard', label: 'Dashboard', hint: '' },
    { value: 'rule_chain', label: 'Rule Chain', hint: '' }
  ],
  state: 'inactive'
});

const tokenMenu = async () => {
  return await p.confirm({
    message: 'Do you want to continue?'
  });
};
const widgetMenu = async () => {
  const widgetRootMenu = await p.select({
    message: 'What would you like to do?',
    options: [
      { value: 'bundle', label: 'Bundle' },
      { value: 'create', label: 'Create' },
      { value: 'download', label: 'Download' },
      { value: 'publish', label: 'Publish' },
      { value: 'sync', label: 'Sync' }
    ]
  });
  const bundleMenu = async () => {
    return await p.select({
      message: 'Bundle Menu?',
      options: [
        {
          value: 'bundle',
          label: 'Bundle'
        },
        {
          value: 'create',
          label: 'Create'
        },
        {
          value: 'download',
          label: 'Download'
        },
        {
          value: 'publish',
          label: 'Publish'
        },
        {
          value: 'sync',
          label: 'Sync'
        }
      ]
    });
  };
  const createMenu = async () => {
    return async () => {
      return await p.select({
        message: 'Create Menu?',
        options: [
          {
            value: 'bundle',
            label: 'Bundle'
          },
          {
            value: 'create',
            label: 'Create'
          },
          {
            value: 'download',
            label: 'Download'
          },
          {
            value: 'publish',
            label: 'Publish'
          },
          {
            value: 'sync',
            label: 'Sync'
          }
        ]
      });
    };
  };
  const downloadMenu = async () => {
    return await p.select({
      message: 'Download Menu?',
      options: [
        {
          value: 'bundle',
          label: 'Bundle'
        },
        {
          value: 'create',
          label: 'Create'
        },
        {
          value: 'download',
          label: 'Download'
        },
        {
          value: 'publish',
          label: 'Publish'
        },
        {
          value: 'sync',
          label: 'Sync'
        }
      ]
    });
  };
  const publishMenu = async () => {
    return await p.select({
      message: 'Publish Menu?',
      options: [
        {
          value: 'bundle',
          label: 'Bundle'
        },
        {
          value: 'create',
          label: 'Create'
        },
        {
          value: 'download',
          label: 'Download'
        },
        {
          value: 'publish',
          label: 'Publish'
        },
        {
          value: 'sync',
          label: 'Sync'
        }
      ]
    });
  };
  const syncMenu = async () => {
    return await p.select({
      message: 'Sync Menu?',
      options: [
        {
          value: 'bundle',
          label: 'Bundle'
        },
        {
          value: 'create',
          label: 'Create'
        },
        {
          value: 'download',
          label: 'Download'
        },
        {
          value: 'publish',
          label: 'Publish'
        },
        {
          value: 'sync',
          label: 'Sync'
        }
      ]
    });
  };

  switch (widgetRootMenu) {
    case 'bundle':
      await bundleMenu();
      break;
    case 'create':
      await createMenu();
      break;
    case 'download':
      await downloadMenu();
      break;
    case 'publish':
      await publishMenu();
      break;
    case 'sync':
      await syncMenu();
      break;
    default:
  }
};

const widgetBundleMenu = await p.group({});
const dashboardMenu = await p.group({});
const dataConvertersMenu = await p.group({});
const ruleChainMenu = await p.group({});

const showMenu = async (menu) => {
  switch (menu) {
    case 'token':
      return await tokenMenu();
      break;
    case 'widget':
      return await widgetMenu();
      break;
    default:
  }
};

// const mainMenu = await p.group(
//   {
//     token: () => p.text({}),
//     widget: () => p.text({}),
//     widgetBundle: () => p.text({}),
//     dashboard: () => p.text({}),
//     rulechain: () => p.text({}),
//   }
// );

const startCliMenu = async () => {
  const task = await mainMenu;
  await showMenu(task);
};

await startCliMenu();

if (p.isCancel()) {
  p.cancel('Operation cancelled.');
  process.exit(0);
}

// console.log(group.name, group.age, group.color);
