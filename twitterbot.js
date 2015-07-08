(function() {
  
  // Import the necessary modules.
  require('./lib/sugar-dates');
  var Twit = require('twit'),
      Geocoder = require('geocoder'),
      AlchemyAPI = require('alchemyapi_node'),
      MySQL = require('mysql'),
      TwitKey = require('twit/api_key'),
      config = require("./config.js").config;
  
  // Set the user ID for the account we're tweeting from.
  var userId = 3331300337;

  // Instantiate Twit, AlchemyAPI and MySQL
  var twitter = new Twit(TwitKey),
      alchemyapi = new AlchemyAPI(),
      connection = MySQL.createConnection(config.mysql);

  // Connect to Twitter and look for tweets inlcuding '@welch_test'.
  var stream = twitter.stream('statuses/filter', {track: '@welch_test'});
  
  // Handle the tweet if one comes through on the stream.
  stream.on('tweet', function (tweet) {

  	// Check if the tweet was sent from the current acount, or if the account was only mentioned.
    if (tweet.in_reply_to_user_id !== userId && tweet.user.id !== userId) {
      console.log('Mentioned or my own tweet: ', tweet.text);
    // Check if the tweet is about weather.
    } else if (/weather/i.test(tweet.text) || /forecast/i.test(tweet.text)) {
      // Create an object with the data from the tweet.
      var tweetData = Object.create(TweetData);
      tweetData.constructor(tweet, function (err, response) {

        // Handle any errors from creating the data object.
        if (err) {
          console.log(err.message);
        } else {

          // Extract a zip code.
          ForecastController.getZip(response.city, function (err, response) {

            // Handle any errors from exptracting the zip code.
            if (err) {
              console.log(err);
            // Log the zip code.
            } else {
              console.log(response);
            }

          });

        }

      });
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

  // Object that takes a tweet and parses out the data we need in a useable format.
  var TweetData = {

    // Takes a tweet and extracts the text, date and location.
    constructor: function(tweet, callback) {
      var that = this;

      this.text = tweet.text;
      this.setDate(tweet);
      this.setCity(tweet, function(err, response) {

        // Send an error if a location couldn't be found.
        if (err) {
          callback(err);
        // If all is well, send back the newly constructed object.
        } else {
          callback(null, that);
        }

      });
    },

    // Sets 'city' to {[value], [type], [parsed]}.
    setCity: function(tweet, callback) {
      var  cities, latlng = [], that = this;

      // Look for zip code in text with the format 00000-0000 or 00000.
      cities = tweet.text.match(/^\d{5}(?:[-\s]\d{4})?/);

      // If a zip code is found, set it as the city.
      if (cities) {
        this.city = {value: cities[0], type: 'zip', parsed: true};
        callback(null, this.city);
      // If a zip code isn't found, try to find a city in the text using AlchemyAPI.
      } else {
        alchemyapi.entities('text', tweet.text, {}, function (response) {
          
          // If AlchemyAPI sends an error, make the cities array empty.
          if (response.status === 'ERROR') {
            cities = [];
          // If AlchemyAPI sends a response, filter it for entities that are cities and add them to the cities array.
          // TODO: add State abbreviation if it exists. Try NY if it doesn't exist.
          } else if (response.status === 'OK') {
            cities = response.entities.filter(function (value) {
              return value.type === 'City';
            });
          }

          // If there are cities from Alchemy API, send the first result.
          if (cities.length > 0) {
            that.city = {value: cities[0].text, type: 'name', parsed: true};
            callback(null, that.city);
          // If there are no cities from AlchemyAPI but the tweet has a location, send that as the city.
          } else if (tweet.coordinates !== null) {
            // Since Twitter returns coordinates as an array in the format [lng,lat], reorder it to [lat,lng].
            latlng[0] = tweet.coordinates.coordinates[1];
            latlng[1] = tweet.coordinates.coordinates[0];
            that.city = {value: latlng, type: 'latlng', parsed: false};
            callback(null, that.city);
          // If there is no location information, send an error.
          } else { 
            that.city = null;
            callback(new Error('No location data available.'));
          }
          
        });
      }

    },

    // Sets 'date' to {[value], [parsed]}
    setDate: function(tweet) {
      var date;

      // Try to create a date from the tweet text using Sugar's loose date parsing.
      // TODO: add functionality for recognizing morning, afternoon, night, evening, etc for times.
      date = Date.create(tweet.text, true);

      // If Sugar couldn't create a date, set the date to the time the tweet was sent.
      if (isNaN(date.valueOf())) {
        date = new Date(tweet.created_at);
        this.date = {value: date, parsed: false};  
      // If Sugar did create a date, set it as the date value. 
      } else {
        this.date = {value: date, parsed: true};
      } 

    },

    // Logs the data properties
    printValues: function() {
      console.log(this.city, this.date, this.text);
    }
  }

  // Object that takes tweet data and uses it to pull a forecast from memcached.
  var ForecastController = {

    getForecast: function(location, callback) {
      this.getLocationId(location, function (err, locationId) {
        if (err) {
          callback(err);
        } else {
          // search memcached
        }
      });
    },

    getLocationId: function(location, callback) {
      this.getLocation(location, function (err, rows) {
        if (err) {
          callback(err);
        } else if (rows.length > 0) {
          callback(null, rows[0].location_id);
        } else {
          // add the new location id
        }
      });
    },

    getLocation: function(location, callback) {
      if (location.type === 'zip') {
        connection.query('SELECT * FROM twitterbot WHERE zip_code= ' + location.value, function (err, rows) {
          if (err) {
            callback(err);
          } else {
            callback (null, rows);
          }
        }
      } else if (location.type === 'latlng') {
        this.getZip(location, function (err, zip) {
          if (err) {
            callback(err);
          } else {
            connection.query('SELECT * FROM twitterbot WHERE zip_code= ' + zip, function (err, rows) {
              if (err) {
                callback(err);
              } else {
                callback(null, rows);
              }
            });
          }
        });
      } else if (location.type === 'name') {
        connection.query('SELECT * FROM twitterbot WHERE city= ' + location.value, function (err, rows) {
          if (err) {
            callback(err);
          } else {
            callback(null, rows);
          }
        });
      } else {
        callback(new Error('Location type not recognized.'));
      }
    },

    // Takes tweet data and sends back a postal code
    getZip: function(location, callback) {
      var zips, latlng, name;

      // If the data type is alread a zip code, send that.
      if (location.type === 'zip') {
        callback(null, location.value);
      // If the data type is a latitude and longitude, let Geocoder parse it.
      } else if (location.type === 'latlng') {
        latlng = location.value;
        // Send the latituted and longitude to Google through Geocoder.
        Geocoder.reverseGeocode(latlng[0], latlng[1], function (err, response) {
          
          // If Google sends an error, return the error.
          if (err) {
            callback(err);
          // If Google sends a response, filter it for a postal code.
          } else {
            zips = response.results[0].address_components.filter(function (value) {
              return value.types[0] === 'postal_code';
            });

            // If there are postal codes, send the first one.
            if (zips) {
              callback(null, zips[0].long_name);
            // If there are no postal codes, send an error.
            } else {
              callback(new Error('Could not find a zip code.'))
            }
          }

        });
      // If the data type is the name of a city, try very hard to turn it into a postal code.
      } else if (location.type === 'name') {
        name = location.value;
        // Geocode the name to a latitude and longitude to make it easier to pull a specific postal code.
        Geocoder.geocode(name, function (err, response) {
          
          // If Google sends back an error, return the error.
          if (err) {
            callback(err);
          // If Google sends a response, extract the latitude and longitude.
          } else {
            latlng = [];
            latlng[0] = response.results[0].geometry.location.lat;
            latlng[1] = response.results[0].geometry.location.lng;

            // Send the latituted and longitude to Google through Geocoder.
            Geocoder.reverseGeocode(latlng[0], latlng[1], function (err, response) {
            
              // If Google sends an error, return the error.
              if (err) {
                callback(err);
              // If Google sends a response, filter it for a postal code.
              } else {
                zips = response.results[0].address_components.filter(function (value) {
                  return value.types[0] === 'postal_code';
                });

                // If there are postal codes, send the first one.
                if (zips) {
                  callback(null, zips[0].long_name);
                // If there are no postal codes, send an error.
                } else {
                  callback(new Error('Could not find a zip code.'))
                }

              }

            });
          }

        });
      // If the data is a type we don't recognize, send an error.
      } else {
        callback(new Error('Location type not recognized.'));
      }
    }
  }

})();