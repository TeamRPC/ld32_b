var db = require('../lib/dbHandler');

// (function test() {
//     console.log('lets test');
//     db.createChallenge(function(err, blah){
//         if (err) console.log('err', err);
        
//         console.log(blah);
//     });

// })();

(function test() {
    
    db.getSaveCode(function(err, code) {
       console.log('CODE ', code); 
    });
});