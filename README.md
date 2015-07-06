# nd-twitter-bot
A multi-functional Twitter bot. Install using `npm Install`.

## API Keys
Both Twitter and AlchemyAPI require API keys. AlchemyAPI will automatically prompt you for a key. To add your Twitter credentials, create a file in the Twit module named `api_key.js` with the following format:

```
module.exports = {
  consumer_key:     'YOUR_KEY_HERE',
  consumer_secret:    'YOUR_KEY_HERE',
  access_token:     'YOUR_KEY_HERE',
  access_token_secret:  'YOUR_KEY_HERE'
};
```
