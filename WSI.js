var request = require('request'),
    xml2js = require('xml2js').parseString,
    async = require('async');

var WSI = function(config) {
  this.LocationEndpoint = 'http://' + config.address + '/' + config.version + '/' + config.serviceId + '/Locations/Cities/';
  this.WeatherEndpoint = 'http://' + config.address + '/' + config.version + '/' + config.serviceId + '/Weather/Report/';
}
WSI.prototype.getLocation = function(location, cb) {
  var that = this;

  async.waterfall([
    function(x) {
      request(that.LocationEndpoint + location, x);
    },

    function(response, body, x){
      that.responseHandler(null, response, body, x);
    }    

  ], function (err, result) {
    if (err) {
      console.log(err);
    } else {
      cb(null, result);
    }
  });
}
WSI.prototype.getWeather = function(locationId, callback) {
  request(this.WeatherEndpoint + locationId, callback);
}
WSI.prototype.responseHandler = function(err, response, body, callback) {
  if (err) {
    callback(err);
  } else if (response.statusCode === 200) {
    xml2js(body, function (err, result){
      if (err) {
        callback(err);
      } else {
        callback(null, result);
      }
    });
  } else {
    callback(new Error("Response status: " + response.statusCode));
  }
}

exports.WSI = WSI;