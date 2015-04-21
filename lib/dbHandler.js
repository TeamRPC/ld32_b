var redis = require('redis');
var async = require('async');

var red = redis.createClient();


function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function getSaveCode(cb) {

    function generateCode() {
        return candidate = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);
    }

    function uniqueCheck(cb) {
        generateCode();
        red.get('hero:code:' + candidate, function(err, reply) {
            if (err) return new Error('database problem checking to see if hero save code was unique');
            if (reply == null) return cb(null, candidate); // unique
            setTimeout(uniqueCheck(cb), 1);
        });
    }

    var candidate = generateCode();
    uniqueCheck(function(err, code) {
        if (err) throw err;
        return cb(null, code);
    });
}

function createChallenge(hero, call, cb) {
    // get a challenge id
    red.incr('challenge:counter', function(err, count) {
        if (err) return cb(err);

        red.set('challenge:' + count, count, function(err, reply) {
            if (err) return cb(err);
            if (!reply == 'OK') return cb(new Error('did not get OK from database when creating new challenge id'));
            
            red.lpush('hero:'+hero+':challenges', count); // add to hero's list of challenges she created. @todo error handling
            red.set('challenge:'+count+':hero', hero); // set owner. @todo erro handling
            red.set('challenge:call:'+call, count); // associate challenge with call @todo error handling
            
            return cb(null, count);
        });
    });
}

function upgradeSquire(squireId, cb) {
    // upgrade a squire to a hero
    // a hero is just a squire with a savecode
    // create savecode
    // generate a savecode
    getSaveCode(function(err, code) {
        if (err) return cb(err);
        // associate savecode with the hero
        red.set('hero:' + squireId + ':savecode', code, function(err, reply) {
            if (err) return cb(err, null);
            if (!reply == 'OK') return cb(new Error('did not get OK from database when creating hero id'), null);
            
            red.set('hero:code:'+code, squireId, function(err, reply) {
                if (err) return cb(err, null);
                if (!reply == 'OK') return cb(new Error('did not get ok from db wehn adding hero:code:[code]'), null);
                return cb(null, code);
            });
        });
    });

    //   (one id is secret. it's the user's code to retrieve their hero)
    //   (one id is not so secret)
    //   * `$id = INCR hero:conter`
    //   * `SET hero:$id $id`
}

function associateHeroWithCall(hero, call, cb) {
    // associate hero with call
    red.set('hero:' + hero + ':call', call, function(err, reply) {
        if (err) return cb(err, null);
        if (!reply == 'OK') return cb(new Error('did not get OK from database when associating hero with call'));
    
        // associate call with hero
        // TTL is 30m in case the hangup doesnt't delete the key
        red.set(['hero:call:' + call, hero, 'EX', '1800'], function(err, reply) {
            if (err) return cb(err, null);
            if (!reply == 'OK') return cb(new Error('did not get OK from db when associating call with hero'));

            return cb(null, true);
        });
    });
}

function disassociateCallFromHero(call, hero, cb) {
    red.del('hero:call:'+call);
    red.del('hero:'+hero+':call');
    // @todo error checking
    return cb(null, true);
}

// squire is just a hero in process of being created. they don't get a savecode
function createSquire(callUUID, cb) {
    // get a hero id
    red.incr('hero:counter', function(err, count) {
        if (err) return cb(err);

        // set the hero id
        red.set('hero:' + count, count, function(err, reply) {
            if (err) return cb(err, null);
            if (!reply == 'OK') return cb(new Error('did not get OK from database when creating squire id'));

            // associate hero with call
            red.set('hero:' + count + ':call', callUUID, function(err, reply) {
                if (err) return cb(err, null);
                if (!reply == 'OK') return cb(new Error('did not get OK from database when associating squire with call UUID'));

                // associate call with hero
                // TTL is 30m in case the hangup didn't delete the key
                red.set(['hero:call:' + callUUID, count, 'EX', '1800'], function(err, reply) {
                    if (err) return cb(err, null);
                    if (!reply == 'OK') return cb(new Error('did not get OK from db when associating call UUID with squire'));

                    // set training progress to -1
                    // this is done so when hitting /call/hero/create again, it jumps into recording rather than creating again
                    red.set('hero:' + count + ':training', '-1', function(err, reply) {
                        if (err) return cb(err, null);
                        if (!reply == 'OK') return cb(new Error('did not get OK from db when setting training to 0'), null);

                        return cb(null, count);
                    });
                });
            });
        });
    });
}

/*
 * increment the squire training process
 * used as req.ld32.recordingProcess
 * in /call/hero/create
 */
function incrementSquireTraining(heroId, cb) {
    //console.log('dbHandler::incrementSquireTraining() -- incrementing squire training with heroId', heroId);
    red.incr('hero:' + heroId + ':training', function(err, reply) {
        if (err) return cb(err, null);
        return cb(null, reply); // < bad
    });
}

function getSquireProgressFromCall(callUUID, cb) {
    getHeroFromCall(callUUID, function(err, heroId) {
        //console.log('getSquireProgress::getHeroFromCall ', heroId);
        if (err) return cb(err, null);
        if (!heroId) return cb(null, -1); // if there is no hero id associated with this call, set progress to -1 so the hero is created
        getSquireProgress(heroId, function(err, progress) {
            if (err) return cb(err, null);
            return cb(null, progress);
        });
    });
}

function getSquireProgress(hero, cb) {
    red.get('hero:' + hero + ':training', function(err, reply) {
        if (err) return cb(err, null);
        return cb(null, reply);
    });
}

function getHero(heroId, cb) {
    red.get('hero:' + heroId, function(err, reply) {
        if (err) return cb('dbHandler::getHero() ' + err);
        return cb(null, reply);
    })
}

/**
 * calls back with err, Array
 */
function getHeroDeeds(hero, cb) {
    red.lrange(['hero:' + hero + ':deeds', '0', '-1'], function(err, deeds) {
        if (err) return cb(err, null);
        if (!deeds) return cb(null, []);
        console.log('deeds here: ', deeds);
        return cb(null, deeds);
    });
}

function getHeroLevel(hero, cb) {
    red.get('hero:' + hero + ':level', function(err, level) {
        if (err) return cb(err, null);
        if (!level) {
            updateHeroLevel(hero, function(err, level) {
                if (err) return cb(new Error('couldnt update hero level when geting hero level'), null);
                return cb(null, level);
            });
        } else {
            return cb(null, level);
        }
    });
}

function getHeroFromCode(code, cb) {
    red.get('hero:code:' + code, function(err, hero) {
       if (err) return cb(err, null);
       if (!hero) return cb(null, null);
       return cb(null, hero);
    });
}

function updateHeroLevel(hero, cb) {
    getHeroDeeds(hero, function(err, deeds) {
        if (err) return cb(err, null);
        var level;
        var numDeeds = deeds.length;
        if (numDeeds < 3) {
            level = 1
        }
        else if (numDeeds < 6) {
            level = 2
        }
        else if (numDeeds < 12) {
            level = 3
        }
        else if (numDeeds < 24) {
            level = 4
        }
        else if (numDeeds < 48) {
            level = 5
        }
        else if (numDeeds < 96) {
            level = 6
        }
        else if (numDeeds < 192) {
            level = 7
        }
        else if (numDeeds >= 192) {
            level = 8
        }

        red.set('hero:' + hero + ':level', level, function(err, reply) {
            if (err) console.log("ERROR!")
            if (err) return cb(new Error('couldnt set hero level when updating hero level'), null);
            return cb(null, level);
        });
    });
}

function progressSquire(call, cb) {
    //console.log('dbHandler::progressSquire:: call-', call)
    // incr hero:$heroId:training
    getHeroFromCall(call, function(err, hero) {
        //console.log('dbHandler::progressSquire:: err-', err, ' hero-', hero)
        if (err) return (new Error('could not get hero from call ' + err), null);

        incrementSquireTraining(hero, function(err, training) {
            //console.log('dbHandler::progressSquire:: err-', err, 'traning- ', training);
            if (err) return (new Error('could not increment squire training ' + err))

            //console.log('TRAINING IS ', training);
            return cb(null, training); // < bad
        });
    });
}

function getHeroFromCall(call, cb) {
    red.get('hero:call:' + call, function(err, hero) {
        if (err) return (new Error('could not get hero from call'), null);
        if (!hero) return cb(null, null);
        return cb(null, hero);
    });
}

function getCallFromHero(hero, cb) {
    red.get('hero:' + hero + ':call', function(err, call) {
        if (err) return (new Error('redis error when getting call from hero'), null);
        return cb(null, call);
    });
}

function addTrainingRecording(hero, call, url, cb) {
    // get the training progress
    getSquireProgress(hero, function(err, progress) {
        if (err) return cb(err, null);
        if (!progress) return cb(new Error('uknown progress for recording'));
        //LPUSH challenge:$challengeId:sounds 'http://s3.example.aws.blah'`
        red.lpush('hero:' + hero + ':profile:temps', url, function(err, reply) {
            if (err) return cb(err, null);
            console.log('success adding file ', url, ' hero ', hero, ' call ', call);
            return cb(null, reply);
        });
    });
}

    // red.incr('challenge:counter', function(err, count) {
    //     if (err) return cb(err);

    //     red.set('challenge:' + count, count, function(err, reply) {
    //         if (err) return cb(err);
    //         if (!reply == 'OK') return cb(new Error('did not get OK from database when creating new challenge id'));
    //         return cb(null, count);
    //     });
function getCallFromChallenge(challenge, cb) {
    red.get('challenge:'+challenge+':call', function(err, call) {
       if (err) return cb(err, null);
       if (!call) return cb(new Error('cont get call from challenge'), null);
       
       return cb(null, call);
    });
}

// challenge:call:$callId           - contains challengeId. maps active call to challenge
// challenge:$challengeId:call      - contains callId. maps challenge to active call

function getChallengeFromCall(call, cb) {
    red.get('challenge:call:'+call, function(err, challenge) {
        if (err) return cb(err, null);
        if (!challenge) return cb(new Error('couldnt get challenge from call'), null);
        return cb(null, challenge);
    });
}

function getMostRecentChallengeSound(challenge, cb) {
    red.lindex('challenge:'+challenge+':sounds', '0', function(err, sound) {
        if (err) return cb(err, null);
        if (!sound) return cb(new Error('no latest sound'), null);
        return cb(null, sound);
    });
}

function addChallengeSound(call, soundUrl, cb) {
    // getHeroFromCall(call, function(err, hero) {
    //     if (err) return cb(err, null);
    //     if (!hero) return cb(new Error('couldnt get hero'), null);
        
    getChallengeFromCall(call, function(err, challengeId) {
        if (err) return cb(err, null);
        if (!challengeId) return cb(new Error('couldnt get challenge id'), null);
        //red.set('challenge:'+challengeId+':hero', hero); // @todo i dont think this is needed here, should be in creation
        red.lpush('challenge:' + challengeId + ':sounds', soundUrl, function(err, reply) {
            if (err) return cb(err);
            if (!reply == 'OK') return cb(new Error('did not get OK from database when adding new sound to challenge'), null);
            return cb(null, true);
        });
    });
    // });
}

function makeChallengeAvailable(challenge, cb) {
    red.sismember('challenge:availables', challenge, function(err, exists) {
        if (err) return cb(err, null);
        if (exists) return cb(null, 1);
        red.sadd('challenge:availables', challenge, function(err, ok) {
            if (err) return cb(err, null);
            console.log('ok- ', ok);
            if (!ok) return cb(new Error('couldnt make challenge available'), null);
            return cb(null, ok);
        });
    });

}

function makeChallengeNotAvailable(challenge, cb) {
    red.sismember('challenge:availables', challenge, function(err, exists) {
        if (err) return cb(err, null);
        if (!exists) return cb(null, 1)
        red.srem('challenge:availables', challenge, function(err, ok) {
           if (err) return cb(err, null);
           if (!ok) return cb(new Error('couldnt make not avail'), null);
           return cb(null, ok);
        });
    });
}


function log(message) {
    red.lpush("logs", Date.now() + ' ' + message)
}

/**
 * get the call information from the inital plivo xml request
 * the call info will be kept so we can play back recordings to the hero using the the correct call UUID
 */
function logCall(callId, heroId, cb) {
    red.set('hero:call:' + callId, heroId, function(err, reply) {
        if (err) return cb(err, null);
        if (reply != 'OK') return cb(new Error('did not get OK from db when logging call'), null);
        return cb(null, callId);
    });
}

module.exports = {
    createChallenge: createChallenge,
    createSquire: createSquire,
    upgradeSquire: upgradeSquire,
    progressSquire: progressSquire,
    getSquireProgress: getSquireProgress,
    getSquireProgressFromCall: getSquireProgressFromCall,
    addChallengeSound: addChallengeSound,
    log: log,
    getSaveCode: getSaveCode,
    createChallenge: createChallenge,
    getChallengeFromCall: getChallengeFromCall,
    getCallFromChallenge: getCallFromChallenge,
    makeChallengeNotAvailable: makeChallengeNotAvailable,
    makeChallengeAvailable: makeChallengeAvailable,
    getMostRecentChallengeSound: getMostRecentChallengeSound,
    logCall: logCall,
    getHero: getHero,
    getHeroLevel: getHeroLevel,
    getHeroDeeds: getHeroDeeds,
    incrementSquireTraining: incrementSquireTraining,
    getHeroFromCall: getHeroFromCall,
    getCallFromHero: getCallFromHero,
    addTrainingRecording: addTrainingRecording,
    updateHeroLevel: updateHeroLevel,
    getHeroFromCode: getHeroFromCode,
    associateHeroWithCall: associateHeroWithCall,
    disassociateCallFromHero: disassociateCallFromHero
};