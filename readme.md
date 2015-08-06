# Video Encoding

## Intro
When I was reading up on video encoding I came across [adaptive bitrate streaming](https://en.wikipedia.org/wiki/Adaptive_bitrate_streaming) and wanted to try it out. 

The site is built with node and express. It lets you upload a video and converts it to:
* 320x180.webm
* 640x360.webm
* 1280x720.webm
* audio_only.webm

FFmpeg is used for conversion and also to create a manifest file. 
The site then streams streams the correct video file depending on the clients bandwidth.

##Setup
git clone
npm install
node app.js

## Notes
**Browsers**
* Works on chrome
* Does not work on Firefox (no Media Source Extensions support yet)
* Didn't manage to test on Safari or IE.

I only managed to test out [Shaka Player](https://github.com/google/shaka-player). I tried using [dash.js](https://github.com/Dash-Industry-Forum/dash.js/) but could not get it to work.
I used FFmpeg to create my manifest files but after reading up a bit more, seems like [DashEncoder](https://github.com/slederer/DASHEncoder) might be better.





