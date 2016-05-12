var express = require('express');
var router = express.Router();
var amqp = require('amqplib');
var when = require('when');
var syslogParser = require('glossy').Parse;
// var broker = {
//     host: process.env.AMQP_URL,
//     port: 5672,
//     login: encodeURIComponent(process.env.AMQP_USERNAME),
//     password: encodeURIComponent(process.env.AMQP_PASSWORD),
//     connectionTimeout: 10000,
//     authMechanism: 'AMQPLAIN',
//     vhost: process.env.AMQP_VHOST,
//     noDelay: true,
//     ssl: {
//         enabled: false
//     }
// }
var logplexMiddleware = [
    // First, read the message body into `req.body`, making sure it only
    // accepts logplex "documents".
    require('body-parser').text({ type: 'application/logplex-1' }),
    // Next, split `req.body` into separate lines and parse each one using
    // the `glossy` syslog parser.
    function(req, res, next) {
        req.body = (req.body || '').split(/\r*\n/).filter(function(line) {
            // Make sure we only parse lines that aren't empty.
            return line.length !== 0;
        }).map(function(line) {
            // glossy doesn't like octet counts to be prepended to the log lines,
            // so remove those.
            return syslogParser.parse(line.replace(/^\d+\s+/, ''));
        });
        next();
    }
];
var url = 'amqp://' + process.env.AMQP_USERNAME + ':' + process.env.AMQP_PASSWORD + '@' +process.env.AMQP_URL + '/' + process.env.AMQP_VHOST
console.log(url)
var open = require('amqplib').connect(url);

/* GET home page. */
router.post('/', logplexMiddleware, function(req, res, next) {
    var q = 'node-test';
    var msg = req.body;
    open.then(function(conn) {
        return conn.createChannel();
    }).then(function(ch) {
        return ch.assertQueue(q).then(function(ok) {
            msg.forEach(function(item) {
                // console.log(item.originalMessage);
                return ch.sendToQueue(q, new Buffer(item.originalMessage));
            });
        });
    }).catch(console.warn);
    res.sendStatus(200)
});

module.exports = router;
