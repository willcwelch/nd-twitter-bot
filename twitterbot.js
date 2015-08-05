(function() {

  require('./lib/sugar-dates');
  
  var Twit = require('twit'),
      async = require('async'),
      TweetData = require('./lib/tweetdata.js').TweetData,
      weatherBot = require('./lib/weatherbot/weatherbot.js').WeatherBot,
      config = require('./config.js').config;
  
  var userId = 3331300337; // The user ID for the account we're tweeting from.
  var twitter = new Twit(config.twitter);
  var stream = twitter.stream('statuses/filter', {track: '@welch_test'});
  
  // Handle the tweet if one comes through on the stream.
  stream.on('tweet', function (tweet) {

    if (tweet.in_reply_to_user_id !== userId && tweet.user.id !== userId) {
      // Log if the tweet was sent from the current acount, or if the account was only mentioned.
      console.log('Mentioned or my own tweet: ', tweet.text);

    } else if (/weather/i.test(tweet.text) || /forecast/i.test(tweet.text)) {
      // Handle the tweet if it is about weather.
      async.waterfall([
        function (cb) {
          new TweetData(tweet, cb);
        },
        function (result, cb) {
          weatherBot.getTweet(result, cb);
        }
      ], function (err, response) {
        if (err && err.name === 'LocationError') {
          sendTweet('@' + tweet.user.screen_name + ' Sorry, I could not get a location. Try using a ZIP code.');
        } else if (err) {
          console.log(err);
        } else {
          sendTweet(response);
        }
      });

    } else {
      // If the tweet was a reply but we don't know what it's about, ignore it.
      sendTweet('@' + tweetData.sender + ' Sorry, I don’t understand. Try asking me about the weather.');
    }
  });

  // Log if Twitter sends an error.
  stream.on('error', function (error) {
    console.log('Whoops, there was a problem: ', error.message);
  });

  // Log if the Twitter rate limit is reached.
  stream.on('limit', function (limitMessage) {
  	console.log('Hmmm, looks like we are violating the rate limit: ', limitMessage);
  });
  
  // Log if Twitter disconnects.
  stream.on('disconnect', function (disconnectMessage) {
  	console.log('We were disconnected: ', disconnectMessage);
  });
  
  // Log attempts to reonnect to Twitter.
  stream.on('reconnect', function (request, response, connectInterval) {
    console.log('Trying to reconnect');
    console.log('Request: ', request);
    console.log('Response: ', response);
  });

  // Takes a string and tweets it.
  function sendTweet (message) {
    message = message.slice(0, message.lastIndexOf('.', 140)+1);
    console.log(message);
    /*
    twitter.post('statuses/update', {status: message}, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log('Tweet sent.');
      }
    });
  */
  }

})();