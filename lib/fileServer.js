var path = require('path');
var nconf = require('nconf');
var request = require('request');
var fs = require('fs');
var db = require('./dbHandler');
var psend = require('send');
//var awsS3 = require('s3');

var tmpDir = path.join(__dirname + '../', 'tmp');
nconf.file('../config.json');


// var s3 = awsS3.createClient({
//     maxAsyncS3: 20, // this is the default 
//     s3RetryCount: 3, // this is the default 
//     s3RetryDelay: 1000, // this is the default 
//     multipartUploadThreshold: 20971520, // this is the default (20 MB) 
//     multipartUploadSize: 15728640, // this is the default (15 MB) 
//     s3Options: {
//         accessKeyId: nconf.get("s3_accessKeyId"),
//         secretAccessKey: nconf.get("s3_secretAccessKey"),
//         // any other options are passed to new AWS.S3() 
//         // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property 
//     },
// });

/**
 * gets assets using an asset id or a common name
 */
function getAsset(req, res) {
    var options = {
        root: path.join(__dirname, '../assets')
    };
    var asset = req.params.asset;
    if (!asset) {
        res.sendFile('c_error.wav', options);
    }

    // if the prefix of asset is 'snd_', just serve it
    if (/^snd_/.test(asset)) {
        var p = path.join(options.root, asset);
        fs.stat(p, function onstat(err, stat) {
            if (err) return send404();
            return res.sendFile(p);
        });
        function send404() {
            db.log('404: '+p);
            var msg = 'teh 404';
            res.statusCode = 404;
            res.send(msg);
        }
    }
    else {

        console.log('asset retrieval ', asset);
        switch (asset) {
            case 'disclaimer.wav':
                res.sendFile('c_disclaimer.wav', options);
                break;
            case 'introduction.wav':
                res.sendFile('c_introduction.wav', options);
                break;
            case 'test.wav':
                res.sendFile('c_test.wav', options);
                break;
            case 'error.wav':
                res.sendFile('c_error.wav', options);
                break;
            default:
                db.log('error while trying to serve asset: ' + asset);
                res.sendFile('c_error.wav', options);
        }
    }
}

function store(wavUrl) {
    var params = {
        localFile: "some/local/file",

        s3Params: {
            Bucket: "s3 bucket name",
            Key: "some/remote/file",
            // other options supported by putObject, except Body and ContentLength. 
            // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property 
        },
    };
    var uploader = client.uploadFile(params);
    uploader.on('error', function(err) {
        console.error("unable to upload:", err.stack);
    });
    uploader.on('progress', function() {
        console.log("progress", uploader.progressMd5Amount,
            uploader.progressAmount, uploader.progressTotal);
    });
    uploader.on('end', function() {
        console.log("done uploading");
    });
}

function download(recordingUrl, cb) {
    var filename = recordingUrl.replace(/^.*[\\\/]/, '');
    var saveFile = path.join(tmpDir, filename);
    var download = request(recordingUrl);
    download.on('response', function(response) {
        console.log(response.statusCode);
        console.log(response.headers['content-type']);
    });
    download.pipe(fs.createWriteStream(saveFile));
    download.on('end', function() {
        return cb(null, saveFile);
    });
}

module.exports = {
    getAsset: getAsset,
    download: download
};