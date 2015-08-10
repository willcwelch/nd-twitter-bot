var async = require('async');

module.exports = {

  // Takes a string and returns the best match from an array of words.
  search: function (string, array, callback) {
    async.filter(array, function (item, cb) {
      // Create a regex from each array item and compare it to the string.
      var regex = new RegExp('\\b' + item + '\\b', 'i');
      cb(string.match(regex) != null);
    }, function (results) {
      // Look through the results for the longest match.
      var result = "";
      for (var i = 0; i < results.length; i += 1) {
        result = (result.length < results[i].length) ? results[i] : result;
      }

      if (result.length > 0) {
        callback(null, result);
      } else {
        callback(null, null);
      }
    });
  }

}