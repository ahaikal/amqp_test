
var express = require('express');
var router = express.Router();
var q = 'tasks';

var open = require('amqplib').connect('amqp://localhost');
/* GET home page. */
router.post('/', function(req, res, next) {


    open.then(function(conn) {
        return conn.createChannel();
    }).then(function(ch) {
        return ch.assertQueue(q).then(function(ok) {
            return ch.sendToQueue(q, new Buffer('something to do'));
        }).then(function(){
          return ch.close();
        });
    }).catch(console.warn);
    res.sendStatus(200)
});

module.exports = router;
