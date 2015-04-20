var should = require('should');
var nconf = require('nconf');
var path = require('path');

nconf.file(path.join('../', 'config.json'));
var db = require('../lib/dbHandler');
var redis = require('redis');
var red = redis.createClient();


describe('redis database', function() {
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
