$(document).ready(function () {

    var socket = io();

    function initPlayer(){
        // Install polyfills.
        shaka.polyfill.installAll();

        // Find the video element, construct player
        var video = document.getElementById('video');
        var player = new shaka.player.Player(video);

        // Attach the player, source and video to window
        window.player = player;
        window.source = source;
        window.video = video;

        // Listen for errors from the Player.
        player.addEventListener('error', function (event) {
            console.error(event);
        });

        // Construct a DashVideoSource to represent the DASH manifest.
        var mpdUrl = 'video/manifest.mpd';
        console.log(mpdUrl);
        var estimator = new shaka.util.EWMABandwidthEstimator();
        var source = new shaka.player.DashVideoSource(mpdUrl, null, estimator);

        // Load the source into the Player.
        player.load(source);

        show_data_on_screen();
    }
    initPlayer();

    //get dom elements which are used to show data about video streams
    var vid1_data = document.getElementById("vid1");
    var vid2_data = document.getElementById("vid2");
    var vid3_data = document.getElementById("vid3");

    // Show data about the video streams and which one is active to the client
    function show_data_on_screen() {
        window.setTimeout(function () {
            track1 = window.player.getVideoTracks()[0];
            vid1_data.innerHTML = track1.width + "x" + track1.height + ", Active:" + track1.active;
            track2 = window.player.getVideoTracks()[1];
            vid2_data.innerHTML = track2.width + "x" + track2.height + ", Active:" + track2.active;
            track3 = window.player.getVideoTracks()[2];
            vid3_data.innerHTML = track3.width + "x" + track3.height + ", Active:" + track3.active;
            show_data_on_screen();
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

    //Show upload progress to client
    var upload_progress = document.getElementById("upload_progress");
    uploader.addEventListener('progress', function (evt) {
        upload_progress.innerHTML = "Upload Progress: " + Math.floor(evt.bytesLoaded / evt.file.size)*100 + "%";
        console.log('progress', evt.bytesLoaded / evt.file.size);
    });
    uploader.addEventListener('complete', function (evt) {
        upload_progress.innerHTML = "Upload: Complete";
    });



    // dom elements used to show data about conversion progress
    conversion_indicators = {
        "320x180" :  document.getElementById('small_conv_progress'),
        "640x360" :  document.getElementById('med_conv_progress'),
        "1280x720" :  document.getElementById('large_conv_progress'),
        "audio": document.getElementById("audio_conv_progress"),
        "dash": document.getElementById("dash_manifest")
    };


    /*
    *  Listen for the video conversion events
    *  and show conversion progress to the client
    * */
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
