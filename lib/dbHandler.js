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
        return candidate = Math.floor(Math.random()*(9999-1000+1)+1000);
    }

    function uniqueCheck(cb) {
        generateCode();
        red.get('hero:code:'+candidate, function(err, reply) {
            if (err) return new Error('database problem checking to see if hero save code was unique');
            if (reply == null) return cb(null, candidate);  // unique
            setTimeout(uniqueCheck(cb), 1);
        });
    }
    
    var candidate = generateCode();
    uniqueCheck(function(err, code) {
       if (err) throw err;
       return cb(null, code);
    });
}

function createChallenge(cb) {
    // get a challenge id
    red.incr('challenge:counter', function(err, count) {
        if (err) return cb(err);
        
        red.set('challenge:'+count, count, function(err, reply) {
            if (err) return cb(err);
            if (!reply == 'OK') return cb(new Error('did not get OK from database when creating new challenge id'));
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
            red.set('hero:'+squireId+':savecode', code, function(err, reply) {
                if (err) return cb(err);
                if (!reply == 'OK') return cb(new Error('did not get OK from database when creating hero id'));
                return cb(null, code);
            });
    });
        
//   (one id is secret. it's the user's code to retrieve their hero)
//   (one id is not so secret)
//   * `$id = INCR hero:conter`
//   * `SET hero:$id $id`
}

// squire is just a hero in process of being created. they don't get a savecode
function createSquire(callUUID, cb) {
    // get a hero id
    red.incr('hero:counter', function(err, count) {
        if (err) return cb(err); 
        
        // set the hero id
        red.set('hero:'+count, count, function(err, reply) {
            if (err) return cb(err, null);
            if (!reply == 'OK') return cb(new Error('did not get OK from database when creating squire id'));
            
            // associate hero with call
            red.set('hero:'+count+':call', callUUID, function(err, reply) {
                if (err) return cb(err, null);
                if (!reply == 'OK') return cb(new Error('did not get OK from database when associating squire with call UUID'));
                
                // associate call with hero
                // TTL is 1h in case the hangup didn't delete the key
                red.set(['hero:call:'+callUUID, count, 'EX', '3600'], function(err, reply) {
                    if (err) return cb(err, null);
                    if (!reply == 'OK') return cb(new Error('did not get OK from db when associating call UUID with squire'));
                    
                    // set training progress to -1
                    red.set('hero:'+count+':training', '-1', function(err, reply) {
                        if (err) return cb(err, null);
                        if (!reply == 'OK') return cb(new Error('did not get OK from db when setting training to -1'), null);
                        
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
    red.incr('hero:'+heroId+':training', function(err, reply) {
        if (err) return cb(err, null);
        return cb(null, reply);
    });
}

function getSquireProgress(callUUID, cb) {
    getHeroFromCall(callUUID, function(err, heroId) {
        console.log('getSquireProgress::getHeroFromCall ', heroId);
        if (err) return cb(err, null);
        if (!heroId) return cb(new Error('no hero id found using this call uuid'), null);
        red.get('hero:'+heroId+':training', function(err, reply) {
           if (err) return cb(err, null);
           return cb(null, reply);
        });        
    });
}

function getHero(heroId, cb) {
    red.get('hero:'+heroId, function(err, reply) {
        if (err) return cb('dbHandler::getHero() '+err);
        return cb(null, reply);
    })
}

function progressSquire(call, cb) {
    // incr hero:$heroId:training
    getHeroFromCall(call, function(err, hero) {
        if (err) return(new Error('could not get hero from call '+err), null);
        
        incrementSquireTraining(hero, function(err, training) {
            if (err) return(new Error('could not increment squire training '+err))
           
            return cb(null, training);
        });
    });
}

function getHeroFromCall(call, cb) {
    red.get('hero:call:'+call, function(err, hero) {
        if (err) return(new Error('could not get hero from call'), null);
        return cb(null, hero);       
    });
}

function addChallengeSound(challengeId, soundUrl, cb) {
    red.lpush('challenge:'+challengeId+':sounds', soundUrl, function(err, reply) {
        if (err) return cb(err);
        if (!reply == 'OK') return cb(new Error('did not get OK from database when adding new sound to challenge'), null);
        return cb(null, true);
    });
}

function log(message, cb) {
    red.lpush("logs", Date.now()+' '+message, function(err, reply) {
        if (err) return cb(err);
        return cb(null, reply);
    })
}

/**
 * get the call information from the inital plivo xml request
 * the call info will be kept so we can play back recordings to the hero using the the correct call UUID
 */
function logCall(callId, heroId, cb) {
    red.set('hero:call:'+callId, heroId, function(err, reply) {
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
    addChallengeSound: addChallengeSound,
    log: log,
    getSaveCode: getSaveCode,
    createChallenge: createChallenge,
    logCall: logCall,
    getHero: getHero,
    incrementSquireTraining: incrementSquireTraining,
    getHeroFromCall: getHeroFromCall
};