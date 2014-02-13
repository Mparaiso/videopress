mongoose = require 'mongoose'
parsers = require './parsers'
util = require 'util'
config = require './config'

YoutubeVideo = parsers.YoutubeVideo

connection = mongoose.connect config.connection_string

connection.set('debug',true)

UserSchema = mongoose.Schema(nickname: String)

User = mongoose.model('User', UserSchema)

VideoSchema = mongoose.Schema
    url: {type: String},
    owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    title: String,
    description: String,
    duration: Object,
    created_at:{type:Date,default:Date.now},
    updated_at:{type:Date,default:Date.now},
    publishedAt: { type: Date, default: Date.now},
    originalId: String,
    provider: String,
    thumbnail: String,
    meta: Object

### create video from video url ###
VideoSchema.statics.fromUrl = (url, callback)->
    youtubeVideo = new YoutubeVideo(config.youtube_apikey)
    if youtubeVideo.isValidUrl(url)
        youtubeVideo.getVideoDataFromUrl url, (err, res)->
            if err then callback(new Error(util.format("Video with url %s not found", url)))
            else
                video = new Video(res)
                video.save(callback)
    else callback(new Error(util.format("Video with url %s not found", url)))

VideoSchema.methods.toString = ->
    this.title

Video = mongoose.model('Video', VideoSchema)

PlaylistSchema = mongoose.Schema
        title: String,
        description: String,
        videos: [VideoSchema]

Playlist = mongoose.model('Playlist',PlaylistSchema)

module.exports = mongoose