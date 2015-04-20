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
    
    console.log(req.body); // @todo
    
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    // call uuid is valid if got to this point

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
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
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

// @todo this could be async in it's generation of the savecode
function createHero(req, res) {
    // get call uuid & validate
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);

    var callUUID = req.body.CallUUID;
    if (!callUUID) return reject();
    
    // find out what step in the process the hero is at
    // steps:
    //   - inital squire creation
    //   - prompt for recording 0
    //   - recording 0
    //   - prompt for recording 1
    //   - recording 1
    //   - ...
    //   - end of recording ("")
    //   - 
    
    var recordProgress = req.ld32.recordProgress;
    if (!recordProgress) return reject();
    
    switch (recordProgress) {
        case 0:
            return processRecord(0);
        default:
            return processCreate();
    }
    
    function processRecord(step) {
        console.log('recording step ', step);
        // prompt user to record hero phrases
        var r = plivo.Response();
        var recordOptions = {
            recordSession: "true",
            redirect: "false",
            action: nconf.get('server_url') + '/call/hero/record',
            maxLength: "5",
            finishOnKey: "#"
        };
        
        r.addPlay(assetBase + '/1/'+step+'.wav');
        var rec = r.addRecord(recordOptions);
        rec.addPlay(assetBase + '/beep.wav');
        r.addRedirect(nconf.get('server_url') + '/call/hero/create');
        res.set({
            'Content-Type': 'text/xml'
        });
        res.end(r.toXML());
        
        
        
        
            var recordOptions = {
                recordSession: "true",
                redirect: "false",
                action: nconf.get('server_url') + '/call/hero/record',
                maxLength: "5",
                finishOnKey: "#"
            };
            
            r.addPlay(assetBase + '/1_0_needu.wav');
            var rec = r.addRecord(recordOptions);
            rec.addPlay(assetBase + '/beep.wav');
            r.addRedirect(nconf.get('server_url') + '/call/hero/create');
            res.set({
                'Content-Type': 'text/xml'
            });
            res.end(r.toXML());
    }
    
    function processCreate() {
        db.createSquire(callUUID, function(err, hero) {
            if (err) throw err;
            console.log('created hero ', hero);
            
            if (!req.ld32) req.ld32 = {};
            req.ld32.recordProgress = 0;
            // prompt user to record hero phrases
            var r = plivo.Response();
            r.addRedirect(nconf.get('server_url')+'/call/hero/create');
            res.set({
                'Content-Type': 'text/xml'
            });
            res.end(r.toXML());
        });
    }
}

function createChallenge(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    db.createChallenge(function(err, id) {
       if (err) throw err;
       console.log('challenge created with id: ' + id);
    });
    
    // // tell the user something like, 'Hello, lvl n'
    // tell the user something like
    // Challenge creation.
    // Record after the sword, your challenge followed by the pound key.
    // In a tremendous feat, heroes will have a go at answering your challenge.
    // after three moons, return and determine the victor.
    var r = plivo.Response();
    var recordOptions = {
        recordSession: "true",
        redirect: "false",
        action: nconf.get('server_url') + '/call/challenge/record',
        maxLength: "30",
        finishOnKey: "#"
    };
    r.addPlay(assetBase + '/2_0_crchallenge.wav');
    var rec = r.addRecord(recordOptions);
    rec.addPlay(assetBase + '/beep.wav');
    // user records their challenge
    //var dig = r.addGetDigits(digitOptions);  // could be used for player to hit * to go back
    res.set({
        'Content-Type': 'text/xml'
    });
    res.end(r.toXML());
}

function confirmRecording(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    // get params that tell us who and what this is recording is for
    // confirm with player that it sounds good
    // add recording to db
    res.set({
        'Content-Type': 'text/xml'
    });
    res.end(r.toXML());
}

/**
 * make sure nobody is spoofin or something, and that we have a valid call uuid
 * must be called as middleware before every route that handles calls
 * idk why I even did this because it's weak sauce validation.
 * @todo add something that only allows plivo referrer
 */
function validate(req, res, next) {
    var callUUID = req.body.CallUUID;
    if (!req.ld32) req.ld32 = {};
    
    if (!/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(callUUID)) {
        req.ld32.valid = false;
        return next();
    }
    req.ld32.valid = true;
    return next();
}

// reject the call
function reject(req, res) {
    var callUUID = req.body.CallUUID;
    var callerName = req.body.callerName;
    var rejectMessage = req.ld32.rejectMessage;
    db.log('got an invalid call id: '+callUUID+' from '+callerName+' rejectmMssage: '+rejectMessage);

    var r = plivo.Response();
    r.addPlay(assetBase + '/error.wav');
    
    
    res.set({
        'Content-Type': 'text/xml'
    });
    return res.end(r.toXML());
}

module.exports = {
    initial: initial,
    initialInput: initialInput,
    createHero: createHero,
    createChallenge: createChallenge,
    confirmRecording: confirmRecording,
    validate: validate,
    reject: reject
};