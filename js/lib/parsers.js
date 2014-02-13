// Generated by CoffeeScript 1.7.1
"use strict";
var duration, http, https, parsers, request, util, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

http = require("http");

util = require('util');

duration = require('mpm.duration');

_ = require('underscore');

https = require('https');

request = require('request');

parsers = exports;


/*
 * VideoData
 * @param {String|Object} title | params : title or a param object with all constructor params
 * @param {String} description
 * @param {String} thumbnail
 * @param {String} duration
 * @param {String} publishedAt
 * @param {String} originalId
 * @param {String} provider
 * @param {String} meta
 */

parsers.VideoData = (function() {
  function VideoData(title, description, thumbnail, duration, publishedAt, originalId, provider, meta) {
    var params;
    this.title = title;
    this.description = description;
    this.thumbnail = thumbnail;
    this.duration = duration;
    this.publishedAt = publishedAt;
    this.originalId = originalId;
    this.provider = provider;
    this.meta = meta;
    if (typeof this.title === 'object') {
      params = this.title;
      this.title = params.title;
      this.description = params.description;
      this.thumbnail = params.thumbnail;
      this.duration = params.duration;
      this.publishedAt = params.publishedAt;
      this.originalId = params.originalId;
      this.provider = params.provider;
      this.meta = params.meta;
    }
  }

  return VideoData;

})();


/*
 * Provide access to a website video apiUrl
 * @constructor
 * @param {String} name Baseparser name
 */

parsers.BaseVideo = (function() {
  function BaseVideo(name) {
    this.name = name;
  }


  /*
  * get video data from video id
  * @param  {String}   id
  * @param  {Function} callback (err,data)=>{}
  * @return {Void}
   */

  BaseVideo.prototype.getVideoDataFromId = function(id, callback) {};


  /*
  * get video id from url
  * @param  {String} url
  * @return {String}
   */

  BaseVideo.prototype.getIdFromUrl = function(url) {};


  /*
  * validate url
  * @param  {String}  url
  * @return {Boolean}
   */

  BaseVideo.prototype.isValidUrl = function(url) {};


  /*
   * Method to call to get data from video url
   * @param url
   * @param callback
   * @returns {*}
   */

  BaseVideo.prototype.parse = function(url, callback) {
    return this.getVideoDataFromUrl(url, callback);
  };

  BaseVideo.prototype.request = request;

  return BaseVideo;

})();


/*
 * Parse a Youtube video Url to extract informations
 * @constructor
 * @param {string} apikey
 */

parsers.YoutubeVideo = (function(_super) {
  __extends(YoutubeVideo, _super);


  /*
   * @param  {String} apikey Youtube api key
   */

  function YoutubeVideo(apikey) {
    YoutubeVideo.__super__.constructor.call(this, "youtube");
    this.regexp = /((http|https):\/\/)?(www\.)?youtube\.com\/watch\?v=([a-z A-Z 0-9 \- _]+)/;
    this.setApiKey(apikey);
  }


  /*get api key */

  YoutubeVideo.prototype.getApiKey = function() {
    return this._apiKey;
  };


  /*set api key */

  YoutubeVideo.prototype.setApiKey = function(_apiKey) {
    this._apiKey = _apiKey;
    return this;
  };


  /*extract id from url */

  YoutubeVideo.prototype.getIdFromUrl = function(url) {
    var match;
    if (this.isValidUrl(url)) {
      match = url.match(this.regexp);
      return match[match.length - 1];
    }
  };


  /*can url  be handled by parser */

  YoutubeVideo.prototype.isValidUrl = function(url) {
    return this.regexp.test(url);
  };


  /*get api url */

  YoutubeVideo.prototype.getApiUrl = function(videoId, apiKey) {
    return "https://www.googleapis.com/youtube/v3/videos?id=" + videoId + "&part=snippet,contentDetails&key=" + apiKey;
  };


  /*get videodata from url */

  YoutubeVideo.prototype.getVideoDataFromUrl = function(url, callback) {
    var id;
    id = this.getIdFromUrl(url);
    return this.getVideoDataFromId(id, callback);
  };


  /*get videodata from id */

  YoutubeVideo.prototype.getVideoDataFromId = function(id, callback) {
    var options;
    options = {
      url: this.getApiUrl(id, this.getApiKey()),
      json: true
    };
    return this.request(options, function(err, clientResponse, json) {
      var item;
      item = json.items[0];
      if (item === void 0) {
        return callback(new Error("Video with id " + id + " not found"));
      } else {
        return callback(err, new parsers.VideoData({
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.medium.url,
          duration: duration.parse(item.contentDetails.duration),
          publishedAt: new Date(item.snippet.publishedAt),
          originalId: item.id,
          provider: "youtube",
          meta: item
        }));
      }
    });
  };

  return YoutubeVideo;

})(parsers.BaseVideo);

//# sourceMappingURL=parsers.map
