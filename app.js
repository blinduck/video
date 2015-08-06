var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var siofu = require('socketio-file-upload');
var ffmpeg = require('fluent-ffmpeg');
var exec = require('child_process').exec;
var Q = require('q');

app.use(express.static('public'));
app.use(siofu.router);


app.get('/', function (req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

//socket.io used for uploading files and to inform client of progress
io.on('connection', function (socket) {

  socket.join(socket.id);

  //instantiate SocketIO uploader
  var uploader = new siofu();
  uploader.dir = "public/uploads";
  uploader.listen(socket);



  uploader.on('saved', function (evt) {
    // Video is saved, start conversion process
    var d1 = convertVideo("320x180", "500k", evt.file.pathName, evt.file.meta.client_id);
    var d2 = convertVideo("640x360", "1000k", evt.file.pathName, evt.file.meta.client_id);
    var d3 = convertVideo("1280x720", "1500k", evt.file.pathName, evt.file.meta.client_id);
    var d4 = convertAudio(evt.file.pathName, evt.file.meta.client_id);

    // All conversions complete, create manifest file from converted files
    Q.allSettled([d1,d2,d3,d4]).then(function(res) {

      createManifest(res[0].value, res[1].value, res[2].value, res[3].value, evt.file.meta.client_id)
        .then(function(url) {
          //inform client that all conversions are done.
          //send manifest url so that client can play the file
          io.to(evt.file.meta.client_id).emit('conversion_complete', {type:"dash"});
          io.to(evt.file.meta.client_id).emit('ready_to_play', {url:url});
        }, function(error) {
          console.log('error from create manifest', error);
        });
    })
  })
});

function convertVideo(size, bitrate, input_file, client_id) {
  // Returns a promise that is resolved once conversion is complete
  // This method should be refactored, it does a lot more then just convert the video

  var d = Q.defer();
  var output_path = "public/converted/video_" + size + "_" + bitrate + "_" + client_id + ".webm";

  ffmpeg(input_file)
    .videoCodec("libvpx")
    .size(size)
    .outputOptions('-b:v', bitrate, '-an', '-f', 'webm', '-dash', "1")
    .on("error", function (err) {
      console.log(err);
      d.reject()
    })
    .on('progress', function (evt) {
      io.to(client_id).emit('conversion_progress', {
        type: size,
        percent: evt.percent
      });
    })
    .on('end', function () {
      console.log("conversion complete", output_path);
      io.to(client_id).emit('conversion_complete', { type: size });
      d.resolve(output_path)
    })
    .save(output_path);
  return d.promise;
}


function convertAudio(input_file, client_id) {
  // Returns a promise that is resolved once conversion is complete
  // This method should be refactored, it does a lot more then just convert to audio

  var d = Q.defer();
  var output_path = "public/converted/audio_128k_" + client_id + ".webm";
  ffmpeg(input_file)
    .audioCodec("libvorbis")
    .outputOptions("-vn", "-f", "webm", "-dash", "1", "-y")
    .on("error", function (err) {
      d.reject();
    })
    .on('progress', function (evt) {
      io.to(client_id).emit('conversion_progress', {
        type: "audio",
        percent: evt.percent
      });
    })
    .on('end', function () {
      io.to(client_id).emit('conversion_complete', {type: "audio"});
      d.resolve(output_path);
    })
    .save(output_path);
  return d.promise;
}


function createManifest(f1,f2,f3,f4, client_id) {
  // Returns a promise that is resolved once manifest file created
  var d = Q.defer();
  var output_file = 'converted/' + client_id +'manifest.mpd';
  var cmd =
    'ffmpeg -y ' +
    ' -f webm_dash_manifest -i ' + f1 +
    ' -f webm_dash_manifest -i ' + f2 +
    ' -f webm_dash_manifest -i ' + f3 +
    ' -f webm_dash_manifest -i ' + f4 +
    ' -c copy -map 0 -map 1 -map 2 -map 3 ' +
    ' -f webm_dash_manifest ' +
    ' -adaptation_sets "id=0,streams=0,1,2 id=1,streams=3" public/' + output_file;

  exec(cmd, function (error, stdout, stderr) {
    console.log(error, stdout, stderr);
    console.log('from manifest, error:', error);
    if (error == null) d.resolve(output_file);
    d.reject(error)
  });
  return d.promise
}


var server = http.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Running at http://%s:%s', host, port);
});


