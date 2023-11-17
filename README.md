# Bubo
![alt text](https://media.tenor.com/rhPTpks6lOoAAAAd/bubo-clockwork.gif)



```bash
vx-bubo
```

```bash
bubo --help 

Usage: bubo [options]

Your guide to develop Thingsboard Widgets locally

Options:
  -h, --host <url>           ThingsBoard URL you wish to connect to if you opt to not set an env variable
  -w, --widget <widiget-id>  specify the widget you would like to work with
  -g, --get                  GET widget from ThingsBoard
  -p, --push                 PUSH local widget ThingsBoard
  -c, --clean                Clean local data such as host, token and widget id
  --help                     display help for command
```


## Configure

1) Create a file in the root of your project named `bubo.config.js` with the following:
```json
{
  "thingsBoardHost": "http://127.0.0.1:8080",
  "widgetWorkingDirectory": "widgets"
}
```
