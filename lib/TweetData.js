require('./sugar-dates');

var helpers = require('./helpers.js');
var locations = require('./locations.js');

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
  var  cities, city, state, latlng = [];

  // Look for zip code in text with the format 00000-0000 or 00000.
  cities = tweet.text.match(/\d{5}(?:[-\s]\d{4})?/);

  if (cities) {
    // If a zip code is found, set it as the city.
    this.city = {value: cities[0], type: 'zip', parsed: true};
    callback(null, this.city);
  } else {
    // If no zip code is found, search the tweet more thoroughly.
    city = helpers.search(tweet.text, locations.cities);
    state = helpers.search(tweet.text, locations.states);
    
    if (city && state) {
      // If the search returns a city and state, use them.
      this.city = {value: city, type: 'name', parsed: true, state: state};
      callback(null, this.city);
    } else if (city) {
      // If the search returns a city but no state, use the city.
      this.city = {value: city, type: 'name', parsed: true};
      callback(null, this.city);
    } else if (tweet.coordinates) {
      // If the search didn't return any cities but the tweet has an exact location, send that as the city.
      latlng[0] = tweet.coordinates.coordinates[1];
      latlng[1] = tweet.coordinates.coordinates[0];
      this.city = {value: latlng, type: 'latlng', parsed: false};
      callback(null, this.city);
    } else if (tweet.place) {
      // If there is no exact location but there is a place, send the fist coordinates of the boundry as the city.
      latlng[0] = tweet.place.bounding_box.coordinates[0][0][1];
      latlng[1] = tweet.place.bounding_box.coordinates[0][0][0];
      this.city = {value: latlng, type: 'latlng', parsed: false};
      callback(null, this.city);
    } else { 
      // If there is no location information, send an error.
      this.city = null;
      callback({name: 'LocationError', message: 'No location data available.'});
    }
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