var bunyan = require('bunyan');

var singleton;

var defaults = {
    name: 'udping'
};

module.exports = function() {
    var opts;

    if (!singleton) {
        singleton = bunyan.createLogger(defaults);
    }

    return singleton;
};
