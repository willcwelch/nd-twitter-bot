require('./sugar-dates');

var AlchemyAPI = require('alchemyapi_node');
var alchemyapi = new AlchemyAPI();

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
  var  cities, states, latlng = [], that = this;

  // Look for zip code in text with the format 00000-0000 or 00000.
  cities = tweet.text.match(/\d{5}(?:[-\s]\d{4})?/);

  if (cities) {
    // If a zip code is found, set it as the city.
    this.city = {value: cities[0], type: 'zip', parsed: true};
    callback(null, this.city);
  } else {
    // If a zip code isn't found, try to find a city and state in the text using AlchemyAPI.
    alchemyapi.entities('text', tweet.text, {}, function (response) {
      if (response.status === 'OK') {
        cities = response.entities.filter(function (value) {
          return value.type === 'City';
        });
        states = response.entities.filter(function (value) {
          return value.type === 'StateOrCounty';
        });
      } else {
        cities = [];
      }

      if (cities.length > 0) {
        // If there are cities from Alchemy API, return the first city and state.
        that.city = {value: cities[0].text, type: 'name', parsed: true};
        if (states.length > 0) {
          that.city.state = states[0].text;
        }
        callback(null, that.city);
      } else if (tweet.coordinates) {
        // If there are no cities from AlchemyAPI but the tweet has an exact location, send that as the city.
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
  var date, cleanedString;

  // Removes zip codes in the format 00000-0000 or 00000 for date parsing.
  cleanedString = tweet.text.replace(/\d{5}(?:[-\s]\d{4})?/, '');

  // Try to create a date from the tweet text using Sugar's loose date parsing.
  // TODO: add functionality for recognizing morning, afternoon, night, evening, etc for times.
  date = Date.create(cleanedString, true);

  if (isNaN(date.valueOf())) {
    date = new Date(tweet.created_at);
    this.date = {value: date, parsed: false};  
  } else {
    this.date = {value: date, parsed: true};
  } 
}

exports.TweetData = TweetData;