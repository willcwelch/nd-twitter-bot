var request = require('request'),
    xml2js = require('xml2js').parseString,
    async = require('async');

// Takes a config object and uses it configure endpoint settings for WSI.
var WSI = function(config) {
  this.LocationEndpoint = 'http://' + config.address + '/' + config.version + '/' + config.serviceId + '/Locations/Cities/';
  this.WeatherEndpoint = 'http://' + config.address + '/' + config.version + '/' + config.serviceId + '/Weather/Report/';
}

// Constructs a WSI location endpoint and makes a request.
WSI.prototype.getLocation = function(location, callback) {
  this.wsiRequest(this.LocationEndpoint + location, callback);
}

// Constructs a WSI weather endpoint and makes a request.
WSI.prototype.getWeather = function(locationId, callback) {
  this.wsiRequest(this.WeatherEndpoint + locationId, callback);
}

// Uses an endpoint for WSI to make a request and parse it into JSON.
WSI.prototype.wsiRequest = function(endpoint, callback) {
  async.waterfall([
    function (cb) {
      request(endpoint, cb);
    },
    function (response, body, cb) {
      if (response.statusCode === 200) {
        xml2js(body, cb);
      } else {
        callback(new Error("Response status: " + response.statusCode));
      }
    }
  ], function (err, result) {
    if (err) {
      callback(err);
    } else {
      callback(null, result);
    }
  });
}

exports.WSI = WSI;