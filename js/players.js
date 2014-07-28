// Generated by CoffeeScript 1.7.1
var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = function(container) {
  return container.set('players', container.share(function(c) {
    var not_implemented_here, players, util, _;
    util = require('util');
    _ = require('lodash');
    players = {};
    not_implemented_here = function() {
      throw "not implemented here!";
    };

    /*
    	helps render video players
     */
    players.Base = (function() {
      function Base() {}

      Base.prototype.toJSON = function() {
        return not_implemented_here();
      };

      Base.prototype.render = function() {
        return not_implemented_here();
      };

      return Base;

    })();
    players.Youtube = (function(_super) {
      __extends(Youtube, _super);

      Youtube.canPlay = function(video) {
        return "youtube" === video.provider;
      };

      function Youtube(video_id, options) {
        this.video_id = video_id;
        this.options = options != null ? options : {};
        _.defaults(this.options, {
          frameborder: 0,
          height: 480,
          width: 640,
          allowfullscreen: "true"
        });
        this.src = "//www.youtube.com/embed/" + this.video_id;
      }

      Youtube.prototype.toJSON = function() {
        return {
          src: this.src,
          width: this.options.width,
          height: this.options.height,
          frameborder: this.options.frameborder,
          allowfullscreen: this.options.allowfullscreen
        };
      };

      Youtube.prototype.toHTML = function() {
        var data;
        data = this.toJSON();
        return "<iframe width=\"" + data.width + "\" \n                    height=\"" + data.height + "\" src=\"" + data.src + "\" \n                    frameborder=\"{data.frameborder}\" \n                    " + (data.allowfullscreen ? "allowfullscreen" : void 0) + "></iframe>";
      };

      return Youtube;

    })(players.Base);
    players.Vimeo = (function(_super) {
      __extends(Vimeo, _super);

      Vimeo.canPlay = function(video) {
        return "vimeo" === video.provider;
      };

      function Vimeo(_videoId, _options) {
        this._videoId = _videoId;
        this._options = _options != null ? _options : {};
        _.defaults(this._options, {
          width: 640,
          height: 480
        });
        this._provider = "vimeo";
      }

      Vimeo.prototype.toJSON = function() {
        return {
          id: this._videoId,
          width: this._options.width,
          height: this._options.height
        };
      };

      Vimeo.prototype.toHTML = function() {
        var data;
        data = this.toJSON();
        return "<iframe src=\"//player.vimeo.com/video/" + data.id + "\" \nwidth=\"" + data.width + "\" height=\"" + data.height + "\" frameborder=\"0\" \nwebkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>";
      };

      return Vimeo;

    })(players.Base);
    players.Dailymotion = (function(_super) {
      __extends(Dailymotion, _super);

      Dailymotion.canPlay = function(video) {
        return "dailymotion" === video.provider;
      };

      function Dailymotion(_videoId, _options) {
        this._videoId = _videoId;
        this._options = _options != null ? _options : {};
        _.defaults(this._options, {
          width: 640,
          height: 480
        });
      }

      Dailymotion.prototype.toJSON = function() {
        return {
          id: this._videoId,
          width: this._options.width,
          height: this._options.height
        };
      };

      Dailymotion.prototype.toHTML = function() {
        var data;
        data = this.toJSON();
        return "<iframe src=\"//www.dailymotion.com/embed/video/" + data.id + "\"\nwidth=\"" + data.width + "\" height=\"" + data.height + "\" frameborder=\"0\"\nwebkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>";
      };

      return Dailymotion;

    })(players.Base);
    players.PlayerFactory = (function() {
      function PlayerFactory(_players) {
        this._players = _players != null ? _players : [];
      }

      PlayerFactory.prototype.push = function() {
        var _ref;
        return (_ref = this._players).push.apply(_ref, arguments);
      };

      PlayerFactory.prototype.pop = function() {
        return this._players.pop();
      };

      PlayerFactory.prototype.remove = function(player) {
        return this._players.splice(this._players.indexOf(player), 1);
      };

      PlayerFactory.prototype.fromVideo = function(video, options) {
        var _Player;
        _Player = this._players.filter(function(_Player) {
          return _Player.canPlay(video);
        })[0];
        if (_Player) {
          return new _Player(video.originalId, options);
        }
      };

      return PlayerFactory;

    })();
    return players;
  }));
};

//# sourceMappingURL=players.map
