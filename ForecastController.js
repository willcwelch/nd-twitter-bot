var mysql = require('mysql'),
    Memcached = require('memcached'),
    geocoder = require('geocoder'),
    WSI = require('./WSI.js').WSI;
    config = require('./config.js').config;

var connection = mysql.createConnection(config.mysql),
    memcached = new Memcached("localhost:11211", {}),
    wsi = new WSI(config.wsi);

var ForecastController = function() {};

// Takes TweetData location object and finds the appropriate forecast in memcached.
ForecastController.prototype.getForecast = function(location, callback) {
  var that = this;

  this.getLocationId(location, function (err, locationId) {
    if (err) {
      callback(err);
    } else {
      memcached.get("ForecastController:" + locationId, function (err, data) {
        if (err) {
          callback(err);
        } else if (!data) {
          that.addForecast(locationId, callback);
        } else {
          callback(null, data);
        }
      });
    }
  });
}

// Takes tweetData location object and checks if the locationId exists in in the database.
// If the locationId isn't in the database, queries WSI, stores the location and returns the locationId.
ForecastController.prototype.getLocationId = function(location, callback) {
  var that = this;

  this.getLocation(location, function (err, rows) {
    if (err) {
      callback(err);
    } else if (rows.length > 0) {
      callback(null, rows[0].location_id);
    } else {
      that.addLocation(location, function (err, data) {
        if (err) {
          callback(err);
        } else {
          callback(null, data.locationId);
        }
      });
    }
  });
}

ForecastController.prototype.getLocation = function(location, callback) {
  if (location.type === 'zip') {
    connection.query("SELECT * FROM locations WHERE zip_code=" + location.value, callback);
  } else if (location.type === 'latlng') {
    this.getZip(location.value, function (err, zip) {
      if (err) {
        callback(err);
      } else {
        connection.query("SELECT * FROM locations WHERE zip_code=" + zip, callback);
      }
    });
  } else if (location.state) {
    connection.query("SELECT * FROM locations WHERE city='" + location.value + "' AND (state='" + location.state + "' OR state_full='" + location.state + "')", callback);
  } else if (location.type === 'name') {
    connection.query("SELECT * FROM locations WHERE city='" + location.value + "' AND state='NY'", function (err, rows) {
      if (err) {
        callback(err);
      } else if (rows.length > 0) {
        callback (null, rows);
      } else {
        connection.query("SELECT * FROM locations WHERE city='" + location.value + "'", function (err, rows) {
          if (err) {
            callback(err);
          } else if (rows.length === 1) {
            callback (null, rows);
          } else if (rows.length > 1) {
            callback (new Error('Location not specific enough'));
          } else {
            callback(err, rows);
          }
        });
      }
    });
  } else {
    callback(new Error('Location type not recognized.'));
  }
}

// Takes tweetData location object and queries WSI, adding the result to database
ForecastController.prototype.addLocation = function(location, callback) {
  var locationValue, selectedCity, that = this;

  if (location.type === 'zip' || location.type === 'name') {
    locationValue = location.value;
  } else if (location.type === 'latlng') {
    locationValue = location.value[0] + '/' + location.value[1];
  } else {
    callback(new Error('Location type not recognized.'));
  }

  wsi.getLocation(locationValue, function (err, data) {
    if (err) {
      callback(err);
    } else {

      selectedCity = that.findLocation(data.Cities.City, location);

      if (selectedCity) {
        var locationId = selectedCity.$.Id,
            zipCode = selectedCity.$.PreferredZipCode,
            city = selectedCity.$.Name,
            state = selectedCity.$.StateAbbr;
            state_full = selectedCity.$.StateName;

        connection.query("INSERT INTO locations (location_id, zip_code, city, state, state_full) VALUES ('" + locationId + "','" + zipCode + "','" + city + "','" + state + "','" + state_full + "');", function (err, result) {
          if (err) {
            callback(err);
          } else {
            callback(null, {locationId: locationId, zipCode: zipCode, city: city, state: state, state_full: state_full});
          }
        });
      } else {
        callback(new Error('Location not specific enough'));
      }
    }
  });
}

// Takes an array of WSI cities and a TweetData location object and returns the WPI City for the location.
// Only returns a city for the "name" type if there is also a state, the name exists in NY, or there is only one in the United States.
// Only returns a city for the "latlon" and "zip" types if is only one result and it is in the United States.
ForecastController.prototype.findLocation = function (cities, location) {
  var possibleCities = [];

  if (location.state) {
    for (var i = 0; i < cities.length; i += 1) {
      if (cities[i].$.StateAbbr === location.state || cities[i].$.StateName === location.state) {
        return cities[i];
      }
    }
  } else if (location.type === 'name') {
    for (var i = 0; i < cities.length; i += 1) {
      if (cities[i].$.StateAbbr === 'NY') {
        return cities[i];
      }
    }
  } else {
    for (var i = 0; i < cities.length; i += 1) {
      if (cities[i].$.CountryFips === 'US') {
        possibleCities.push(cities[i]);
      }
    }

    if (possibleCities.length === 1) {
      return possibleCities[0];
    } else {
      return null;
    }
  }
}

ForecastController.prototype.addForecast = function (locationId, callback) {
  wsi.getWeather(locationId, function (err, data) {
    if (err) {
      callback(err);
    } else {
      var hourlyForecasts = [],
          dailyForecasts = [];

      var hourlyData = data.Cities.City[0].HourlyForecast[0].Hour,
          dailyData = data.Cities.City[0].DailyForecast[0].Day,
          city = data.Cities.City[0].$.Name + ', ' + data.Cities.City[0].$.StateAbbr;

      for (var i = 0; i < hourlyData.length; i += 1) {
        hourlyForecasts.push({
          city: city,
          time: hourlyData[i].$.ValidDateLocal,
          temperature: hourlyData[i].$.TempF,
          sky: hourlyData[i].$.SkyLong
        });
      }
      for (var i = 0; i < dailyData.length; i += 1) {
        dailyForecasts.push({
          city: city,
          time: dailyData[i].$.ValidDateLocal,
          forecast: dailyData[i].$.PhraseDay
        });
      }

      var forecast = {hourlyForecasts: hourlyForecasts, dailyForecasts: dailyForecasts};

      memcached.add("ForecastController:" + locationId, forecast, 60 * 60, function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null, forecast);
        }
      });
    }
  });
}

// Takes latlng array and sends back a postal code
ForecastController.prototype.getZip = function(latlng, callback) {
  var zips;

  // Send the latituted and longitude to Google through geocoder.
  geocoder.reverseGeocode(latlng[0], latlng[1], function (err, response) {
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

exports.ForecastController = new ForecastController();