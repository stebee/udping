var net = require('net');
var tcp = net.createServer({ allowHalfOpen: true }, function(sock) {

    var ended = false;
    var remember_sender = "UNKNOWN";
    var both_sent = false;
    var fin_sent = false;

    sock.on('data', function(data) {
        if (!ended)
        {
            ended = true;

            var good = false;

            if (data)
                good = data.toString().indexOf('\n') < 0;

            if (good)
            {
                remember_sender = "" + data;

                var response = 'Welcome TCP sender from ' + sock.remoteAddress + ':' + sock.remotePort +' - ';
                sock.write(response);

                response = 'you sent ' + data.length + ' bytes: "' + data + '"';
                setTimeout(function() {
                    both_sent = true;
                    sock.write(response);

                    console.log((new Date()).toString() + " sent response to " + remember_sender);
                    sock.end();
                }, 450);
            }

            if (!good)
                console.log((new Date()).toString() + " NAUGHTY TCP: " + data + " [" + sock.remoteAddress + ':' + sock.remotePort + "]");


        }

    });

    sock.on('end', function(error) {
        console.log((new Date()).toString() + " " + remember_sender + " sent FIN");
    });

    sock.on('error', function(error) {
        console.log((new Date()).toString() + " " + remember_sender + " saw error " + error);
    });
    sock.on('close', function(error) {
            console.log((new Date()).toString() + " " + remember_sender + " closed; error = " + error + "; fin sent = " + fin_sent + "; both sent = " + both_sent);
        }
    );



}).listen(PORT);