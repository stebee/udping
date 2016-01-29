var net = require('net');
var log = require('./logSingleton')();
var redis = require('./redisSingleton')();
var moment = require('moment-timezone');


module.exports.begin = function(port, maxRows, onListen) {
    function rpush(address, payload) {
        redis.RPUSH(address, payload, function(err, length) {
            if (length > maxRows)
                redis.LPOP(address);
        });
    }

    var server = net.createServer({ allowHalfOpen: true }, function(sock) {
        var ended = false;
        var errorSeen = null;
        var remoteAddress = sock.remoteAddress;
        var remotePort = sock.remotePort;
        var when = moment().tz('America/Los_Angeles').format('M/D/YY HH:mm');
        var localFinSent = false;
        var remoteFinSent = false;
        var fullResponse = '';
        var ascii = '';

        sock.on('connect', function() {
            setTimeout(function() {
                if (!ended)
                {
                    rpush(remoteAddress, fullResponse + ' but never closed the connection');
                }
            }, 5000);
        });

        sock.on('data', function(message) {
            ascii = message.toString().replace(/[\x00-\x1F]/g, "_");
            if (!ended)
            {
                ended = true;

                var good = false;

                if (message)
                    good = message.toString().indexOf('\n') < 0;

                if (good)
                {
                    var hex = message.toString('hex');

                    var response = 'At ' + when + ', ';
                    response += 'TCP payload from ' + remoteAddress + ':' + remotePort;
                    fullResponse = response;

                    sock.write(response);

                    setTimeout(function() {
                        response = ' of ' + message.length + ' bytes: "' + ascii + '" [' + hex + ']';
                        fullResponse += response;
                        sock.end(response);
                        localFinSent = true;
                    }, 1000);
                }

                if (!good)
                    console.log((new Date()).toString() + " NAUGHTY TCP: " + message + " [" + sock.remoteAddress + ':' + sock.remotePort + "]");


            }

        });

        sock.on('end', function() {
            remoteFinSent = true;
        });

        sock.on('error', function(error) {
            if (err)
            {
                errorSeen = err;
                log.warn({ body: ascii, ip: remoteAddress, port: remotePort, error: err }, "Socket error");
            }
        });

        sock.on('close', function(had_error) {
                if (had_error && !errorSeen)
                {
                    errorSeen = "Unknown error";
                    log.warn({ body: ascii, ip: remoteAddress, port: remotePort, error: new Error(errorSeen) }, "Unspecified error");
                }
                else
                {
                    log.info({ body: ascii, ip: remoteAddress, port: remotePort, response: fullResponse }, "Success");
                }

                if (errorSeen)
                {
                    rpush(remoteAddress, fullResponse + ' but had error ' + errorSeen);
                }
                else
                {
                    rpush(remoteAddress, fullResponse);
                }
                ended = true;
            }
        );
    }).listen(port);

    process.nextTick(function() { onListen(); });
}
