/*jslint nomen:true,white:true,node:true,es5:true*/
/*global require,it,describe,beforeEach */

"use strict";
var assert = require('assert'),
    request = require('supertest'),
    lib = require('../lib'),
    config = lib.config,
    YoutubeUrlParser = lib.videoUrlParser.YoutubeUrlParser;

describe("YoutubeUrlParser", function() {
    var youtube_url = 'http://www.youtube.com/watch?v=7lCDEYXw3mM',
        youtube_video_id = '7lCDEYXw3mM';

    beforeEach(function() {
        this.youtubeUrlParser = new YoutubeUrlParser(config.youtube_api_key);
        this.youtubeUrls = ['http://www.youtube.com/watch?v=rFxcsgVwmTM', 'http://www.youtube.com/watch?v=7lCDEYXw3mM'];
    });
    
    it('has an api key', function() {
        assert(this.youtubeUrlParser.getApiKey());
    });
    it('should validate url', function() {
        this.youtubeUrls.forEach(function(url) {
            assert(this.youtubeUrlParser.isValidUrl(url), url + " should be a valid url");
        }, this);
    });
    it('should find youtube video datas', function(done) {
        this.youtubeUrlParser.parse(youtube_url, function(err, result) {
            assert.equal(result.originalId, youtube_video_id);
            assert.equal(err, null);
            done();
        });
    });
});