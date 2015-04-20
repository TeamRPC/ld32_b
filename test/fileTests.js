var path = require('path');
var nconf = require('nconf');
var fs = require('fs');
var should = require('should');
var request = require('supertest');
var express = require('express');

var file = require('../lib/fileServer');


var app = express();
nconf.file(path.join('../', 'config.json'));




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
            file.downloadRecording('https://')
        });
    });
});

