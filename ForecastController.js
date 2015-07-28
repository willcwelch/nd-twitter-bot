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

  // TODO: Async waterfall.
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

// Takes TweetData location object and checks if the locationId exists in in the database.
// If the locationId isn't in the database, queries WSI, stores the location and returns the locationId.
ForecastController.prototype.getLocationId = function(location, callback) {
  var that = this;

  // TODO: Async waterfall.
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

// Takes TweetData location object and returns the location if it exists in the database.
ForecastController.prototype.getLocation = function(location, callback) {
  if (location.type === 'zip') {
    // If the value is a zip code, just pull the first result because it's a unique value.
    connection.query("SELECT * FROM locations WHERE zip_code=" + location.value, callback);
  } else if (location.type === 'latlng') {
    // If the value is coordinates, convert it to a zip code so it can be searched in the database.
    this.getZip(location.value, function (err, zip) {
      if (err) {
        callback(err);
      } else {
        connection.query("SELECT * FROM locations WHERE zip_code=" + zip, callback);
      }
    });
  } else if (location.state) {
    // If a state is specified, just pull the first result.
    connection.query("SELECT * FROM locations WHERE city='" + location.value + "' AND (state='" + 
      location.state + "' OR state_full='" + location.state + "')", callback);
  } else if (location.type === 'name') {
    // TODO: Async waterfall
    // If a state wasn't specified, try using NY. 
    connection.query("SELECT * FROM locations WHERE city='" + location.value + "' AND state='NY'", function (err, rows) {
      if (err) {
        callback(err);
      } else if (rows.length > 0) {
        callback (null, rows);
      } else {
        // If NY didn't return a result, send back any instance of the city, as long as there isn't more than one.
        // If there is no unique value, return an error.
        connection.query("SELECT * FROM locations WHERE city='" + location.value + "'", function (err, rows) {
          if (err) {
            callback(err);
          } else if (rows.length === 1) {
            callback (null, rows);
          } else if (rows.length > 1) {
            callback (new Error('Location not specific enough'));
          } else {
            callback(null, rows);
          }
        });
      }
    });
  } else {
    // If none of the above worked, it's an unrecognized type.
    callback(new Error('Location type not recognized.'));
  }
}

// Takes TweetData location object and queries WSI, adding the result to database.
ForecastController.prototype.addLocation = function(location, callback) {
  var locationValue, selectedCity, that = this;

  // Set locationValue to a string that WSI can interpret.
  if (location.type === 'zip' || location.type === 'name') {
    locationValue = location.value;
  } else if (location.type === 'latlng') {
    locationValue = location.value[0] + '/' + location.value[1];
  } else {
    callback(new Error('Location type not recognized.'));
  }

  // TODO: Async waterfall.
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

        connection.query("INSERT INTO locations (location_id, zip_code, city, state, state_full) VALUES ('" + 
          locationId + "','" + zipCode + "','" + city + "','" + state + "','" + state_full + "');", function (err, result) {
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

// Takes an array of WSI cities and a TweetData location object and returns the WSI city for the location.
ForecastController.prototype.findLocation = function (cities, location) {
  var possibleCities = [];

  if (location.state) {
    // If a state is specified, return the first result in that state.
    for (var i = 0; i < cities.length; i += 1) {
      if (cities[i].$.StateAbbr === location.state || cities[i].$.StateName === location.state) {
        return cities[i];
      }
    }
  } else if (location.type === 'name') {
    // If it's a city name but no state is specified, try returning the first result from NY.
    for (var i = 0; i < cities.length; i += 1) {
      if (cities[i].$.StateAbbr === 'NY') {
        return cities[i];
      }
    }
  } else {
    // If the above didn't work, return a result if it is the only one in the US. 
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

// Takes a locationId and queries WSI for the forecasts, adding them to memcached.
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

// Takes coordinates and sends back a postal code.
ForecastController.prototype.getZip = function(latlng, callback) {
  var zips;

  geocoder.reverseGeocode(latlng[0], latlng[1], function (err, response) {
    if (err) {
      callback(err);
    } else {
      zips = response.results[0].address_components.filter(function (value) {
        return value.types[0] === 'postal_code';
      });

      if (zips) {
        callback(null, zips[0].long_name);
      } else {
        callback(new Error('Could not find a zip code for the given coordinates.'))
      }
    }
  });
}

exports.ForecastController = new ForecastController();