(function() {
  
  // modules
  require('./lib/sugar-dates');

  var Twit = require('twit');
  var Geocoder = require('geocoder');
  var AlchemyAPI = require('alchemyapi_node');
  var TwitKey = require('twit/api_key');
  
  // config vars
  var userId = 3331300337;

  // setup
  var twitter = new Twit(TwitKey);
  var alchemyapi = new AlchemyAPI();
  // Connect to Twitter and look for tweets inlcuding '@welch_test'
  var stream = twitter.stream('statuses/filter', {track: '@welch_test'});
  
  stream.on('tweet', function (tweet) {
  	// Log if it was sent from the current acount, or if the account was only mentioned
    if (tweet.in_reply_to_user_id !== userId && tweet.user.id !== userId) {
      console.log('Mentioned or my own tweet: ', tweet.text);
    } else {

      if (/weather/i.test(tweet.text) || /forecast/i.test(tweet.text)) {
        var tweetData = Object.create(TweetData);
        tweetData.constructor(tweet, function (err, response) {

          if (err) {
            console.log(err.message);
          } else {
            ForecastController.getZip(response, function (err, response) {
              if (err) {
                console.log(err);
              } else {
                console.log(response);
              }
            });
          }

        });
      } else {
        console.log('Not sure what this is about.');
      }

    }
  });

  // Log if there is an error
  stream.on('error', function (error) {
    console.log('Whoops, there was a problem: ', error.message);
  });

  // Log if the Twitter rate limit is reached
  stream.on('limit', function (limitMessage) {
  	console.log('Hmmm, looks like we are violating the rate limit: ', limitMessage);
  });
  
  // Log if Twitter disconnects
  stream.on('disconnect', function (disconnectMessage) {
  	console.log('We were disconnected: ', disconnectMessage);
  });
  
  // Log attempts to reonnect
  stream.on('reconnect', function (request, response, connectInterval) {
    console.log('Trying to reconnect');
    console.log('Request: ', request);
    console.log('Response: ', response);
  });

  var TweetData = {
    constructor: function(tweet, callback) {
      var that = this;

      this.text = tweet.text;
      this.setDate(tweet);
      this.setCity(tweet, function(err, response) {

        if (err) {
          callback(err, that);
        } else {
          callback(null, that);
        }

      });
    },

    // Sets 'city' to {[value], [type], [parsed]}
    setCity: function(tweet, callback) {
      var  cities, that = this;

      // look for zip code in the format 00000-0000 or 00000
      cities = tweet.text.match(/^\d{5}(?:[-\s]\d{4})?/);

      if (cities) {
        this.city = {value: cities[0], type: 'zip', parsed: true};
        callback(null, this.city);
      } else {
        alchemyapi.entities('text', tweet.text, {}, function (response) {
          
          if (response.status === 'ERROR') {
            cities = [];
          } else if (response.status === 'OK') {
            // Filter for the entities that are cities.
            cities = response.entities.filter(function (value) {
              return value.type === 'City';
            });
          }

          if (cities.length > 0) {
            that.city = {value: cities[0].text, type: 'name', parsed: true};
          } else if (tweet.coordinates !== null) {
            that.city = {value: tweet.coordinates.coordinates, type: 'latlon', parsed: false};
          } else { 
            that.city = null;
            callback(new Error('No location data available.'));
          }

          callback(null, that.city);
        });
      }

    },

    // Sets 'date' to {[value], [parsed]}
    setDate: function(tweet) {
      var date;

      date = Date.create(tweet.text, true);

      if (isNaN(date.valueOf())) {
        date = new Date(tweet.created_at);
        this.date = {value: date, parsed: false};   
      } else {
        this.date = {value: date, parsed: true};
      } 

    },

    printValues: function() {
      console.log(this.city, this.date, this.text);
    }
  }

  var ForecastController = {
    getZip: function(data, callback) {
      var zip, zips, latlon, name;

      if (data.city.type === 'zip') {
        callback(null, data.city.value);
      } else if (data.city.type === 'latlon') {
        latlon = data.city.value;
        Geocoder.reverseGeocode(latlon[1], latlon[0], function (err, response) {
          
          if (err) {
            callback(err);
          } else {
            zips = response.results[0].address_components.filter(function (value) {
              return value.types[0] === 'postal_code';
            });
            callback(null, zips[0].long_name);
          }

        });
      } else if (data.city.type === 'name') {
        name = data.city.value;
        Geocoder.geocode(name, function (err, response) {
          
          if (err) {
            callback(err);
          } else {
            latlon = [];
            latlon[0] = response.results[0].geometry.location.lat;
            latlon[1] = response.results[0].geometry.location.lng;

            Geocoder.reverseGeocode(latlon[0], latlon[1], function (err, response) {
            
              if (err) {
                callback(err);
              } else {
                zips = response.results[0].address_components.filter(function (value) {
                  return value.types[0] === 'postal_code';
                });
                callback(null, zips[0].long_name);
              }

            });
          }

        });
      } else {
        callback(new Error('Location type not recognized.'));
      }
    }
  }

})();