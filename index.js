const express = require('express');
const bodyparser = require('body-parser');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const redis = require('redis');
const Raven = require('raven');

const dsn = process.env.dsn;
Raven.config(dsn).install();

var config = '';

var client = '';

var port = process.env.PORT || 3000;

app.use(Raven.requestHandler());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser.urlencoded({
  extended: true
}));

http.listen(port, function() {
  console.log('Server listening on ' + port);
});

var chatters = [];

var chat_messages = [];

fs.readFile('config.json', 'utf-8', function(err, data) {
  if (err) throw err;
  config = JSON.parse(data);
  client = redis.createClient(config.port, config.host, { no_ready_check: true });

  client.auth(config.password, function (err) {
    if (err) throw err;
  });
  
  client.on('connect', function() {
    console.log('Connected to Redis');
  });

  client.once('ready', function() {
    client.get('chat_users', function(err, reply) {
      if(reply) {
        chatters = JSON.parse(reply);
      }
    });
    client.get('chat_app_messages', function(err, reply) {
      if(reply) {
        chat_messages = JSON.parse(reply);
      }
    });
  });
});

app.use(function onError(err, req, res, next) {
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

app.get('/', function (req, res) {
  res.sendFile('views/index.html', {
    root: __dirname
  });
});

app.post('/join', function(req, res) {
  var username = req.body.username;
  if(chatters.indexOf(username) === -1) {
    chatters.push(username);
    client.set('chat_users', JSON.stringify(chatters));
    res.send({
      'chatters': chatters,
      'status': 'OK'
    });
  } else {
    res.send({
      'status': 'FAILED'
    });
  }
});

app.post('/leave', function(req, res) {
  var username = req.body.username;
  chatters.splice(chatters.indexOf(username), 1);
  client.set('chat_users', JSON.stringify(chatters));
  res.send({
    'status': 'OK'
  });
});

app.post('/send_message', function(req, res) {
  var username = req.body.username;
  var message = req.body.message;
  chat_messages.push({
    'sender': username,
    'message': message
  });
  client.set('chat_app_messages', JSON.stringify(chat_messages));
  res.send({
    'status': 'OK'
  });
});

app.get('/get_messages', function(req, res) {
  res.send(chat_messages);
});

app.get('/get_chatters', function(req, res) {
  res.send(chatters);
});

app.get('*', function(req, res) {
  Raven.captureException("err");
  res.send('Page Not Found');
});

app.use(Raven.errorHandler());

io.on('connection', function(socket) {
  socket.on('message', function(data) {
    io.emit('send', data);
  });

  socket.on('update_chatter_count', function(data) {
    io.emit('count_chatters', data);
  });
});
