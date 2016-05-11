var express = require('express');
var router = express.Router();
var amqp = require('amqplib');
var when = require('when');
var syslogParser = require('glossy').Parse;
var broker = {
    host: 'localhost',
    port: 5672,
    login: 'guest',
    password: 'guest',
    connectionTimeout: 10000,
    authMechanism: 'AMQPLAIN',
    vhost: 'alan-test',
    noDelay: true,
    ssl: {
        enabled: false
    }
}
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


/* GET home page. */
router.post('/', logplexMiddleware, function(req, res, next) {
    amqp.connect(broker).then(function(conn) {
        return when(conn.createChannel().then(function(ch) {
            var q = 'yy';
            var msg = req.body;
            var ok = ch.assertQueue(q, { durable: false });

            return ok.then(function(_qok) {
                // NB: `sentToQueue` and `publish` both return a boolean
                // indicating whether it's OK to send again straight away, or
                // (when `false`) that you should wait for the event `'drain'`
                // to fire before writing again. We're just doing the one write,
                // so we'll ignore it.
                msg.forEach(function(item) {
                    console.log(item.originalMessage);
                    ch.sendToQueue(q, new Buffer(item.originalMessage));

                });
                return ch.close();
            });
        })).ensure(function() { conn.close(); });
    }).then(null, console.warn);
    res.sendStatus(200)
});

module.exports = router;
