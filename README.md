# Bubo
![alt text](https://media.tenor.com/rhPTpks6lOoAAAAd/bubo-clockwork.gif)



```bash
vx-bubo
```

```bash
Usage: vx-bubo [options]

Your guide to develop Thingsboard Widgets locally

Options:
  -g, --get                 Get widget from ThingsBoard
  -p, --push                Publish local widgets to ThingsBoard
  -pm, --publish-modified   Publish all modified local widgets to ThingsBoard
  -c, --clean               Clean local data such as host, token and widget id
  -h, --help                display help for command
```

## Overview 
Bubo is a CLI tool to help you develop Thingsboard Widgets locally by downloading a widget and working with it locally in your IDE of choice and publishing back to ThingsBoard.

## Warning
This tool is in early development and is not ready for production use. Use at your own risk. Currently, I am focused on feature implementation to help my daily workflow and there are very little guard rails but as my needs are meet will focus on documentation, tests and error handling.   


## Configure

1) Create a file in the root of your project named `bubo.config.js` with the following:
```json
{
  "thingsBoardHost": "http://127.0.0.1:8080",
  "widgetWorkingDirectory": "widgets"
}
```

## Menu Options
```bash
? 🦉 What would you like to do? (Use arrow keys)
❯ Set ThingsBoard JWT token
  Get Widget Interactive
  Get Widget Sources
  Publish Widgets
  Publish Modified Widgets
🎟️ Copy JWT token from ThingsBoard        
```

### Set ThingsBoard JWT token
```bash
? 🦉 Lets get your Thingsboard Auth Token.
    1) Login to ThingsBoard
    2) Open this URL => https://www.mythingsboardsite.com/security
    3) Press the button "Copy JWT token" to copy the token to your clipboard
        
    Finished? (Y/n)
```

This will allow you to set your ThingsBoard JWT token in the config file. This token will be used to authenticate with ThingsBoard and will automatically manage the token refresh.


### Get Widget  
```bash
? 🦉 How would you like to GET a widget? (Use arrow keys)
❯ Last Widget (00000000-0000-0000-0000-000000000000)
  By widgetId
  From Bundle
💾 Use the widgetId of the previous GET
```
Download a local widget for development. This will create a directory in the `widgetWorkingDirectory` named after the widget and download the widget files into that directory.


### Publish Widget    
```bash
? 🦉 Would you like to publish widget My Awesome Widget (00000000-0000-0000-0000-000000000000) ? (Y/n)
```
Package and publish a widget to ThingsBoard. This will create a new widget json and publish it to ThingsBoard.


### Publish Multiple Widgets
```bash
? 🦉 What widgets would you like to publish? (Press <space> to select, <a> to toggle all, <i> to invert selection, and <enter> to proceed)
>(*) My Awesome Widget undefined
 (*) My Awesome Widget undefined
 ( ) PMy Awesome Widget modified: 1 day ago

```


### Publish Modified Widgets
Bubo will look for any widget that has a modification after the last published timestamp and publish it to ThingsBoard. This is useful if you have multiple widgets and want to publish all the modified widgets at once.


### Clear tokens and active widget id   
Cleanup local Bubo files.

Currently not implemented.
