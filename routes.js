var express = require('express');
var log = require('./logSingleton')();
var redis = require('./redisSingleton')();


module.exports.begin = function(port, onListen) {
    var app = express();

    app.get('/packets', function (req, res) {
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        redis.LRANGE(ip, 0, -1, function(err, rows) {
            var found = (rows && rows.length > 0);
            if (err) {
                log(err);
                found = false;
            }

            if (!found) {
                res.status(404);
                res.send('Not found');
            }
            else {
                var body = '<html><head><title>Packets received from ' + ip + '</title></head><body><pre>';
                for (var i = 0; i < rows.length; i++)
                    body += rows[i] + '\n';
                body += '</pre></body></html>'
                res.send(body);
            }
        });
    });

    app.listen(port, 'localhost', onListen);

    return app;
};
