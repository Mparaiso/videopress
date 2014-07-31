// Generated by CoffeeScript 1.7.1

/*
    Copyright © 2014 mparaiso <mparaiso@online.fr>. All Rights Reserved.
 */
var async, bcrypt, _,
  __slice = [].slice;

async = require('async');

bcrypt = require('bcrypt-nodejs');

_ = require('lodash');

module.exports = function(container) {
  container.set('mongoose', container.share(function(c) {
    var mongoose, mongooseCachebox;
    mongoose = require('mongoose');
    mongooseCachebox = require('mongoose-cachebox');
    mongooseCachebox(mongoose, {
      cache: !c.debug,
      ttl: 30
    });
    return mongoose;
  }));
  container.set("db", container.share(function(c) {
    c.mongoose.set("debug", c.config.mongoose_debug);
    c.mongoose.connect(c.config.connection_string);
    return c.mongoose;
  }));
  container.set("connection", container.share(function(c) {
    return c.db.connection;
  }));
  container.set("Log", container.share(function(c) {
    var Log, LogSchema;
    LogSchema = c.db.Schema({
      message: Object,
      context: Object,
      level: Number,
      level_name: String,
      channel: String,
      datetime: Date,
      created_at: {
        type: Date,
        "default": Date.now
      },
      extra: Object
    });
    return Log = c.db.model('Log', LogSchema);
  }));
  container.set("Category", container.share(function(c) {
    var Category, CategorySchema;
    CategorySchema = c.db.Schema({
      title: {
        type: String,
        required: 'title is required'
      },
      provider: {
        type: String,
        "default": "youtube"
      },
      originalId: Number
    });

    /*
     * @return Promise<Array>
     * @TODO implement
     */
    CategorySchema.statics.whereVideoExist = function() {
      return c.q.ninvoke(c.Video, 'aggregate', [
        {
          $match: {
            category: {
              $exists: true
            }
          }
        }, {
          $group: {
            _id: "$category",
            total: {
              $sum: 1
            }
          }
        }
      ]).then(function(categories) {
        return Category.find({
          _id: {
            $in: _.pluck(categories, '_id')
          }
        }).exec();
      });
    };
    CategorySchema.statics.listAll = function() {
      return c.q(Category.find().exec());
    };
    CategorySchema.methods.toString = function() {
      return this.title;
    };
    Category = c.db.model('Category', CategorySchema);
    return Category;
  }));
  container.set("Video", container.share(function(c) {
    var Video, VideoSchema;
    VideoSchema = c.db.Schema({
      url: {
        type: String
      },
      owner: {
        type: c.db.Schema.Types.ObjectId,
        ref: 'User'
      },
      title: {
        type: String,
        required: "title is required"
      },
      description: {
        type: String
      },
      "private": {
        type: Boolean,
        "default": false
      },
      originalCategoryId: Number,
      category: {
        type: c.db.Schema.Types.ObjectId,
        ref: 'Category'
      },
      duration: Object,
      created_at: {
        type: Date,
        'default': Date.now
      },
      updated_at: {
        type: Date,
        'default': Date.now
      },
      publishedAt: {
        type: Date,
        'default': Date.now,
        required: "Must be a valid date for publishedAt"
      },
      originalId: String,
      provider: String,
      thumbnail: String,
      meta: Object,
      viewCount: {
        type: Number,
        "default": 0
      }
    });

    /* 
        create video from video url 
        if document already exist,return existing video
        @param url
        @param properties?
        @param {Function} callback
     */
    VideoSchema.statics.fromUrl = function(url, properties) {
      if (properties == null) {
        properties = {};
      }
      return c.q.ninvoke(c.videoParser, 'parse', url).then(function(data) {
        _.extend(data, properties);
        return [
          c.q(Video.findOne({
            owner: data.owner,
            url: data.url
          }).exec()), data
        ];
      }).spread(function(video, data) {
        if (video) {
          return video;
        } else {
          return Video.create(data);
        }
      });
    };
    VideoSchema.statics.findByOwnerId = function(id, cb) {
      var query;
      query = this.find({
        owner: id
      }).select('title thumbnail created_at owner').sort({
        created_at: -1
      }).populate('owner');
      if (cb) {
        return query.exec(cb);
      } else {
        return c.q(query.exec());
      }
    };
    VideoSchema.statics.findByCategoryId = function(id, cb) {
      var query;
      query = this.find({
        category: id
      }).select('title thumbnail created_at owner').sort({
        created_at: -1
      }).populate('owner');
      if (cb) {
        return query.exec(cb);
      } else {
        return c.q(query.exec());
      }
    };
    VideoSchema.statics.removeMultiple = function(idList, where) {
      if (idList == null) {
        idList = [];
      }
      if (where == null) {
        where = {};
      }

      /* remove multiple videos in id list , constrained by owner if necessary */
      return c.q(this.remove(_.extend(where, {
        _id: {
          $in: idList
        }
      })).exec());
    };
    VideoSchema.statics.list = function(query, callback, q) {
      if (query instanceof Function) {
        callback = query;
        query = {};
      }
      q = this.find(query).select('title thumbnail created_at owner').sort({
        created_at: -1
      }).populate('owner');
      if (callback) {
        return q.exec(callback);
      } else {
        return q;
      }
    };
    VideoSchema.statics.findPublicVideos = function(where, sort, limit, skip) {
      var query;
      if (where == null) {
        where = {};
      }
      if (sort == null) {
        sort = {
          created_at: -1
        };
      }
      if (limit == null) {
        limit = c.item_per_page;
      }
      where = _.extend(where, {
        "private": false
      });
      query = this.find(where).limit(c.item_per_page).skip(skip).sort(sort).populate('owner');
      return c.q(query.exec());
    };
    VideoSchema.statics.findOneById = function(id) {
      return c.q(Video.findById(id).select('title private description duration thumbnail provider owner publishedAt originalId category categoryId').populate('owner category').exec());
    };
    VideoSchema.statics.persist = function(video) {
      return c.q(video.save());
    };
    VideoSchema.methods.toString = function() {
      return this.title;
    };

    /*
     * find Similar 
     * @param  {Video}   video   
     * @param  {Object}   options  
     * @param  {Function} callback
     */
    VideoSchema.statics.findSimilar = function(video, options) {
      if (options == null) {
        options = {};
      }
      return this.find({
        category: video.category,
        _id: {
          '$ne': video.id
        }
      }, null, options).exec();
    };
    VideoSchema.pre('save', function(next) {
      this.updated_at = Date.now();
      if (!this.category && this.originalCategoryId) {
        return c.q(c.Category.findOne({
          originalId: this.originalCategoryId
        }).exec()).then(((function(_this) {
          return function(category) {
            _this.category = category;
            return null;
          };
        })(this)))["catch"](function() {
          return next().done(function() {
            return next();
          });
        });
      } else {
        return next();
      }
    });
    Video = c.db.model('Video', VideoSchema);
    return Video;
  }));
  container.set("Playlist", container.share(function(c) {
    var Playlist, PlaylistSchema, q;
    q = c.q;
    PlaylistSchema = c.db.Schema({
      title: {
        type: String,
        required: "title is required"
      },
      owner: {
        type: c.db.Schema.Types.ObjectId,
        ref: 'User'
      },
      thumbnail: String,
      description: String,
      videos: [
        {
          ref: 'Video',
          type: c.db.Schema.Types.ObjectId
        }
      ],
      video_urls: String,
      "private": {
        type: Boolean,
        "default": false
      },
      created_at: {
        type: Date,
        "default": Date.now
      },
      updated_at: {
        type: Date,
        "default": Date.now
      }
    });
    PlaylistSchema.pre('save', function(next) {

      /* 
       transform a string of video urls into video documents and add video ids to video field
       */
      var self, _props, _urls;
      self = this;
      this.updated_at = new Date;
      if (typeof this.video_urls === "string") {
        _urls = _.compact(this.video_urls.split(/[\s \n \r ,]+/));
        _props = this.owner ? {
          owner: this.owner
        } : {};
        return c.q.all(_urls.map(function(url) {
          return c.Video.fromUrl(url, _props)["catch"](function(err) {
            c.logger.err(err);
            return false;
          });
        })).then(function(videos) {
          var _ref;
          self.videos = _(videos).compact().pluck('id').value();
          self.thumbnail = (_ref = videos[0]) != null ? _ref.thumbnail : void 0;
          self.video_urls = _.pluck(videos, 'url').join("\r\n");
          return next();
        })["catch"](next);
      } else {
        return next();
      }
    });
    PlaylistSchema.statics.getLatest = function(limit, callback) {
      if (limit == null) {
        limit = 10;
      }
      if (limit instanceof Function) {
        callback = limit;
        limit = 10;
      }
      return Playlist.find().sort({
        updated_at: -1
      }).limit(10).exec(callback);
    };
    PlaylistSchema.statics.findByOwnerId = function(id, callback, q) {
      q = this.find({
        owner: id
      }).sort({
        created_at: -1
      }).populate('videos owner');
      if (callback) {
        return q.exec(callback);
      } else {
        return q;
      }
    };
    PlaylistSchema.statics.fromUrl = function(url, params) {

      /* @TODO fix playlist videos order in case videos already exist */
      return c.q.ninvoke(c.playlistParser, 'parse', url).then(function(playlist) {
        return [
          playlist, c.Video.find({
            originalId: {
              $in: _.pluck(playlist.videos, 'originalId')
            },
            owner: params.owner
          }).select('id originalId').exec()
        ];
      }).spread(function(playlist, alreadyExistingVideos) {

        /* create videos that are not already owned by user */
        var alreadyExistingOriginalIds;
        alreadyExistingOriginalIds = _.pluck(alreadyExistingVideos, 'originalId');
        return [playlist, alreadyExistingVideos].concat(playlist.videos.filter(function(vid) {
          return alreadyExistingOriginalIds.indexOf(vid.originalId) < 0;
        }).map(function(video) {
          return c.Video.create(_.extend(video, {
            owner: params.owner,
            category: params.category
          }));
        }));
      }).spread((function(_this) {
        return function() {
          var alreadyExistingVideos, playlist, videos, _ref;
          playlist = arguments[0], alreadyExistingVideos = arguments[1], videos = 3 <= arguments.length ? __slice.call(arguments, 2) : [];

          /* create playlist ,the id list is the concatenation of already existing videos and newly created videos */
          return c.q(_this.create(_.extend(playlist, {
            thumbnail: (_ref = videos[0]) != null ? _ref.thumbnail : void 0,
            owner: params.owner,
            videos: _.pluck(videos, 'id').concat(_.pluck(alreadyExistingVideos, 'id'))
          })));
        };
      })(this));
    };
    PlaylistSchema.statics.persist = function() {
      var options, playlist, _ref;
      playlist = arguments[0], options = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return (_ref = c.q).ninvoke.apply(_ref, [playlist, 'save'].concat(__slice.call(options)));
    };
    PlaylistSchema.methods.toString = function() {
      return this.title;
    };
    PlaylistSchema.methods.getFirstVideo = function() {
      return this.videos[0];
    };
    PlaylistSchema.methods.hasNextVideo = function(video) {
      var _ref;
      if ((0 <= (_ref = this.videos.indexOf(this.videos.filter(function(vid) {
        return vid.id === video.id;
      })[0])) && _ref < this.videos.length - 1)) {
        return true;
      } else {
        return false;
      }
    };
    PlaylistSchema.methods.hasPreviousVideo = function(video) {
      if (this.videos.indexOf(this.videos.filter(function(vid) {
        return vid.originalId === video.originalId;
      })[0]) > 0) {
        return true;
      } else {
        return false;
      }
    };
    PlaylistSchema.methods.getPreviousVideo = function(video) {
      return this.videos[this.videos.indexOf(this.videos.filter(function(vid) {
        return vid.id === video.id;
      })[0]) - 1];
    };
    PlaylistSchema.methods.getNextVideo = function(video) {
      return this.videos[this.videos.indexOf(this.videos.filter(function(vid) {
        return vid.id === video.id;
      })[0]) + 1];
    };
    PlaylistSchema.methods.getNextVideoId = function(video) {
      return this.getNextVideo(video).id;
    };
    PlaylistSchema.methods.getPreviousVideoId = function(video) {
      return this.getPreviousVideo(video).id;
    };
    Playlist = c.db.model('Playlist', PlaylistSchema);
    return Playlist;
  }));
  container.set("Session", container.share(function(c) {
    var Session, SessionSchema;
    SessionSchema = c.db.Schema({
      sid: String,
      session: Object
    });
    Session = c.db.model('Session', SessionSchema);
    return Session;
  }));
  return container.set('User', container.share(function(c) {
    var User, UserSchema;
    UserSchema = c.db.Schema({
      roles: {
        type: Array,
        "default": ['member']
      },
      username: {
        type: String,
        required: "username is required"
      },
      isAccountNonExpired: {
        type: Boolean,
        "default": true
      },
      isEnabled: {
        type: Boolean,
        "default": true
      },
      isCredentialsNonExpired: {
        type: Boolean,
        "default": true
      },
      isAccountNonLocked: {
        type: Boolean,
        "default": true
      },
      created_at: {
        type: Date,
        "default": Date.now,
        required: true
      },
      local: {
        email: String,
        password: String
      },
      facebook: {
        id: String,
        token: String,
        email: String,
        name: String
      },
      twitter: {
        id: String,
        token: String,
        displayName: String,
        username: String
      },
      google: {
        id: String,
        token: String,
        email: String,
        name: String
      }
    });

    /* Hash generation */
    UserSchema.methods.generateHash = function(password) {
      return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    };

    /* check password */
    UserSchema.methods.validPassword = function(password) {
      return bcrypt.compareSync(password, this.local.password);
    };
    UserSchema.methods.toString = function() {
      return this.username.toString();
    };
    User = c.db.model('User', UserSchema);
    return User;
  }));
};

//# sourceMappingURL=database.map
