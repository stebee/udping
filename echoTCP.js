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



        var neverSawRemoteFin = false;
        var closedSocketAbnormally = false;

        setTimeout(function() {
            if (!ended)
            {
                neverSawRemoteFin = true;
                sock.end();
            }
        }, 5000);

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
                            response = ' of ' + message.length + ' bytes: ';
                            fullResponse += response;
                            sock.write(response);
                        }
                    }, 750);

                    setTimeout(function() {
                        if (!ended)
                        {
                            if (!remoteFinSent)
                                neverSawRemoteFin = true;

                            response = '"' + ascii + '" [' + hex + ']';
                            fullResponse += response;
                            sock.end(response);
                            localFinSent = true;
                        }
                    }, 1500);
                }
                else
                {
                    log.warn({ body: ascii, ip: remoteAddress, port: remotePort }, "Improper packet");
                }
            }

        });

        sock.on('end', function() {
            remoteFinSent = true;
        });

        sock.on('error', function(error) {
            if (error)
            {
                closedSocketAbnormally = true;
                log.warn({ body: ascii, ip: remoteAddress, port: remotePort, error: error }, "Socket error");
            }
        });

        sock.on('close', function(had_error) {
                if (!localFinSent)
                    closedSocketAbnormally = true;

                if (closedSocketAbnormally)
                    fullResponse += "... but socket was closed too early!";
                else if (neverSawRemoteFin)
                    fullResponse += "... but socket wasn't shut down properly!";

                rpush(remoteAddress, fullResponse);
                log.info({ body: ascii, ip: remoteAddress, port: remotePort, response: fullResponse }, "Success");

                ended = true;
            }
        );
    }).listen(port);

    process.nextTick(function() { onListen(); });
}
