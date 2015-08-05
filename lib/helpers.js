module.exports = {
  // Takes a string and returns the best match from an array of words.
  search: function (string, array) {
    var results = [], result = "";

    for (var i = 0; i < array.length; i += 1) {
      var regex = new RegExp('\\b' + array[i] + '\\b', 'i');
      if (string.match(regex) != null) {
        results.push(array[i]);
      }
    }

    for (var i = 0; i < results.length; i+= 1) {
      result = (result.length < results[i].length) ? results[i] : result;
    }

    if (result.length > 0) {
      return result;
    } else {
      return null;
    }  
  }
}