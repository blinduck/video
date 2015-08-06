# Video Encoding

## Intro
When I was reading up on video encoding I came across [adaptive bitrate streaming](https://en.wikipedia.org/wiki/Adaptive_bitrate_streaming) and wanted to try it out. 

The site lets you upload a video and converts it to:
* 320x180.webm
* 640x360.webm
* 1280x720.webm
* audio_only.webm

FFmpeg is used for conversion and also to create a manifest file. 
The site then streams based the (theoretically) streams the correct video file depending on the clients bandwidth.


## Notes
The site is a POC.
Browswers:
    - Works on chrome
    - Does not work on Firefox (no Media Source Extensions support yet)
    - Didn't manage to test on Safari or IE.










