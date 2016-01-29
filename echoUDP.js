var dgram = require('dgram');
var log = require('./logSingleton')();
var redis = require('./redisSingleton')();
var moment = require('moment-timezone');

module.exports.begin = function(port, maxRows, onListen) {
    var server = dgram.createSocket('udp4');

    server.on('message', function (message, remote) {
        var good = false;
        if (message && message.length < 500) {
            good = message.toString().indexOf('\n') < 0;
        }

        if (good)
        {
            var ascii = message.toString().replace(/[\x00-\x1F]/g, "_");
            var hex = message.toString('hex');

            var response = 'At ' + moment().tz('America/Los_Angeles').format('M/D/YY HH:mm') + ', ';
            response += 'UDP payload from ' + remote.address + ':' + remote.port + ' of ' + message.length + ' bytes: "' + ascii + '" [' + hex + ']';
            var buffer = new Buffer(response);
            server.send(buffer, 0, buffer.length, remote.port, remote.address, function(err, bytes) {
                if (err)
                {
                    response = response + '; ' + err.message;
                    log.warn({ body: ascii, ip: remote.address, port: remote.port, error: err }, "Error response to send()");
                }

                redis.RPUSH(remote.address, response, function(err, length) {
                    if (err)
                        log.warn({ body: ascii, ip: remote.address, port: remote.port, error: err }, "Error response from redis");
                    else
                        log.info({ body: ascii, ip: remote.address, port: remote.port, response: response }, "Success");

                    if (length > maxRows)
                        redis.LPOP(remote.address);
                });
            });
        }
        else
        {
            log.warn({ body: message.toString(), ip: remote.address, port: remote.port }, "Improper packet");
        }
    });

    server.bind(port, onListen);
}