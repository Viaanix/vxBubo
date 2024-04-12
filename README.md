# vx-bubo

![alt text](https://media.tenor.com/rhPTpks6lOoAAAAd/bubo-clockwork.gif)

# Table of Contents

1. [Warning](#warning)
1. [Configure](#configure)
1. [Using Bubo](#using-bubo)
   - [Menu Options](#menu-options)
1. [Widget File Structure](#widget-file-structure)
1. [widget.json](#widget.json)
1. [Ignore widget changes](#ignore-widget-changes)

## Overview

Bubo is a CLI tool to help you develop Thingsboard Widgets locally by downloading a widget and working with it locally in your IDE of choice and publishing back to ThingsBoard.

## ⚠️ Warning

This tool is in early development and is not ready for production use. Use at your own risk. Currently, I am focused on feature implementation to help my daily workflow and there are very little guard rails but as my needs are meet will focus on documentation, tests and error handling.

## Configure

You can manually configure bubo using the following or run `npx vx-bubo -s` fore the walkthough setup.

### Manual

1. Create a file in the root of your project named `bubo.config.js` with the following:

```json
{
  "thingsBoardHost": "http://127.0.0.1:8080",
  "widgetWorkingDirectory": "widgets"
}
```

1. Add the following to your .gitignore `.bubo/*` to prevent commiting the local working directory

## Using Bubo

```bash
Usage: vx-bubo [options]

Your guide to develop Thingsboard locally

Options:
  -g,   --get                 Get widget(s)
  -p,   --push                Publish local widget(s)
  -pm,  --publish-modified    ⚠️ Publish all modified local widgets
  -sync --sync-widgets        Retrieve Remote Widget Sources
  -s,   --setup               Run the vx-bubo setup
  -h,   --help                display help for command
```

### Menu Options

- [vx-bubo](#vx-bubo)
- [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [⚠️ Warning](#️-warning)
  - [Configure](#configure)
    - [Manual](#manual)
  - [Using Bubo](#using-bubo)
    - [Menu Options](#menu-options)
      - [Set ThingsBoard JWT token](#set-thingsboard-jwt-token)
      - [Create Widget](#create-widget)
      - [Get Widget(s)](#get-widgets)
      - [Publish Widgets](#publish-widgets)
      - [Publish Multiple Widgets](#publish-multiple-widgets)
      - [Publish Modified Widgets](#publish-modified-widgets)
      - [Sync Widget Sources](#sync-widget-sources)
      - [Bundle Local Widget](#bundle-local-widget)
      - [~~Data Converters~~](#data-converters)
      - [~~Rule Chain~~](#rule-chain)
      - [~~Dashboard~~](#dashboard)
      - [~~Cleanup~~](#cleanup)
    - [Widget File Structure](#widget-file-structure)
    - [widget.json](#widgetjson)
    - [Ignore widget changes](#ignore-widget-changes)

#### Set ThingsBoard JWT token

```bash
? 🦉 Lets get your Thingsboard Auth Token.
    1) Login to ThingsBoard
    2) Open this URL => https://www.mythingsboardsite.com/security
    3) Press the button "Copy JWT token" to copy the token to your clipboard

    Finished? (Y/n)
```

This will allow you to set your ThingsBoard JWT token in the config file. This token will be used to authenticate with ThingsBoard and will automatically manage the token refresh.

#### Create Widget

```bash
? 🦉 Select a Widget Bundle
 - Tenant Bundles -------
❯ Bubo Test
  Demo Bundle
 - System Bundles -------
  Air quality (system)
  Alarm widgets (system)
(Use arrow keys to reveal more choices)
```

1. First select the bundle to create a widget
1. Enter the name for the new widget
1. The select the type of widget to create
   - [Time Series](https://thingsboard.io/docs/user-guide/ui/widget-library/#time-series)
   - [Latest Values](https://thingsboard.io/docs/user-guide/ui/widget-library/#latest-values)
   - [Contol Widget](https://thingsboard.io/docs/user-guide/ui/widget-library/#control-widget)
   - [Alarm Widget](https://thingsboard.io/docs/user-guide/ui/widget-library/#alarm-widget)
   - [Static Widget](https://thingsboard.io/docs/user-guide/ui/widget-library/#static)
1. Select `y` if you would like to download and start development of this new widget

#### Get Widget(s)

```bash
? 🦉 How would you like to GET a widget? (Use arrow keys)
❯ Last Widget (00000000-0000-0000-0000-000000000000)
  By widgetId
  From Widget Bundle
💾 Use the widgetId of the previous GET
```

Download a local widget for development. This will create a directory in the `widgetWorkingDirectory` named after the widget and download the widget files into that directory.

#### Publish Widgets

```bash
? 🦉 Would you like to publish widget My Awesome Widget (00000000-0000-0000-0000-000000000000) ? (Y/n)
```

Package and publish a widget to ThingsBoard. This will create a new widget json and publish it to ThingsBoard.

#### Publish Multiple Widgets

```bash
? 🦉 What widgets would you like to publish? (Press <space> to select, <a> to toggle all, <i> to invert selection, and <enter> to proceed)
 - Modified Widgets -------
>(*) My Awesome Widget1 modified: about 1 hour ago
 (*) My Awesome Widget2 modified: 6 days ago
- Widgets -------
 ( ) My Awesome Widget3

```

#### Publish Modified Widgets

Bubo will look for any widget that has a modification after the last published timestamp and publish it to ThingsBoard. This is useful if you have multiple widgets and want to publish all the modified widgets at once.

#### Sync Widget Sources

#### Bundle Local Widget

#### ~~Data Converters~~

`Currently not implemented.`

#### ~~Rule Chain~~

`Currently not implemented.`

#### ~~Dashboard~~

`Currently not implemented.`

#### ~~Cleanup~~

Cleanup local Bubo files.

`Currently not implemented.`

### Widget File Structure

- 📁 widgets (specified in bubo [configuration](#configure) file)
  - 📁 Tenant Bundle/Bundle Name/System
    - 📁 Widget Name
      - 📁 actions
        - 📁 actionCellButton
          - 📄 [Action Name].js
          - 📄 [Action Name].html
          - 📄 [Action Name].css
          - 📄 showWidgetActionFunction.js [optional]
        - 📁 headerButton
          - 📄 [Action Name].js
          - 📄 [Action Name].html
          - 📄 [Action Name].css
          - 📄showWidgetActionFunction.js [optional]
      - 📄 [widget_fqn].js
      - 📄 [widget_fqn].html
      - 📄 [widget_fqn].css
      - 📄 widget.json
      - 📄 settingsSchema.json [optional]
      - 📄 dataKeySettingsSchema.json [optional]

### widget.json

The widget.json is a modified version of the widget source from ThingsBoard. Any changes to this file will be included in the json payload sent to ThingsBoards when publishing or bundling.

`⚠️ Warning`
The following keys have been moved to a protected key to prevent making changes that could break the widget.

- id
- createdTime
- tenantId
- descriptor.defaultConfig

### Ignore widget changes

If you would like to ignore changes to a local widget create an empty file `.ignore` in the root of the widget
