// Generated by CoffeeScript 1.7.1
"use strict";
var duration, parsers, request, util, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

util = require('util');

duration = require('mpm.duration');

_ = require('lodash');

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
 * @param {Number} categoryId
 * @param {String} meta
 */

parsers.VideoData = (function() {
  function VideoData(title, description, thumbnail, duration, publishedAt, originalId, provider, originalCategoryId, meta) {
    var _ref;
    this.title = title;
    this.description = description;
    this.thumbnail = thumbnail;
    this.duration = duration;
    this.publishedAt = publishedAt;
    this.originalId = originalId;
    this.provider = provider;
    this.originalCategoryId = originalCategoryId;
    this.meta = meta;
    if (typeof this.title === 'object') {
      _ref = this.title, this.title = _ref.title, this.description = _ref.description, this.thumbnail = _ref.thumbnail, this.duration = _ref.duration, this.publishedAt = _ref.publishedAt, this.originalId = _ref.originalId, this.originalCategoryId = _ref.originalCategoryId, this.provider = _ref.provider, this.meta = _ref.meta, this.url = _ref.url;
    }
  }

  return VideoData;

})();

parsers.Base = (function() {

  /*
   * Provide access to a website video apiUrl
   * @constructor
   * @param {String} name Baseparser name
   */
  function Base() {}


  /*
  * validate url
  * @param  {String}  url
  * @return {Boolean}
   */

  Base.prototype.isValidUrl = function(url) {
    throw "Must be implemented in a sub class";
  };


  /*
   * Method to call to get data from video url
   * @async
   * @param url
   * @param callback
   * @returns {*}
   */

  Base.prototype.parse = function(url, callback) {
    throw "Must be implemented in a sub class";
  };

  Base.prototype._request = request;

  Base.prototype._notValidUrl = function(url, name) {
    if (name == null) {
      name = "*";
    }
    return new Error("" + url + " is not a valid " + name + " url");
  };

  Base.prototype.toString = function() {
    return '[object parsers.Base]';
  };

  return Base;

})();

parsers.Vimeo = (function(_super) {
  __extends(Vimeo, _super);

  function Vimeo(_access_token) {
    this._access_token = _access_token;
    this._regexp = /^((http|https):\/\/)?vimeo\.com\/(\w+)/i;
    this._name = "vimeo";
  }

  Vimeo.prototype.isValidUrl = function(url) {
    return url.match(this._regexp);
  };

  Vimeo.prototype.parse = function(url, callback) {
    var id, match, options, self;
    self = this;
    if (this.isValidUrl(url)) {
      match = url.match(this._regexp);
      id = match.pop();
      options = {
        url: "https://api.vimeo.com/videos/" + id,
        headers: {
          "Authorization": "Bearer " + this._access_token
        },
        json: true
      };
      return this._request(options, function(error, response, body) {
        var video;
        if (body && body.uri) {
          video = new parsers.VideoData({
            url: body.link,
            title: body.name,
            description: body.description,
            originalId: id,
            duration: (function() {
              var d;
              d = new duration.Duration();
              d.seconds = body.duration;
              return d;
            })(),
            thumbnail: body.pictures[4].link,
            publishedAt: body.created_time,
            provider: self._name,
            meta: body,
            categoryId: null
          });
          return callback(null, video);
        } else {
          return callback(error);
        }
      });
    } else {
      return callback(this._notValidUrl(url, this._name));
    }
  };

  return Vimeo;

})(parsers.Base);

parsers.Youtube = (function(_super) {
  __extends(Youtube, _super);


  /*
   * @param  {String} apikey Youtube api key
   */

  function Youtube(apikey) {
    Youtube.__super__.constructor.call(this, "youtube");
    this.regexp = /((http|https):\/\/)?(www\.)?youtube\.com\/watch\?v=([a-z A-Z 0-9 \- _]+)/;
    this.setApiKey(apikey);
  }

  Youtube.prototype.parse = function(url, callback) {
    return this._getVideoDataFromUrl(url, callback);
  };


  /*get api key */

  Youtube.prototype.getApiKey = function() {
    return this._apiKey;
  };


  /*set api key */

  Youtube.prototype.setApiKey = function(_apiKey) {
    this._apiKey = _apiKey;
    return this;
  };


  /*extract id from url */

  Youtube.prototype._getIdFromUrl = function(url) {
    var match;
    if (this.isValidUrl(url)) {
      match = url.match(this.regexp);
      return match[match.length - 1];
    }
  };


  /*can url  be handled by parser */

  Youtube.prototype.isValidUrl = function(url) {
    return this.regexp.test(url);
  };


  /*get api url */

  Youtube.prototype.getApiUrl = function(videoId, apiKey) {
    return "https://www.googleapis.com/youtube/v3/videos?id=" + videoId + "&part=snippet,contentDetails&key=" + apiKey;
  };


  /*get videodata from url */

  Youtube.prototype._getVideoDataFromUrl = function(url, callback) {
    var id;
    id = this._getIdFromUrl(url);
    return this._getVideoDataFromId(id, callback, url);
  };


  /*get videodata from id */

  Youtube.prototype._getVideoDataFromId = function(id, callback, url) {
    var options;
    if (url == null) {
      url = "";
    }
    options = {
      url: this.getApiUrl(id, this.getApiKey()),
      json: true
    };
    return this._request(options, function(err, clientResponse, json) {
      var item;
      item = json.items[0];
      if (item === void 0) {
        return callback(new Error("Video with id " + id + " not found"));
      } else {
        return callback(err, new parsers.VideoData({
          url: url,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.medium.url,
          duration: duration.parse(item.contentDetails.duration),
          publishedAt: new Date(item.snippet.publishedAt),
          originalId: item.id,
          originalCategoryId: item.snippet.categoryId,
          provider: "youtube",
          meta: item
        }));
      }
    });
  };

  return Youtube;

})(parsers.Base);

parsers.YoutubeShort = (function(_super) {
  __extends(YoutubeShort, _super);

  function YoutubeShort() {
    YoutubeShort.__super__.constructor.apply(this, arguments);
    this.regexp = /(?:(?:http|https):\/\/)?youtu\.be\/([\d \w _ -]+)/i;
  }

  YoutubeShort.prototype._getIdFromUrl = function(url) {
    return url.match(this.regexp).pop();
  };

  return YoutubeShort;

})(parsers.Youtube);

parsers.Dailymotion = (function(_super) {
  __extends(Dailymotion, _super);

  function Dailymotion() {
    this._regexp = /(?:https?\:\/\/)?(?:(?:www\.)?dailymotion\.com\/video\/)([\w \- \_ ]+)/i;
  }

  Dailymotion.prototype.isValidUrl = function(url) {
    return url.match(this._regexp);
  };

  Dailymotion.prototype.parse = function(url, callback) {
    var _id, _options;
    if (this.isValidUrl(url)) {
      _id = url.match(this._regexp).pop();
      _options = {
        json: true,
        method: "GET",
        url: "https://api.dailymotion.com/video/" + _id + "?fields=title,created_time,description,duration%2Cduration_formatted%2Cid%2Cowner%2Cpublished%2Cthumbnail_240_url%2Ctype%2Curl"
      };
      return this._request(_options, function(err, response, body) {
        if (err) {
          return callback(err);
        } else {
          return callback(null, {
            title: body.title,
            description: body.description,
            url: body.url,
            publishedAt: body.created_time,
            meta: body,
            originalId: _id,
            thumbnail: body.thumbnail_240_url,
            provider: "dailymotion",
            duration: (function() {
              var d;
              d = new duration.Duration();
              d.seconds = body.duration;
              return d;
            })()
          });
        }
      });
    } else {
      return callback(new Error("" + url + " is not a valid dailymotion url"));
    }
  };

  return Dailymotion;

})(parsers.Base);


/*
 * Chain of responsability , allows getting videos from multiple video apis
 */

parsers.Chain = (function(_super) {
  __extends(Chain, _super);

  function Chain(_parsers) {
    this._parsers = _parsers != null ? _parsers : [];
  }

  Chain.prototype.push = function() {
    var _ref;
    return (_ref = this._parsers).push.apply(_ref, arguments);
  };

  Chain.prototype.pop = function() {
    var _ref;
    return (_ref = this._parsers).pop.apply(_ref, arguments);
  };

  Chain.prototype.remove = function(parser) {
    return this._parsers.splice(this._parsers.indexOf(parser), 1);
  };

  Chain.prototype.isValidUrl = function(url) {
    return this._parsers.some(function(parser) {
      return parser.isValidUrl(url);
    });
  };

  Chain.prototype.parse = function(url, callback) {
    var parser;
    parser = this._find(url);
    if (!parser) {
      return callback(new Error("Url " + url + " is not supported among parsers"));
    } else {
      return parser.parse(url, callback);
    }
  };

  Chain.prototype._find = function(url) {
    return this._parsers.filter(function(parser) {
      return parser.isValidUrl(url);
    })[0];
  };

  return Chain;

})(parsers.Base);

//# sourceMappingURL=parsers.map
