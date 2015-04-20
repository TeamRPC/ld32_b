var db = require('../lib/dbHandler');
var file = require('../lib/fileServer');

// (function test() {
//     console.log('lets test');
//     db.createChallenge(function(err, blah){
//         if (err) console.log('err', err);
        
//         console.log(blah);
//     });

// })();

(function test() {
    
    file.downloadRecording('https://s3-us-west-2.amazonaws.com/grimtech.ld32/1_4_died.wav', function(err, file) {
        console.log('fart');
    });

})();