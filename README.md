# Bubo
![alt text](https://media.tenor.com/rhPTpks6lOoAAAAd/bubo-clockwork.gif)



```bash
vx-bubo
```

```bash
Usage: vx-bubo [options]

Your guide to develop Thingsboard Widgets locally

Options:
  -g, --get             Get widget from ThingsBoard
  -p, --push            Publish local widget ThingsBoard
  -pm, --push-multiple  Publish Multiple local widgets to ThingsBoard
  -c, --clean           Clean local data such as host, token and widget id
  -h, --help            display help for command
```


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
> Set ThingsBoard JWT token                     
  Get Widget                                    
  Publish Widget                                
  Publish Multiple Widgets                      
  Clear tokens and active widget id             
🎟️ Copy JWT token from ThingsBoard              
```

### Set ThingsBoard JWT token

```bash
? 🦉 Lets get your Thingsboard Auth Token.
    1) Login to ThingsBoard
    2) Open this URL => https://thingsboardsite.com/security
    3) Press the button "Copy JWT token" to copy the token to your clipboard
        
    Finished? (Y/n)
```

### Get Widget  
```bash
? 🦉 Would you like to get widget My Awesome Widget (00000000-0000-0000-0000-000000000000) ? (Y/n)

```

### Publish Widget    
```bash
? 🦉 Would you like to publish widget My Awesome Widget (00000000-0000-0000-0000-000000000000) ? (Y/n)

```

### Publish Multiple Widgets
```bash
? 🦉 What widgets would you like to publish? (Press <space> to select, <a> to toggle all, <i> to invert selection, and <enter> to proceed)
>(*) My Awesome Widget undefined
 (*) My Awesome Widget undefined
 ( ) PMy Awesome Widget modified: 1 day ago

```

### Clear tokens and active widget id   
