var nconf = require('nconf');
var plivo = require('plivo');
var path = require('path');
var db = require('./dbHandler.js');

nconf.file(path.join(__dirname, '../', 'config.json'));
var assetBase = nconf.get('server_url') + '/assets';


var api = plivo.RestAPI({
    authId: nconf.get('plivo_authId'),
    authToken: nconf.get('plivo_authToken')
});



function initial(req, res) {
    
    // tell player their call is being recorded and briefly introduce game
    
    //console.log(req.query);
    //var hangup = req.params('HangupCause');
    //console.log('hangup: ' + hangup);
    var r = plivo.Response();

    var digitOptions = {
        action: nconf.get('server_url') + '/call/initial/input',
        method: "POST",
        redirect: "true",
        timeout: 8,
        numDigits: 5,
    };
    
    r.addPlay(assetBase + '/disclaimer.wav');
    var dig = r.addGetDigits(digitOptions);
    dig.addPlay(assetBase + '/introduction.wav');
    r.addRedirect(nconf.get('server_url') + '/call/hero/create');

    res.set({
        'Content-Type': 'text/xml'
    });
    res.end(r.toXML());
}

function initialInput(req, res) {
    // process the game code the player entered
    // console.log(req.body);
    // console.log(req.query);
    // console.log(req.params);
    var digits = req.body.Digits;
    console.log('got digits: ', digits);
    
    // @todo look up game in redis
    
    var r = plivo.Response();
    r.addSpeak('you entered a digit ' + digits + ' ma sun');
    r.addWait({length: 3});
    res.set({
        'Content-Type': 'text/xml'
    });
    res.end(r.toXML());
}

function createHero(req, res) {
    // generate unique game ID
    // and a new hero in the db
    db.createHero(function(err, uid) {
        if (err) throw err;
        console.log('hero '+uid+' created');
    });
    
    // @todo res.send something
}


module.exports = {
    initial: initial,
    initialInput: initialInput
};