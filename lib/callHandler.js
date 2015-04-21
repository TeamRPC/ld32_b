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
        timeout: 4,
        numDigits: 5,
    };
    
    r.addPlay(assetBase + '/disclaimer.wav'); // @todo separate disclaier from intro, or do a db call to see if call is new
    var dig = r.addGetDigits(digitOptions);
    dig.addPlay(assetBase + '/introduction.wav');
    r.addRedirect(nconf.get('server_url') + '/call/hero/create');
    res.set({
        'Content-Type': 'text/xml'
    });
    res.end(r.toXML());
}

function initialInput(req, res) {
    console.log('>initialInput()');
    // process the game code the player entered
    // console.log(req.body);
    // console.log(req.query);
    // console.log(req.params);
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    var digits = req.body.Digits;
    console.log('got digits: ', digits);
    
    var call = req.body.CallUUID;
    if (!call) {
        console.error('rejecting');
        return reject(req, res);
    }
    
    db.getHeroFromCode(digits, function(err, hero) {
        console.log('>>db.getHeroFromCode');
        if (err) throw err;
        if (!hero) return noHeroExists();
        return heroExists(hero, call);
    });
    
    function noHeroExists() {
        console.log('>>>noHeroExists');
        var r = plivo.Response();
        r.addSpeak('no hero exists with this savecode. try again.');
        r.addRedirect(nconf.get('server_url')+'/call/initial'); 
        res.set({ 'Content-Type': 'text/xml' });
        return res.end(r.toXML());
    }
    function heroExists(hero, call) {
        console.log('>>>heroExists');
        db.associateHeroWithCall(hero, call, function(err, ok) {
            console.log('>>> associate hero with call ', ok);
            if (err) throw err;
            if (!ok) throw err;
            var r = plivo.Response();
            r.addSpeak('hero loaded');
            r.addRedirect(nconf.get('server_url')+'/call/lobby');
            res.set({ 'Content-Type': 'text/xml' });
            return res.end(r.toXML());
        });
    }
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
            console.error('could not something or other');
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
    console.log('>> createHero()');
    // get call uuid & validate
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);

    var callUUID = req.body.CallUUID;
    if (!callUUID) {
        console.error('rejecting');
        return reject(req, res);
    }
    
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
        if (recordProgress >= 4) return processMenu();
        if (!req.ld32) req.ld32 = {};
        req.ld32.rejectMessage = 'request to create didnt meet progress requirements';
        return reject(req, res);
    });
    
    function processMenu() {
        console.log('> processMenu()');
        var r = plivo.Response();
        r.addRedirect(nconf.get('server_url') + '/call/hero/create/complete');  // @todo this should go to /call/hero/create/confirm
        res.set({ 'Content-Type': 'text/xml' });
        return res.end(r.toXML());
    }
    
    function processRecord(step) {
        console.log('> processRecord()');
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
        console.log('> processCreate()');
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
    
    var call = req.body.CallUUID;
    if (!call) {
        console.error('rejecting');
        return reject(req, res);
    }
    // get hero from call
    // create challenge
    // associate challenge with hero

    db.getHeroFromCall(call, function(err, hero) {
        db.createChallenge(hero, call, function(err, challenge) {
           if (err) throw err;
           if (!challenge) throw new Error('could not get challenge id wehn creating challenge');
           console.log('challenge created with id: ' + challenge);
           
            var r = plivo.Response();
            r.addPlay(nconf.get('server_url')+'/assets/2_0_crchallenge.wav');
            r.addSpeak('you will have ten seconds to record a challege question, or you may press pound when you are done. you will have the option to record as many follow up questions as you wish.');
            r.addPlay(nconf.get('server_url')+'/assets/beep.wav');
            r.addRedirect(nconf.get('server_url') + '/call/challenge/record');
            res.set({'Content-Type': 'text/xml'});
            res.end(r.toXML());
        });
    });
}

function anotherChallenge(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    var call = req.body.CallUUID;
    if (!call) {
        console.error('rejecting');
        return reject(req, res);
    }
    
    var r = plivo.Response();
    //r.addRedirect(nconf.get('server_url')+'/call/hero/record');
    
    var digitOptions = {
        action: nconf.get('server_url')+'/call/challenge/another/input',
        redirect: "true",
        timeout: 5,
        digitTimeout: 1,
        numDigits: 1
    };
    
    // recording is in progres thanks to the api
    var dig = r.addGetDigits(digitOptions);
    //dig.addPlay(nconf.get('server_url')+'/assets/2_1_followup.wav'); // @todo voice
    dig.addSpeak('press 1 to record another question or 2 to save and finish');
    r.addRedirect(nconf.get('server_url')+'/call/challenge/done');
    res.set({ 'Content-Type': 'text/xml' });
    res.end(r.toXML());

}

function anotherChallengeInput(req, res) {
    console.log('>anotherChallengeInput');
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    var call = req.body.CallUUID;
    if (!call) {
        console.error('rejecting');
        return reject(req, res);
    }
    
    var digits = req.body.Digits;
    if (!digits) {
        console.error('no digits. reject!');
        return reject(req, res);
    }
    
    db.getChallengeFromCall(call, function(err, challenge) {
        if (err) throw err;
        if (!challenge) throw new Error('couldnt get challenge from call');
        
        db.getMostRecentChallengeSound(challenge, function(err, soundUrl) {
            if (err) throw err;
            if (!soundUrl) throw new Error('no sound url');
            
            if (digits == 1) {
                console.log('>>> saving');
                // save
                var r = plivo.Response();
                r.addSpeak('Record your follow up question');
                r.addPlay(nconf.get('server_url')+'/assets/beep.wav');
                r.addRedirect(nconf.get('server_url')+'/call/challenge/record');
                res.set({ 'Content-Type': 'text/xml' });
                res.end(r.toXML());
            }
            else if (digits == 2) {
                console.log('>>> redoing');
                // redo
                var r = plivo.Reponse();
                r.addRedirect(nconf.get('server_url')+'/call/challenge/done');
                res.set({ 'Content-Type': 'text/xml' });
                res.end(r.toXML());
            }
            else {
                console.log('>>> not valid entry');
                // redo
                var r = plivo.Response();
                r.addSpeak('you hacker. Your account has been deleted. just kidding. one second let me blow my nose.');
                r.addRedirect(nconf.get('server_url')+'/call/challenge/another');
                res.set({ 'Content-Type': 'text/xml' });
                res.end(r.toXML());
            }
        });
    });
}

function saveChallenge(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    var call = req.body.CallUUID;
    if (!call) {
        console.error('rejecting');
        return reject(req, res);
    }
    
    db.getChallengeFromCall(call, function(err, challenge) {
        if (err) throw err;
        if (!challenge) throw new Error('couldnt get challenge from call when tryinig to save challenge');
       
       db.makeChallengeAvailable(challenge, function(err, ok) {
           if (err) throw err;
           if (!ok) throw new Error('not ok making challenge available');
           
           var r = plivo.Response();
           r.addSpeak('challenged saved. Your challenge is available to heroes');
       });
    });
}

function recordChallenge(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    var call = req.body.CallUUID;
    if (!call) {
        console.error('rejecting');
        return reject(req, res);
    }
    
    db.getChallengeFromCall(call, function(err, challenge) {
        
        var recordingUrl;
        
        var recordParams = {
            "call_uuid": call,
            "time_limit": 10,
            "file_format": "wav"
        };
        
        api.record(recordParams, function(status, response) {
            if (status >= 400) {
                console.error('could not something or other ', err);
                return reject(req, res);
            }
            console.log('>> recording in progress');
            console.dir(response);
            recordingUrl = response.url;
            db.getHeroFromCall(call, function(err, hero) {
                if (err) throw err;
                if (!hero) throw new Error('no hero found using call');
                db.addChallengeSound(call, recordingUrl, function(err, reply) {
                    if (err) throw err;
                    if (!reply) throw new Error('no reply from adding challenge recording');
                    
                    var r = plivo.Response();
                    //r.addRedirect(nconf.get('server_url')+'/call/hero/record');
                    
                    var digitOptions = {
                        action: nconf.get('server_url')+'/call/challenge/review',
                        redirect: "true",
                        timeout: 10,
                        digitTimeout: 1,
                        numDigits: 1
                    };
                    
                    // recording is in progres thanks to the api
                    r.addGetDigits(digitOptions);
                    r.addRedirect(nconf.get('server_url')+'/call/challenge/review');
                    res.set({ 'Content-Type': 'text/xml' });
                    res.end(r.toXML());
    
                }); 
            });
        });
    });
}

function reviewChallengeInput(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    var call = req.body.CallUUID;
    if (!call) {
        console.error('rejecting');
        return reject(req, res);
    }
    
    var digits = req.body.Digits;
    if (!digits) {
        console.error('no digits. reject!');
        return reject(req, res);
    }
    
    db.getChallengeFromCall(call, function(err, challenge) {
        if (err) throw err;
        if (!challenge) throw new Error('couldnt get challenge from call');
        
        db.getMostRecentChallengeSound(challenge, function(err, soundUrl) {
            if (err) throw err;
            if (!soundUrl) throw new Error('no sound url');
            
            if (digits == 1) {
                // save
                var r = plivo.Response();
                r.addSpeak('saved');
                r.addRedirect(nconf.get('server_url')+'/call/challenge/another');
                res.set({ 'Content-Type': 'text/xml' });
                res.end(r.toXML());
            }
            else if (digits == 2) {
                // redo
                var r = plivo.Response();
                r.addSpeak('deleted. lets go back and record again');
                r.addRedirect(nconf.get('server_url')+'/call/challenge/record');
                res.set({ 'Content-Type': 'text/xml' });
                res.end(r.toXML());
            }
        });
    });
}

function reviewChallenge(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);
    
    var call = req.body.CallUUID;
    if (!call) {
        console.error('rejecting');
        return reject(req, res);
    }
    
    db.getChallengeFromCall(call, function(err, challenge) {
        if (err) throw err;
        if (!challenge) throw new Error('couldnt get challenge from call');
        
        db.getMostRecentChallengeSound(challenge, function(err, soundUrl) {
            if (err) throw err;
            if (!soundUrl) throw new Error('no sound url');
            
            var recordParams = { 
                "call_uuid": call,
                "url": soundUrl
            };
        
            api.record_stop(recordParams, function(err, result) {
                if (err) throw new Error('there was an erorr of some sort', err);
                if (!result) throw new Error('there was no result');
                var digitOptions = {
                    action: nconf.get('server_url') + '/call/challenge/review/input',
                    method: "POST",
                    redirect: "true",
                    timeout: 4,
                    numDigits: 1,
                };
                
                console.log('>>> review recording: url', soundUrl);
                var r = plivo.Response();
                var dig = r.addGetDigits(digitOptions);
                dig.addSpeak('review recording. Press 1 to save or 2 to re re cord');
                dig.addPlay(soundUrl);
                r.addRedirect(nconf.get('server_url')+'/call/challenge/review');
                res.set({ 'Content-Type': 'text/xml' });
                res.end(r.toXML());
            });
        });
    });
}


function completeTraining(req, res) {
    console.log('>>completeTraining()');
    // var vaid = req.ld32.valid;
    // if (valid != true) return reject(req, res) ;
    
    // upgrade squire to hero
    // display savecode
    
    var call = req.body.CallUUID;
    if (!call) return reject(req, res);
        
    db.getHeroFromCall(call, function(err, hero) {
        console.log('> got hero from call');
        if (err) throw err;
        if (!hero) throw new Error('couldnt get hero from call');
        
        db.upgradeSquire(hero, function(err, code) {
            console.log('> squire upgraded');
            if (err) throw err;
            if (!hero) throw new Error('no code in upgrade callback')
            
            console.log('> send the code, ', code);
            // var r = plivo.Response();
            // r.addPlay(assetBase + '/3_1_savecode.wav');
            // r.addSpeak(code);
            // r.addPlay(assetBase+'/3_2_savecodeagain.wav');
            // r.addSpeak(code);
            // r.addRedirect(nconf.get('site_url')+'/call/lobby');
            // res.set({ 'Content-Type': 'text/xml' });
            // res.end(r.toXML());
            
            var r = plivo.Response();
    
            // var digitOptions = {
            //     action: nconf.get('server_url') + '/call/initial/input',
            //     method: "POST",
            //     redirect: "true",
            //     timeout: 2,
            //     numDigits: 5,
            // };
            
            r.addPlay(assetBase + '/3_1_savecode.wav'); // @todo separate disclaier from intro, or do a db call to see if call is new
            r.addSpeak(' '+code);
            r.addPlay(assetBase + '/3_2_savecodeagain.wav');
            r.addSpeak(' '+code);
            //var dig = r.addGetDigits(digitOptions);
            //dig.addPlay(assetBase + '/introduction.wav');
            r.addRedirect(nconf.get('server_url') + '/call/lobby');
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
    
    // @todo
    // @todo
    // @todo
    
    var r = plivo.Response();
    //r.addPlay(assetBase + '/2_2_saveor.wav');
    r.addRedirect(nconf.get('server_url')+'/call/hero/create/complete');
    res.set({ 'Content-Type': 'text/xml' });
    res.end(r.toXML());
}

function doDeed(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);    
    var call = req.body.CallUUID;
    if (!call) return reject(req, res);
   
    var r = plivo.Response();
    
    r.addSpeak("you are doing a challenge");
    res.set({ 'Content-Type': 'text/xml' });
    res.end(r.toXML());
}

function lobbyInput(req, res) {
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);    
    var call = req.body.CallUUID;
    if (!call) return reject(req, res);
    
    // find what button was pressed
    // do the thing the button meant
    
    var digits = req.body.Digits;
    console.log('> got digits: ', digits);
    
    if (digits == 1) {
        return processChallenge();
    }
    else if (digits == 2) {
        return processPVP();
    }
    else if (digits == 3) {
        return processCreateChallenge();
    }
    
    function processChallenge() {
        var r = plivo.Response();
        r.addSpeak("doing challenge");
        r.addRedirect(nconf.get('server_url') + '/call/lobby');
        
        res.set({ 'Content-Type': 'text/xml' });
        res.end(r.toXML());
    }
    function processPVP() {
        var r = plivo.Response();
        r.addSpeak("PVP");
        r.addRedirect(nconf.get('server_url') + '/call/lobby');
        
        res.set({ 'Content-Type': 'text/xml' });
        res.end(r.toXML());
    }
    function processCreateChallenge() {
        var r = plivo.Response();
        console.log('> processCreateChallenge()');
        r.addRedirect(nconf.get('server_url') + '/call/challenge/create');
        res.set({ 'Content-Type': 'text/xml' });
        res.end(r.toXML());
    }
}

function lobby(req, res) {
    console.log('>lobby ');
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);    
    var call = req.body.CallUUID;
    if (!call) return reject(req, res);
    
    // get hero
    // get their level
    // if level >= 3, add create challenge option
    // otherwise, jump into
    db.getHeroFromCall(call, function(err, hero) {
        if (err) throw err;
        if (!hero) throw new Error('couldnt get hero from call');
        
        db.getHeroLevel(hero, function(err, level) {
           if (err) throw err;
           if (!level) throw new Error('couldnt get level from hero '+hero)
           
           if (level >= 3) {
               return challengerMenu();
           }
           else {
               return heroMenu();
           }
           
        });
    });
    
    function heroMenu() {
        var digitOptions = {
            action: nconf.get('server_url') + '/call/lobby/input',
            method: "POST",
            redirect: "true",
            timeout: 5,
            numDigits: 1,
        };
        var r = plivo.Response();
        
        // * do a challenge
        // * pvp
        
        var dig = r.addGetDigits(digitOptions);
        dig.addSpeak("press 1 to do a challenge or presss 2 for PVP");
        r.addRedirect(nconf.get('server_url') + '/call/lobby');
        
        res.set({ 'Content-Type': 'text/xml' });
        res.end(r.toXML());
    }
    
    function challengerMenu() {
        var digitOptions = {
            action: nconf.get('server_url') + '/call/lobby/input',
            method: "POST",
            redirect: "true",
            timeout: 5,
            numDigits: 1,
        };
        var r = plivo.Response();
        
        var dig = r.addGetDigits(digitOptions);
        dig.addSpeak("press 1 to do challenge, press 2 to do PVP, or 3 to create a challenge");
        r.addRedirect(nconf.get('server_url') + '/call/lobby');
        res.set({ 'Content-Type': 'text/xml' });
        res.end(r.toXML());
    }
}


function hangUp(req, res) {
    console.log('>> hangUp()');
    // disassociate call from hero
    var valid = req.ld32.valid;
    if (valid != true) return reject(req, res);    
    var call = req.body.CallUUID;
    if (!call) return reject(req, res);
    db.getHeroFromCall(call, function(err, hero) {
        console.log('call, hero, err ', call, hero, err);

        if (err) throw err;
        if (!hero) console.error('couldnt get hero from call when trying to hang up');
       
        db.disassociateCallFromHero(call, hero, function(err, ok) {
            if (err) throw err;
            if (!ok) console.error('disassocation not ok', ok);
            return res.status(202).end();
        });
    });
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
    recordChallenge: recordChallenge,
    reviewChallenge: reviewChallenge,
    reviewChallengeInput: reviewChallengeInput,
    anotherChallenge: anotherChallenge,
    anotherChallengeInput: anotherChallengeInput,
    saveChallenge: saveChallenge,
    confirmTrainingRecording: confirmTrainingRecording,
    completeTraining: completeTraining,
    recordTraining: recordTraining,
    recordTrainingInput: recordTrainingInput,
    validate: validate,
    reject: reject,
    lobby: lobby,
    lobbyInput: lobbyInput,
    doDeed: doDeed,
    hangUp: hangUp
};