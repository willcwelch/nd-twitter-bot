require('./lib/sugar-dates');

var forecastController = require('./ForecastController.js').ForecastController;

var WeatherBot = function() {};

// Takes a TweetData object and returns a weather tweet based on the data.
WeatherBot.prototype.getTweet = function(tweetData, callback) {
  var that = this, forecast;

  forecastController.getForecast(tweetData.city, function (err, forecasts) {
    if (err && err.name === 'NonSpecificLocationError') {
      // If there is a non-specific location error, prompt the user to add the state.
      callback(null, '@' + tweetData.sender + ' Sorry, I need a more specific location. Try adding the state.');
    } else if (err) {
      callback(err);
    } else {
      forecast = that.selectForecast(tweetData.date.value, forecasts);

      if (forecast === null) {
        // If the value of forecast wasn't set, there wasn't a forecast in the time range.
        callback(null, '@' + tweetData.sender + ' Sorry, I can only tell you about the next 10 days.');
      } else if (forecast.forecast) {
        // If forecast has the forecast property, it's more than 48 hours from now.
        callback(null, '@' + tweetData.sender + ' Forecast for ' + forecast.city + ' on ' + Date.create(forecast.time).format('{Weekday}') + ': ' + forecast.forecast);
      } else if (tweetData.date.parsed) {
        // If the user provided a date and the previous condition wasn't triggered, this is a forecast in the next 48 hours.
        callback(null, '@' + tweetData.sender + ' Forecast for ' + forecast.city + ' ' + Date.create(forecast.time).relative() + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
      } else {
        // If the user didn't provide a date, this is a forecast for now.
        callback(null, '@' + tweetData.sender + ' I could not find a time. Current weather for ' + forecast.city + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
      }
    }

  });
}

// Takes a forecasts object and finds a forecast that matches the time.
WeatherBot.prototype.selectForecast = function(time, forecasts) {
  var forecasts;

  if (time > (1).hoursBefore('now') && time < (48).hoursAfter('now')) {
    forecasts = forecasts.hourlyForecasts;
  } else if (time > (48).hoursAfter('now') && time < (10).daysAfter('now')) {
    forecasts = forecasts.dailyForecasts;
  } else {
    return null;
  }

  // Selects the first forecast with a time greater than the time requested.
  for (var i = 0; i < forecasts.length; i += 1) {
    if (Date.create(forecasts[i].time) > time) {
      return forecasts[i];
    }
  }

  return null;
}

exports.WeatherBot = new WeatherBot();