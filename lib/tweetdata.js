require('./sugar-dates');

var helpers = require('./helpers.js'),
    async = require('async'),
    locations = require('./locations.js');

// Takes a tweet object from Twitter and pulls useful properties into a new object.
var TweetData = function(tweet, callback) {
  var that = this;

  this.text = tweet.text;
  this.sender = tweet.user.screen_name;
  this.setDate(tweet);
  this.setCity(tweet, function (err, response) {
    // Return an error if a location couldn't be found. Otherwise, return the data object. 
    if (err) {
      callback(err);
    } else {
      callback(null, that);
    }
  });
};

// Sets 'city' to {[value], [type], [parsed], [state]}.
TweetData.prototype.setCity = function(tweet, callback) {
  var  cities, latlng = [], that = this;

  // Look for zip code in text with the format 00000-0000 or 00000.
  cities = tweet.text.match(/\d{5}(?:[-\s]\d{4})?/);

  if (cities) {
    // If a zip code is found, set it as the city.
    this.city = {value: cities[0], type: 'zip', parsed: true};
    callback(null, this.city);
  } else {
    // If no zip code is found, search the tweet more thoroughly.
    async.parallel([
      function (cb) {
        helpers.search(tweet.text, locations.cities, cb);
      },
      function (cb) {
        helpers.search(tweet.text, locations.states, cb);
      }
    ], function (err, results) {
      var city = results[0];
      var state = results[1];

      if (city && state) {
        // If the search returns a city and state, use them.
        that.city = {value: city, type: 'name', parsed: true, state: state};
        callback(null, that.city);
      } else if (city) {
        // If the search returns a city but no state, use the city.
        that.city = {value: city, type: 'name', parsed: true};
        callback(null, that.city);
      } else if (tweet.coordinates) {
        // If the search didn't return any cities but the tweet has an exact location, send that as the city.
        latlng[0] = tweet.coordinates.coordinates[1];
        latlng[1] = tweet.coordinates.coordinates[0];
        that.city = {value: latlng, type: 'latlng', parsed: false};
        callback(null, that.city);
      } else if (tweet.place) {
        // If there is no exact location but there is a place, send the fist coordinates of the boundry as the city.
        latlng[0] = tweet.place.bounding_box.coordinates[0][0][1];
        latlng[1] = tweet.place.bounding_box.coordinates[0][0][0];
        that.city = {value: latlng, type: 'latlng', parsed: false};
        callback(null, that.city);
      } else { 
        // If there is no location information, send an error.
        that.city = null;
        callback({name: 'LocationError', message: 'No location data available.'});
      }
    });
  }
}

// Sets 'date' to {[value], [parsed]}
TweetData.prototype.setDate = function(tweet) {
  var date, timeOfDay, cleanedString;

  // Remove zip codes in the format 00000-0000 or 00000 for date parsing.
  cleanedString = tweet.text.replace(/\d{5}(?:[-\s]\d{4})?/, '');
  // Replace 'today' with 'now' to avoid the data appearing in the past.
  cleanedString = cleanedString.replace(/\btoday\b/i, 'now');

  // Try to create a date from the tweet text using Sugar's loose date parsing.
  date = Date.future(cleanedString, true);
  // Match times of day that Sugar doesn't handle.
  timeOfDay = cleanedString.match(/(\bmidnight\b)|(\bmorning\b)|(\bnoon\b)|(\bafternoon\b)|(\bevening\b)|(\bnight\b)/i);

  if (isNaN(date.valueOf()) && timeOfDay) {
    date = new Date(tweet.created_at);
    date = this.setTimeOfDay(date, timeOfDay[0]);
    this.date = {value: date, parsed: true};  
  } else if (isNaN(date.valueOf())) {
    date = new Date(tweet.created_at);
    this.date = {value: date, parsed: false}; 
  } else {
    if (timeOfDay) {
      date = this.setTimeOfDay(date, timeOfDay[0]);
    }
    this.date = {value: date, parsed: true};
  }

  console.log(date);
}

// Takes a date and time of day and returns a date adjusted to the given time.
TweetData.prototype.setTimeOfDay = function(date, timeOfDay) {
  switch (timeOfDay.toLowerCase()) {
    case 'midnight': return date.set({hour: 0, minute: 0, second: 0}); break;
    case 'morning': return date.set({hour: 8, minute: 0, second: 0}); break;
    case 'noon': return date.set({hour: 12, minute: 0, second: 0}); break;
    case 'afternoon': return date.set({hour: 16, minute: 0, second: 0});break;
    case 'night': return date.set({hour: 20, minute: 0, second: 0}); break;
    case 'evening': return date.set({hour: 20, minute: 0, second: 0}); break;
    default: return date; break;
  }
}

exports.TweetData = TweetData;