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
//var dl = require('/lib/downloader.js');

nconf.file(path.join(__dirname, 'config.json'));



// retrieve sound files
app.get('/assets/:asset',  urlencodedParser, stat.getAsset);

// handle calls
app.post('/call/initial', urlencodedParser, handler.validate, handler.initial);                // welcome
app.post('/call/initial/input', urlencodedParser, handler.validate, handler.initialInput);     // if entering save code
app.post('/call/hero/create', urlencodedParser, handler.validate, handler.createHero);         // if not entering save code
app.post('/call/hero/record', urlencodedParser, handler.recordTraining);                       // if receiving recording from squire training
app.post('/call/hero/record/input', urlencodedParser, handler.recordTrainingInput);            // if ending recording early using '#'
app.post('/call/hero/create/complete', urlencodedParser, handler.completeTraining);            // when done recording trainings
app.post('/call/hero/create/confirm', urlencodedParser, handler.validate, handler.confirmTrainingRecording);  // when done with training
//app.post('/call/challenge', urlencodedParser, handler.validate, handler.doDeed);               // if enered savecode or just completed training

// challenge creation
app.post('/call/challenge/create', urlencodedParser, handler.createChallenge);



app.listen(port);
console.log('Listening on port ' + port);