var should = require('should');
var nconf = require('nconf');
var path = require('path');

nconf.file(path.join('../', 'config.json'));
var db = require('../lib/dbHandler');
var redis = require('redis');
var red = redis.createClient();


var dummyCallId = 'efb34eb2-e730-11e4-a15e-c5ffead37627';


describe('redis database', function() {
    describe('hero 1', function() {
        it('should exist', function(done) {
            db.getHero(1, function(err, heroId) {
                if (err) throw err;
                if (!heroId) {
                    db.createSquire(dummyCallId, function(err, heroId) {
                       if (err) throw err;
                       heroId.should.exist;
                       done();
                    });
                }
                heroId.should.exist;
                done();
            });
        });
    }),
    
    // describe('expirations', function() {

    //     it('should expire', function(done) {
    //         this.timeout(3000);
    //         red.set(['test:expireme', 'value', 'EX', '1'], function(err, reply) {
    //             if (err) throw err;
    //             reply.should.be.String.with.exactly('OK');
                
    //             setTimeout(function() {
    //                 red.get('test:expireme', function(err, reply) {
    //                     if (err) throw err;
    //                     should(reply).be.null;
    //                     done();
    //                 });
    //             }, 2000);
    //         });
    //     });
    // }),
    
    
    // createChallenge: createChallenge,
    // createSquire: createSquire,
    // upgradeSquire: upgradeSquire,
    // getSquireProgress: getSquireProgress,
    // addChallengeSound: addChallengeSound,
    // log: log,
    // getSaveCode: getSaveCode,
    // createChallenge: createChallenge,
    // logCall: logCall

    describe('logCall()', function() {
        it('should return true', function() {
            db.logCall(dummyCallId, 1, 'test', function(err, reply) {
                reply.should.not.be.empty;
            });
        });
    }),

    describe('getHeroFromCall()', function() {
        it('should return hero ID ', function(done) {
            db.getHeroFromCall(dummyCallId, function(err, heroId) {
                if (err) throw err;
                heroId.should.be.greaterThan(0);
                done();
            });
        });
    }),
    
    describe('incrementSquireTraining()', function() {
        it('should return a number between -1 and 10', function(done) {
           db.incrementSquireTraining(1, function(err, step) {
               if (err) throw err;
               step.should.be.within(-1, 10);
               done();
           });
        });
    }),
    
    
    describe('createChallenge()', function() {
        it('should callback with a challenge id', function(done) {
            db.createChallenge(function(err, id) {
               if (err) throw err;
               id.should.be.greaterThan(0);
               done();
            });
        });
    }),
    
    describe('createSquire()', function() {
       it('should callback with an id ', function(done) {
           db.createSquire(dummyCallId, function(err, id) {
              if (err) throw err;
              id.should.be.greaterThan(0);
              done();
           });
       });
    }),
    
    describe('getHero()', function() {
        it('should callback with an id', function(done) {
            db.getHero(1, function(err, id) {
                if (err) throw err;
                id.should.not.be.empty;
                id.should.equal('1');
                done();
            });
        });
    }),
    
    describe('progressSquire()', function() {
       it('should callback with a number between -1 and 10', function(done) {
           db.progressSquire(function(err, progress) {
               if (err) throw err;
               progress.should.be.within(-1, 10);
               done();
           });
       });
    }),
    
    
    
    describe('createChallenge()', function() {
        // it('should callback with a guid when no parameters are sent', function(done) {
        //     db.createGame(function(err, id) {
        //         if (!/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(id)) throw new Error('not a valid guid');
        //         done();
        //     });
        // }),
        
        // it('should error when game id already exists', function(done) {
        //     var id = '72f3fe05-2dbb-17af-b28d-bc11ec5c8fc9';
        //     db.createChallenge(id, function(err) {
        //         if (err) throw err;
        //         db.createGame(id, function(err, i) {
        //             if (!err) throw new Error('Did not error when a duplicate game id was used');
        //             done();
        //         });
        //     });
        // });
        
        it('should call back with the challenge id number', function(done) {
           db.createChallenge(function(err, reply) {
               if (err) throw err;
               reply.should.be.a.Number;
               done();
           });
        }),
        
        
        it('should increment the challenge counter', function(done) {
            red.get('challenge:counter', function(err, startCount) {
                db.createChallenge(function(err, reply) {
                    red.get('challenge:counter', function(err, count) {
                        count.should.be.greaterThan(startCount);
                        done();
                    });
                });            
            });
        });
    }),
    
    describe('getSaveCode()', function() {
        it('should return a number between 1000 and 9999', function(done) {
            db.getSaveCode(function(err, code) {
                if (err) throw err;
                code.should.be.within(1000, 9999);
                done();
            });
        });
    });
    
    // describe('addChallengeSound', function() {
    //     it('should return true', function(done) {
    //         db.addChallengeSound(1, nconf.get('server_url')+'/assets/snd_test123.wav', function(err, res) {
    //             res.should.be.true;
    //             done();
    //         });
    //     });
    // });
});
