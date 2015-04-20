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
        timeout: 2,
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
    r.addSpeak('you entered digit ' + digits + ' ma sun');
    r.addWait({length: 3});
    res.set({ 'Content-Type': 'text/xml' });
    res.end(r.toXML());
}

function recordTrainingInput(req, res) {
    
}

function recordTraining(req, res) {
    // get call id
    // play beep
    // use api to start recording
    // associate recording with call
    // find associated hero
    // find training progress
    
    

    
    console.log("RECORDING");
    console.log(req.body);
    
    //var valid = req.ld32.valid;
    //if (valid != true) return reject(req, res);
    
    
    var call = req.body.CallUUID;
    if (!call) return reject(req, res);
    
    if (!req.ld32) req.ld32 = {};
    
    var recordingUrl; 
    
    var recordParams = {
        "call_uuid": call,
        "time_limit": 5,
        "file_format": "wav"
    };
    
    api.record(recordParams, function(status, response) {
        if (status >= 400) {
            console.error('could not something or other ', err);
            return reject(req, res);
        }
        console.dir(response);
        recordingUrl = response.url;
        db.getHeroFromCall(call, function(err, hero) {
            if (err) throw err;
            if (!hero) throw new Error('no hero found using call');
            db.addTrainingRecording(hero, call, recordingUrl, function(err, reply) {
                if (err) throw err;
                if (!reply) throw new Error('no reply from adding training recording');
                
                var r = plivo.Response();
                //r.addRedirect(nconf.get('server_url')+'/call/hero/record');
                
                var digitOptions = {
                    action: nconf.get('server_url')+'/call/hero/record/input',
                    redirect: "false",
                    timeout: 5,
                    digitTimeout: 1
                };
                
                //r.addSpeak('recording'); // @todo remove
                //r.addPlay(nconf.get('server_url')+'/beep.wav'); // @todo remove
                r.addGetDigits(digitOptions);
                r.addRedirect(nconf.get('server_url')+'/call/hero/create');
                res.set({ 'Content-Type': 'text/xml' });
                return res.end(r.toXML());
                
                // * associate sound clip url with challenge
                //   * `LPUSH challenge:$challengeId:sounds 'http://s3.example.aws.blah'`

            }); 
        });
    });
}

// @todo this could be async in it's generation of the savecode
function createHero(req, res) {
    // get call uuid & validate
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);

    var callUUID = req.body.CallUUID;
    if (!callUUID) return reject(req, res);
    
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
    
    db.getSquireProgressFromCall(callUUID, function(err, recordProgress) {
        if (err) return db.log('error getting squire progress- '+err);
        //console.log('creating hero. callId: '+callUUID+' rec proc: '+recordProgress);

        if (!recordProgress) return processCreate();
        if (recordProgress == -1) return processCreate();
        if (recordProgress > -1 && recordProgress < 5) return processRecord(recordProgress);
        if (recordProgress > 4) return processMenu();
        if (!req.ld32) req.ld32 = {};
        req.ld32.rejectMessage = 'request to create didnt meet progress requirements';
        return reject(req, res);
    });
    
    function processMenu() {
        var r = plivo.Response();
        r.addRedirect(nconf.get('server_url') + '/call/hero/confirm');
        res.set({ 'Content-Type': 'text/xml' });
        return res.end(r.toXML());
    }
    
    function processRecord(step) {
        console.log('recording step ', step);
        // prompt user to record hero phrases
        
        // go to next step
        db.progressSquire(callUUID, function(err, progress) {
            console.log('progressed the squire');
            var r = plivo.Response();
            r.addPlay(assetBase + '/1_'+step+'.wav');
            //r.addPlay(assetBase + '/beep.wav');
            console.log('time to record! ');
            r.addRedirect(nconf.get('server_url')+'/call/hero/record');
            res.set({ 'Content-Type': 'text/xml' });
            return res.end(r.toXML());
        });
    }
    
    function processCreate() {
        db.createSquire(callUUID, function(err, hero) {
            if (err) throw err;
            //console.log('created squire! ', hero);
            
            // add in database that user made progress on creation process
            //console.log('progressSquire CallUUID: ' + callUUID);
            db.progressSquire(callUUID, function(err, progress) {
                // prompt user to record hero phrases
                var r = plivo.Response();
                r.addRedirect(nconf.get('server_url')+'/call/hero/create');
                res.set({ 'Content-Type': 'text/xml' });
                return res.end(r.toXML());
            });
        });
    }
}

function createChallenge(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    db.createChallenge(function(err, id) {
       if (err) throw err;
       //console.log('challenge created with id: ' + id);
    });
    
    // // tell the user something like, 'Hello, lvl n'
    // tell the user something like
    // Challenge creation.
    // Record after the sword, your challenge followed by the pound key.
    // In a tremendous feat, heroes will have a go at answering your challenge.
    // after three moons, return and determine the victor.
    var r = plivo.Response();

    r.addPlay(assetBase + '/2_0_crchallenge.wav');
    r.addPlay(assetBase + '/beep.wav');
    //r.addRecord(recordOptions);
    // user records their challenge
    //var dig = r.addGetDigits(digitOptions);  // could be used for player to hit * to go back
    res.set({ 'Content-Type': 'text/xml' });
    res.end(r.toXML());
}


function completeTraining(req, res) {
    // var vaid = req.ld32.valid;
    // if (valid != true) return reject(req, res) ;
    
    // upgrade squire to hero
    // display savecode
    
    var call = req.body.CallUUID;
    if (!call) return reject(req, res);
        
    db.getHeroFromCall(call, function(err, hero) {
        if (err) throw err;
        if (!hero) throw new Error('couldnt get hero from call');
        
        db.upgradeSquire(hero, function(err, code) {
            if (err) throw err;
            if (!hero) throw new Error('no code in upgrade callback')
            
            var r = plivo.Response();
            r.addPlay(assetBase + '/3_1_savecode.wav');
            r.addSpeak(code);
            r.addPlay(assetBase+'/3_2_savecodeagain.wav');
            r.addSpeak(code);
            res.set({ 'Content-Type': 'text/xml' });
            res.end(r.toXML());   
        });
    });    
}

// confirm 
function confirmTrainingRecording(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    // get params that tell us who and what this is recording is for
    // confirm with player that it sounds good
    // add recording to db
    
    var r = plivo.Response();
    r.addPlay(assetBase + '/2_2_saveor.wav');
    res.set({ 'Content-Type': 'text/xml' });
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
    //console.dir(req);
    
    if (!/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(callUUID)) {
        req.ld32.valid = false;
        return next();
    }
    req.ld32.valid = true;
    return next();
}

// reject the call
function reject(req, res) {
    if (!req.body) console.error('you have to call reject like, reject(req, res)');
    var callUUID = req.body.CallUUID || '';
    var callerName = req.body.callerName || '';
    var rejectMessage = req.ld32.rejectMessage || 'default rejext message';
    
    console.log("CALL REJECTED ", callUUID, ' ', callerName, ' ', rejectMessage);
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
    confirmTrainingRecording: confirmTrainingRecording,
    completeTraining: completeTraining,
    recordTraining: recordTraining,
    recordTrainingInput: recordTrainingInput,
    validate: validate,
    reject: reject
};