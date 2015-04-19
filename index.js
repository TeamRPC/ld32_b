var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: true });
var port = process.env.PORT || 5000;
var nconf = require('nconf');
var path = require('path');
var handler = require('./lib/callHandler.js');
var stat = require('./lib/fileServer.js');

nconf.file(path.join(__dirname, 'config.json'));



// retrieve sound files
app.get('/assets/:asset',  urlencodedParser, stat.getAsset);

// handle calls
app.post('/call/initial', handler.initial);
app.post('/call/initial/input', urlencodedParser, handler.initialInput);
//app.post('/call/hero/create', urlencodedParser, handler.createChallenge);


app.listen(port);
console.log('Listening on port ' + port);
