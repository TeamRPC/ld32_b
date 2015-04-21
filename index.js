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
app.post('/call/lobby', urlencodedParser, handler.validate, handler.lobby);                    // when you are logged in and your training is complete
app.post('/call/lobby/input', urlencodedParser, handler.validate, handler.lobbyInput);         // when player presses 1, 2, or 3 on the lobby menu
app.post('/call/challenge', urlencodedParser, handler.validate, handler.doDeed);               // if enered savecode or just completed training
app.post('/call/hangup', urlencodedParser, handler.validate, handler.hangUp);                  // when teh call is hung up any method

// challenge creation
app.post('/call/challenge/create', urlencodedParser, handler.validate, handler.createChallenge);               
app.post('/call/challenge/record', urlencodedParser, handler.validate, handler.recordChallenge);
app.post('/call/challenge/review', urlencodedParser, handler.validate, handler.reviewChallenge);
app.post('/call/challenge/review/input', urlencodedParser, handler.validate, handler.reviewChallengeInput);  
app.post('/call/challenge/another', urlencodedParser, handler.validate, handler.anotherChallenge);               // ask challenger if they want to record another challenge segment
app.post('/call/challenge/another/input', urlencodedParser, handler.validate, handler.anotherChallengeInput);
app.post('/call/challenge/done', urlencodedParser, handler.validate, handler.saveChallenge);


app.listen(port);
console.log('Listening on port ' + port);