const express = require('express');
const bodyparser = require('body-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const fs = require('fs');
var creds = '';

const redis = require('redis');
var client = '';
var port = process.env.port || 3000;

app.use(express.static('public'));
app.use(bodyparser.urlencoded({
  extended: true
}));

app.get('/', function (req, res) {
  res.sendFile('views/index.html', {
    root: __dirname
  });
});

http.listen(port, function() {
  console.log('Server listening on ' + port);
});

var chatter = [];

var chat_messages = [];