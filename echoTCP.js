var net = require('net');
var log = require('./logSingleton')();
var redis = require('./redisSingleton')();
var moment = require('moment-timezone');


if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
    };
}

module.exports.begin = function(port, maxRows, onListen) {
    function rpush(address, payload) {
        redis.RPUSH(address, payload, function(err, length) {
            if (length > maxRows)
                redis.LPOP(address);
        });
    }

    var server = net.createServer({ allowHalfOpen: true }, function(sock) {

        setTimeout(function() {
            console.log('wtf connect timeout');
            if (!ended)
            {
                console.log('wtf end');
                sock.end();
                errorSeen = new Error("Never closed the connection");
            }
        }, 50000);

        var ended = false;
        var errorSeen = null;
        var remoteAddress = sock.remoteAddress;
        if (remoteAddress.startsWith('::ffff:'))
            remoteAddress = remoteAddress.substr('::ffff:'.length);
        var remotePort = sock.remotePort;
        var when = moment().tz('America/Los_Angeles').format('M/D/YY HH:mm');
        var localFinSent = false;
        var remoteFinSent = false;
        var fullResponse = '';
        var ascii = '';

        sock.on('data', function(message) {
            ascii = message.toString().replace(/[\x00-\x1F]/g, "_");
            if (!ended)
            {
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
                        if (!ended)
                        {
                            console.log('local FIN');
                            response = ' of ' + message.length + ' bytes: "' + ascii + '" [' + hex + ']';
                            fullResponse += response;
                            sock.end(response);
                            localFinSent = true;
                        }
                    }, 3500);
                }
                else
                {
                    log.warn({ body: ascii, ip: remoteAddress, port: remotePort }, "Improper packet");
                }
            }

        });

        sock.on('end', function() {
            console.log('remote FIN');
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
                console.log("wtf close");

                if (!errorSeen)
                {
                    if (!localFinSent)
                        errorSeen = new Error("Did not read all the response");
                    else if (had_error)
                        errorSeen = new Error("Connection reset");
                }

                if (errorSeen)
                {
                    log.warn({ body: ascii, ip: remoteAddress, port: remotePort, error: errorSeen }, "Unspecified error");
                    rpush(remoteAddress, fullResponse + '; ' + errorSeen);
                }
                else
                {
                    rpush(remoteAddress, fullResponse);
                    log.info({ body: ascii, ip: remoteAddress, port: remotePort, response: fullResponse }, "Success");
                }
                ended = true;
            }
        );
    }).listen(port);

    process.nextTick(function() { onListen(); });
}
