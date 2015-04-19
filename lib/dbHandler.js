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
        //return candidate = Math.floor(Math.random()*(9999-1000+1)+1000);
        candidate = '5555';
    }
    
    function getCode(step) {
        generateCode();
        step();
    }
    
    function candidateNotUnique() {
        red.get('hero:code:'+candidate, function(err, reply) {
            if (err) return new Error('database problem checking to see if hero save code was unique');
            console.log('reply is: ', reply);
            if (reply != null) return true;
            return false;
        });
    }
    
    function done(err) {
        if (err) throw err;
        console.log('candidate is: ', candidate);
        return cb(err, candidate);
    }
    
    // make sure unique
    var candidate;
    generateCode();
    
    async.whilst(candidateNotUnique, getCode, done);
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
    red.incr('hero:counter', function(err, count) {
        if (err) return cb(err);
        
        red.set('hero:'+count, count, function(err, reply) {
            if (err) return cb(err);
            if (!reply == 'OK') return cb(new Error('did not get OK from database when creating new hero id'));
            return cb(null, count);
        });
    });
//   (one id is secret. it's the user's code to retrieve their hero)
//   (one id is not so secret)
//   * `$id = INCR hero:conter`
//   * `SET hero:$id $id`
}

function addChallengeSound(challengeId, soundUrl, cb) {
    red.lpush('challenge:'+challengeId+':sounds', soundUrl, function(err, reply) {
        if (err) return cb(err);
        if (!reply == 'OK') return cb(new Error('did not get OK from database when adding new sound to challenge'));
        return cb(null, true);
    });
}

function log(message) {
    red.lpush("logs", Date.now()+' '+message);
}

module.exports = {
    createChallenge: createChallenge,
    createHero: createHero,
    addChallengeSound: addChallengeSound,
    log: log,
    getSaveCode: getSaveCode
};