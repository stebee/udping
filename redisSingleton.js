var redis = require('redis');
var log = require('./logSingleton')();

var singleton;

module.exports = function() {
    if (!singleton) {
        singleton = redis.createClient();
    }

    return singleton;
};
