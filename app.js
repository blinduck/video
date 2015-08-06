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
  console.log('index page');
  res.sendFile(__dirname + "/public/index.html");
});

io.on('connection', function (socket) {

  socket.join(socket.id);

  var uploader = new siofu();
  uploader.dir = "public/uploads";
  uploader.listen(socket);

  socket.on('chat message', function (msg) {
    console.log('message', msg);
    io.emit('chat message', msg);
  });

  uploader.on('saved', function (evt) {
    io.to(evt.file.meta.client_id)
      .emit('upload_complete', "Converting Video Now");

    //convertVideo(evt.file.pathName, evt.file.meta.client_id, evt.file.name, "libx264")
    var d1 = convertVideo("320x180", "500k", evt.file.pathName, evt.file.meta.client_id);
    var d2 = convertVideo("640x360", "1000k", evt.file.pathName, evt.file.meta.client_id);
    var d3 = convertVideo("1280x720", "1500k", evt.file.pathName, evt.file.meta.client_id);
    var d4 = convertAudio(evt.file.pathName, evt.file.meta.client_id);
    Q.allSettled([d1,d2,d3,d4]).then(function(res) {
      console.log(res);
      createManifest(res[0].value, res[1].value, res[2].value, res[3].value, evt.file.meta.client_id)
        .then(function(url) {
          console.log('url', url);
          io.to(evt.file.meta.client_id).emit('conversion_complete', {type:"dash"});
          io.to(evt.file.meta.client_id).emit('ready_to_play', {url:url});
        }, function(error) {
          console.log('error from create manifest', error);
        });
    })
  })
});

function convertVideo(size, bitrate, input_file, client_id) {
  var d = Q.defer();
  var output_path = "public/converted/video_" + size + "_" + bitrate + "_" + client_id + ".webm";

  ffmpeg(input_file)
    .videoCodec("libvpx")
    .size(size)
    //.outputOptions('-b:v', bitrate, '-keyint_min', '150', '-g', '150', '-an', '-f', 'webm', '-dash', "1")
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
  var d = Q.defer();
  var output_path = "public/converted/audio_128k_" + client_id + ".webm";
  ffmpeg(input_file)
    .audioCodec("libvorbis")
    //.audioCodec("libmp3lame")
    //.outputOptions("-b:a", "128k", "-vn", "-f", "webm", "-dash", "1", "-y")
    .outputOptions("-vn", "-f", "webm", "-dash", "1", "-y")
    .on("error", function (err) {
      console.log(err);
      d.reject();
    })
    .on('progress', function (evt) {
      console.log(evt.percent);
      io.to(client_id).emit('conversion_progress', {
        type: "audio",
        percent: evt.percent
      });
    })
    .on('end', function () {
      console.log("conversion complete", output_path);
      io.to(client_id).emit('conversion_complete', {type: "audio"});
      d.resolve(output_path);
    })
    .save(output_path);
  return d.promise;
}

function test(filename) {
  convertAudio(filename, "").then(
    function (success) {
      console.log(success);
    }, function(error) {
      console.log('error');
    });
}
//test('public/video/MakeUp.mov');



function createManifest(f1,f2,f3,f4, client_id) {
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
  console.log('manifest command', cmd);

  exec(cmd, function (error, stdout, stderr) {
    console.log(error, stdout, stderr);
    console.log('from manifest, error:', error);
    if (error == null) d.resolve(output_file);
    d.reject(error)
  });
  return d.promise
}

//convert2("320x180", "500k");
//convert2("640x360", "1000k");
//convert2("1280x720", "1500k");
//convertAudio();
//createManifest();

//ffmpeg("public/shaka/itunes.mov")
//  .videoCodec("libvpx")
//  .size('320x180')
//  .outputOptions('-b:v', '500k', '-keyint_min', '150','-g', '150', '-an', '-f', 'webm', '-dash', "1")
//  .on("error", function (err) {
//    console.log(err);
//  })
//  .on('progress', function (evt) {
//    console.log(evt.percent);
//  }).save("public/test2/test.webm");


var server = http.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Running at http://%s:%s', host, port);
});


