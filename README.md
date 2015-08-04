# nd-twitter-bot
A multi-functional Twitter bot. Install using `npm install`.

## TwitterBot Credentials
To add your Twitter credentials, create a file named `config.js` in the main directory with the following format:

```
exports.config = {
  twitter: {
    consumer_key: YOUR_KEY_HERE,
    consumer_secret: YOUR_SECRET_HERE,
    access_token: YOUR_TOKEN_HERE,
    access_token_secret: YOUR_TOKEN_SECRET_HERE
  }
}
```

## WeatherBot Credentials
To add your MySQL and WSI credentials, create a file named `config.js` in the weatherbot directory with the following format:

```
exports.config = {
  mysql: {
    user: YOUR_USER_HERE,
    password: YOUR_PASSWORD_HERE,
    database: YOUR_DATABASE_HERE,
    host: YOUR_HOST_HERE,
    port: YOUR_PORT_HERE
  },
  wsi: {
    address: YOUR_ADDRESS_HERE,
    version: YOUR_VERSION_HERE,
    serviceId: YOUR_SERVICE_ID_HERE
  }
}
```
