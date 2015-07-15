require('./lib/sugar-dates');

var forecastController = require('./ForecastController.js').ForecastController;

var WeatherBot = function() {};

WeatherBot.prototype.getTweet = function(tweetData, callback) {
  var that = this;

  forecastController.getForecast(tweetData.city, function (err, forecasts) {
    if (err) {
      callback(err);
    } else {
      var forecast = that.selectForecast(tweetData.date.value, forecasts);

      if (forecast === null) {
        callback(null, '@' + tweetData.sender + ' Sorry, I can only tell you about the next 10 days.');
      } else if (forecast.forecast) {
        callback(null, '@' + tweetData.sender + ' Forecast for ' + forecast.city + ' on ' + Date.create(forecast.time).format('{Weekday}') + ': ' + forecast.forecast);
      } else if (tweetData.date.parsed) {
        callback(null, '@' + tweetData.sender + ' Forecast for ' + forecast.city + ' ' + Date.create(forecast.time).relative() + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
      } else {
        callback(null, '@' + tweetData.sender + ' I could not find a time. Current weather for ' + forecast.city + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
      }
    }

  });
}

WeatherBot.prototype.selectForecast = function(time, forecasts) {
  if (time > (1).hoursBefore('now') && time < (48).hoursAfter('now')) {
    forecasts = forecasts.hourlyForecasts;
  } else if (time > (48).hoursAfter('now') && time < (10).daysAfter('now')) {
    forecasts = forecasts.dailyForecasts;
  } else {
    return null;
  }

  for (var i = 0; i < forecasts.length; i += 1) {
    if (Date.create(forecasts[i].time) > time) {
      return forecasts[i];
    }
  }

  return null;
}

exports.WeatherBot = new WeatherBot();