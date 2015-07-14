var request = require('request'),
    xml2js = require('xml2js').parseString,
    async = require('async');

var WSI = function(config) {
  this.LocationEndpoint = 'http://' + config.address + '/' + config.version + '/' + config.serviceId + '/Locations/Cities/';
  this.WeatherEndpoint = 'http://' + config.address + '/' + config.version + '/' + config.serviceId + '/Weather/Report/';
}

WSI.prototype.getLocation = function(location, callback) {
  this.wsiRequest(this.LocationEndpoint + location, callback);
}

WSI.prototype.getWeather = function(locationId, callback) {
  this.wsiRequest(this.WeatherEndpoint + locationId, callback);
}

WSI.prototype.wsiRequest = function(endpoint, cb) {
  async.waterfall([
    function (callback) {
      request(endpoint, callback);
    },

    function (response, body, callback) {
      if (response.statusCode === 200) {
        xml2js(body, callback);
      } else {
        callback(new Error("Response status: " + response.statusCode));
      }
    }

  ], function (err, result) {
    if (err) {
      cb(err);
    } else {
      cb(null, result);
    }
  });
}

exports.WSI = WSI;