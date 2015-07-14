var mysql = require('mysql'),
    Memcached = require('memcached'),
    geocoder = require('geocoder'),
    WSI = require('./WSI.js').WSI;
    config = require('./config.js').config,

var connection = mysql.createConnection(config.mysql),
    memcached = new Memcached("localhost:11211", {}),
    wsi = new WSI(config.wsi);

var ForecastController = function() {};

// Takes TweetData location object and finds the appropriate forecast in memcached.
ForecastController.prototype.getForecast = function(location, callback) {
  this.getLocationId(location, function (err, locationId) {
    if (err) {
      callback(err);
    } else {
      memcached.get("ForecastController:" + locationId, function (err, data) {
        if (err) {
          callback(err);
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
  this.getLocation(location, function (err, rows) {
    if (err) {
      callback(err);
    } else if (rows.length > 0) {
      callback(null, rows[0].location_id);
    } else {
      this.addLocation(location, function (err, data) {
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
    connection.query('SELECT * FROM twitterbot WHERE zip_code= ' + location.value, function (err, rows) {
      if (err) {
        callback(err);
      } else {
        callback (null, rows);
      }
    });
  } else if (location.type === 'latlng') {
    this.getZip(location.value, function (err, zip) {
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
}

// Takes tweetData location object and queries WSI, adding the result to database
ForecastController.prototype.addLocation = function(location, callback) {
  var locationValue;

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
      var locationId = data.Cities.City[0].$.Id,
          zipCode = data.Cities.City[0].$.PreferredZipCode,
          city = data.Cities.City[0].$.Name,
          state = data.Cities.City[0].$.StateAbbr;
          
      connection.query('INSERT INTO locations (location_id, zip_code, city, state) VALUES (' + locationId + ',' + zipCode + ',' + city + ',' + state + ');', function (err, result) {
        if (err) {
          callback(err);
        } else if (result === true) {
          callback(null, {locationId: locationId, zipCode: zipCode, city: city, state: state});
        } else {
          callback(new Error('Location could not be inserted.'));
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