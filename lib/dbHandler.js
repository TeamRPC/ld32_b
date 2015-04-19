var redis = require('redis');

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

function createHero(heroId, cb) {
    
}

function addChallengeSound(challengeId, soundUrl, cb) {
    red.lpush('challenge:'+challengeId+':sounds', soundUrl, function(err, reply) {
        if (err) return cb(err);
        if (!reply == 'OK') return cb(new Error('did not get OK from database when adding new sound to challenge'));
        return cb(null, true);
    });
}

function testAdd(val, cb) {
    red.set('game:fart', val, function(err, res) {
        if (err) throw err;
        console.log("RES: "+res);
        console.log(val);
        cb(null, res);
    });
}

function log(message) {
    red.lpush("logs", Date.now()+' '+message);
}

module.exports = {
    createChallenge: createChallenge,
    createHero: createHero,
    addChallengeSound: addChallengeSound,
    log: log
}