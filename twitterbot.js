(function() {
  
  var Twit = require('twit'),
      TweetData = require('./TweetData.js').TweetData,
      forecastController = require('./ForecastController.js').ForecastController,
      config = require('./config.js').config;
  
  // Set the user ID for the account we're tweeting from.
  var userId = 3331300337;

  var twitter = new Twit(config.twitter);


  /*
  // Connect to Twitter and look for tweets inlcuding '@welch_test'.
  var stream = twitter.stream('statuses/filter', {track: '@welch_test'});
  
  // Handle the tweet if one comes through on the stream.
  stream.on('tweet', function (tweet) {
  	// Check if the tweet was sent from the current acount, or if the account was only mentioned.
    if (tweet.in_reply_to_user_id !== userId && tweet.user.id !== userId) {
      console.log('Mentioned or my own tweet: ', tweet.text);
    // Check if the tweet is about weather.
    } else if (/weather/i.test(tweet.text) || /forecast/i.test(tweet.text)) {
      console.log('Tweet about weather.');
    // If the tweet was a reply but we don't know what it's about, ignore it.
    } else {
      console.log('Not sure what this is about.');
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

  */

})();