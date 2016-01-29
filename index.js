var routes = require('./routes');
var udp = require('./echoUDP');
var tcp = require('./echoTCP');
var log = require('./logSingleton')();

routes.begin(process.env.WEB_PORT, function() {
    log.info('Web server begun');
});

udp.begin(process.env.UDP_PORT, process.env.MAX_ROWS, function() {
    log.info('UDP server begun');
});

tcp.begin(process.env.TCP_PORT, process.env.MAX_ROWS, function() {
    log.info('TCP server begun');
});


process.on('uncaughtException', function(err) {
    log.warn(err);
});
