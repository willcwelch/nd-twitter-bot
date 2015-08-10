require('../sugar-dates');

var forecastController = require('./forecastcontroller.js').ForecastController;

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
        forecast = that.selectForecast(new Date(), forecasts);
        if (forecast === null) {
          callback(null, '@' + tweetData.sender + ' Sorry, I can only tell you about the next 10 days.');
        } else {
          callback(null, '@' + tweetData.sender + ' Sorry, I can only tell you about the next 10 days. Current weather for ' + forecast.city + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
        }
        
      } else if (forecast.forecast) {
        // If forecast has the forecast property, it's more than 48 hours from now.
        callback(null, '@' + tweetData.sender + ' Forecast for ' + forecast.city + ' on ' + Date.create(forecast.time).format('{Weekday}') + ': ' + forecast.forecast);
      } else if (tweetData.date.parsed && Date.create(forecast.time).isToday()) {
        // If the user provided a date in the next 48 hours and it's before the end of the day, format the response appropriately. 
        callback(null, '@' + tweetData.sender + ' Forecast for ' + forecast.city + ' today at ' + Date.create(forecast.time).format('{h} {tt}') + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
      } else if (tweetData.date.parsed && Date.create(forecast.time).isTomorrow()) {
        // If the user provided a date in the next 48 hours and it's before the end of tomorrow, format the response appropriately. 
        callback(null, '@' + tweetData.sender + ' Forecast for ' + forecast.city + ' tomorrow at ' + Date.create(forecast.time).format('{h} {tt}') + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
      } else if (tweetData.date.parsed) {
        // If the user provided a date in the next 48 hours, format the response appropriately. 
        callback(null, '@' + tweetData.sender + ' Forecast for ' + forecast.city + ' on ' + Date.create(forecast.time).format('{Weekday} at {h} {tt}') + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
      } else {
        // If the user didn't provide a date, this is a forecast for now.
        callback(null, '@' + tweetData.sender + ' I could not find a time. Current weather for ' + forecast.city + ': ' + forecast.sky + ' and ' + forecast.temperature + '°F.');
      }
    }

  });
}

// Takes a forecasts object and finds a forecast that matches the time.
WeatherBot.prototype.selectForecast = function(time, forecasts) {

  if (time > (1).hoursBefore('now') && time <= (46).hoursAfter('now')) {
    forecasts = forecasts.hourlyForecasts;
    // Selects the first forecast with a time greater than the time requested.
    for (var i = 0; i < forecasts.length; i += 1) {
      if (Date.create(forecasts[i].time) >= time) {
        return forecasts[i];
      }
    }
  } else if (time > (46).hoursAfter('now') && time < (10).daysAfter('now')) {
    forecasts = forecasts.dailyForecasts;
    // Selects the first forecast that matches the day of the given time.
    for (var i = 0; i < forecasts.length; i += 1) {
      if (Date.create(forecasts[i].time).is(time.short())) {
        return forecasts[i];
      }
    }
  }

  return null;
}

exports.WeatherBot = new WeatherBot();