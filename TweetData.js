require('./lib/sugar-dates');

var AlchemyAPI = require('alchemyapi_node');

var alchemyapi = new AlchemyAPI();

var TweetData = function(tweet, callback) {
  var that = this;

  console.log(tweet);

  this.text = tweet.text;
  this.sender = tweet.user.screen_name;
  this.setDate(tweet);
  this.setCity(tweet, function (err, response) {

    // Send an error if a location couldn't be found.
    if (err) {
      callback(err);
    // If all is well, send back the newly constructed object.
    } else {
      callback(null, that);
    }

  });
};

// Sets 'city' to {[value], [type], [parsed]}.
TweetData.prototype.setCity = function(tweet, callback) {
  var  cities, latlng = [], that = this;

  // Look for zip code in text with the format 00000-0000 or 00000.
  cities = tweet.text.match(/\d{5}(?:[-\s]\d{4})?/);

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
      // If there are no cities from AlchemyAPI but the tweet has an exact location, send that as the city.
      } else if (tweet.coordinates) {
        // Since Twitter returns coordinates as an array in the format [lng,lat], reorder it to [lat,lng].
        latlng[0] = tweet.coordinates.coordinates[1];
        latlng[1] = tweet.coordinates.coordinates[0];
        that.city = {value: latlng, type: 'latlng', parsed: false};
        callback(null, that.city);
      // If there is no exact location from Twitter but there is a place, send the fist coordinate of the boundry as the city.
      } else if (tweet.place) {
        latlng[0] = tweet.place.bounding_box.coordinates[0][0][1];
        latlng[1] = tweet.place.bounding_box.coordinates[0][0][0];
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
TweetData.prototype.setDate = function(tweet) {
  var date, cleanedString;

  // Clean zip codes for date parsing.
  cleanedString = tweet.text.replace(/\d{5}(?:[-\s]\d{4})?/, '');

  // Try to create a date from the tweet text using Sugar's loose date parsing.
  // TODO: add functionality for recognizing morning, afternoon, night, evening, etc for times.
  date = Date.create(cleanedString, true);

  // If Sugar couldn't create a date, set the date to the time the tweet was sent.
  if (isNaN(date.valueOf())) {
    date = new Date(tweet.created_at);
    this.date = {value: date, parsed: false};  
  // If Sugar did create a date, set it as the date value. 
  } else {
    this.date = {value: date, parsed: true};
  } 
}

exports.TweetData = TweetData;