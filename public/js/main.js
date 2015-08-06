$(document).ready(function () {

    var socket = io();

    function initPlayer(){
        // Install polyfills.
        shaka.polyfill.installAll();

        // Find the video element.
        var video = document.getElementById('video');
        window.video = video;
        // Construct a Player to wrap around it.
        var player = new shaka.player.Player(video);

        // Attach the player to the window so that it can be easily debugged.
        window.player = player;
        window.source = source;

        // Listen for errors from the Player.
        player.addEventListener('error', function (event) {
            console.error(event);
        });

        // Construct a DashVideoSource to represent the DASH manifest.
        //var mpdUrl = 'http://turtle-tube.appspot.com/t/t2/dash.mpd';
        var mpdUrl = 'video/manifest.mpd';
        console.log(mpdUrl);
        var estimator = new shaka.util.EWMABandwidthEstimator();
        var source = new shaka.player.DashVideoSource(mpdUrl, null, estimator);

        // Load the source into the Player.
        player.load(source);

        player.addEventListener('adaptation', function (evt) {
            console.log('adaptation', evt);
        });


        log_data();
    }

    initPlayer();

    var vid1 = $('#vid1');
    var vid2 = $('#vid2');
    var vid3 = $('#vid3');

    function log_data() {
        window.setTimeout(function () {
            track1 = window.player.getVideoTracks()[0];
            vid1.html(track1.width + "x" + track1.height + ", Active:" + track1.active);
            track2 = window.player.getVideoTracks()[1];
            vid2.html(track2.width + "x" + track2.height + ", Active:" + track2.active);
            track3 = window.player.getVideoTracks()[2];
            vid3.html(track3.width + "x" + track3.height + ", Active:" + track3.active);
            //console.log(window.source.videoWidth, window.source.videoHeight);
            //console.log('video tracks', player.getVideoTracks());
            log_data();
        }, 1000)
    }



    //Handle uploading of files
    var uploader = new SocketIOFileUpload(socket);
    uploader.listenOnSubmit(
        document.getElementById('submit_button'),
        document.getElementById('file_input')
    );
    uploader.addEventListener('start', function (event) {
        event.file.meta.client_id = socket.id;
        console.log('file upload started');
    });

    var upload_progress = $("#upload_progress");
    uploader.addEventListener('progress', function (evt) {
        upload_progress.html("Upload Progress: " + Math.floor(evt.bytesLoaded / evt.file.size)*100 + "%");
        console.log('progress', evt.bytesLoaded / evt.file.size);
    });
    uploader.addEventListener('complete', function (evt) {
        upload_progress.html("Upload Complete");
    });

    conversion_indicators = {
        "320x180" :  document.getElementById('small_conv_progress'),
        "640x360" :  document.getElementById('med_conv_progress'),
        "1280x720" :  document.getElementById('large_conv_progress'),
        "audio": document.getElementById("audio_conv_progress"),
        "dash": document.getElementById("dash_manifest")
    };

    //listen for the video conversion events
    socket.on("upload_complete", function (msg) {
        console.log('upload complete', msg);

    });
    socket.on("conversion_complete", function (msg) {
        console.log('conversion complete', msg);
        conversion_indicators[msg.type].innerHTML = "Complete"
    });

    socket.on('conversion_progress', function (msg) {
        conversion_indicators[msg.type].innerHTML = Math.floor(msg.percent) + "%";
    });
    socket.on('ready_to_play', function (msg) {
        console.log('received ready to play', msg.url);
        var estimator = new shaka.util.EWMABandwidthEstimator();
        var source = new shaka.player.DashVideoSource(msg.url, null, estimator);
        window.player.load(source);
    })

});
