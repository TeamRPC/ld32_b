var path = require('path');
var nconf = require('nconf');
var fs = require('fs');
var should = require('should');
var request = require('supertest');
var express = require('express');

var file = require('../lib/fileServer');


var app = express();
nconf.file(path.join(__dirname, '../', 'config.json'));
//console.log('nconf check-- ', nconf.get('server_url'));
//var assetBase = nconf.get('server_url')+'/assets';
//console.log('asset base-- ', assetBase);

//sdfsdfsdfs


describe('file server', function() {
    describe('GET /assets/:asset', function() {
        it('should serve a sound file when filename requested starts with the prefix, "snd_"');
            // request(app)
            //     //.get('/assets/snd_test1234.wav')
            //     .get('/assets/introduction.wav')
            //     .expect(200, done);

    });
    
    describe('downloadRecording', function() {
        it('should download the file you tell it to', function(done) {
            file.downloadRecording(nconf.get('server_url')+'/assets/snd_test1234.wav', function(err, file) {
               done(); 
            });
        });
    });
});

