###
    Copyright © 2014 mparaiso <mparaiso@online.fr>. All Rights Reserved.
###
async = require 'async'
bcrypt = require 'bcrypt-nodejs'
_ = require 'lodash'

module.exports = (container)->
    container.set 'mongoose', container.share (c)->
        mongoose = require('mongoose')
        mongooseCachebox = require('mongoose-cachebox')
        mongooseCachebox mongoose,
            cache: not c.debug, # start caching
            ttl: 30 # 30 seconds
        return mongoose

    container.set "db", container.share (c)->
        c.mongoose.set("debug", c.config.mongoose_debug)
        c.mongoose.connect(c.config.connection_string)
        return c.mongoose

    container.set "connection", container.share (c)->
        c.db.connection

    container.set "Log", container.share (c)->
        LogSchema = c.db.Schema
            message: Object
            context: Object
            level: Number
            level_name: String
            channel: String
            datetime: Date
            created_at: {type: Date, default: Date.now}
            extra: Object

        Log = c.db.model('Log', LogSchema)

    container.set "Category", container.share (c)->
        CategorySchema = c.db.Schema({
            title: {type: String, required: 'title is required'},
            provider: {type: String, default: "youtube"},
            originalId: Number
        })
        ###
        # @return Promise<Array>
        # @TODO implement
        ###
        CategorySchema.statics.whereVideoExist = ->
            c.q.ninvoke(c.Video, 'aggregate', [
                {$match: {category: {$exists: true}}},
                {$group: {_id: "$category", total: {$sum: 1}}}
            ])
            .then((categories)->
                    return Category.find({_id: {$in: _.pluck(categories, '_id')}}).exec()
                )
        CategorySchema.statics.listAll = ()->
            c.q(Category.find().exec())

        CategorySchema.methods.toString = ->
            this.title

        Category = c.db.model('Category', CategorySchema)
        return Category

    container.set "Video", container.share (c)->
        VideoSchema = c.db.Schema
            url: {type: String},
            owner: {type: c.db.Schema.Types.ObjectId, ref: 'User',required:'Owner is required'},
            title: {type: String, required: "title is required"},
            description: {type: String},
            private: {type: Boolean, default: false},
            originalCategoryId: Number,
            category: {type: c.db.Schema.Types.ObjectId, ref: 'Category'},
            duration: Object,
            created_at: {type: Date, 'default': Date.now},
            updated_at: {type: Date, 'default': Date.now},
            publishedAt: { type: Date, 'default': Date.now, required: "Must be a valid date for publishedAt"},
            originalId: {type:String,required:"originalId is required"},
            provider: {type:String,required:"provider is required"},
            thumbnail: String,
            meta: Object,
            viewCount: {type: Number, default: 0}

        ### 
            create video from video url 
            if document already exist,return existing video
            @param url
            @param properties?
            @param {Function} callback
        ###
        VideoSchema.statics.fromUrl = (url, properties = {})->
            c.q.ninvoke(c.videoParser, 'parse', url)
            .then (data)->
                    _.extend(data, properties)
                    [c.q(Video.findOne({owner: data.owner, url: data.url}).exec()), data]
            .spread (video, data)->
                    if video then video
                    else Video.create(data)

        VideoSchema.statics.findByOwnerId = (id, cb)->
            query = this.find({owner: id}).select('title thumbnail created_at owner').sort({created_at: -1}).populate('owner')
            if cb then query.exec(cb) else c.q(query.exec())
        VideoSchema.statics.findByCategoryId = (id, cb)->
            query = this.find({category: id}).select('title thumbnail created_at owner').sort({created_at: -1}).populate('owner')
            if cb then query.exec(cb) else c.q(query.exec())

        VideoSchema.statics.removeMultiple = (idList = [], where = {})->
            ### remove multiple videos in id list , constrained by owner if necessary ###
            c.q(this.remove(_.extend(where, {_id: {$in: idList}})).exec())

        VideoSchema.statics.list = (query, callback, q)->
            if query instanceof Function
                callback = query
                query = {}
            q = this.find(query)
            .select('title thumbnail created_at owner')
            .sort({created_at: -1})
            .populate('owner')
            if callback then q.exec(callback) else q

        VideoSchema.statics.findPublicVideos = (where = {}, sort = {created_at: -1}, limit = c.item_per_page, skip)->
            where = _.extend(where, {private: false})
            query = this.find(where).limit(c.item_per_page).skip(skip).sort(sort).populate('owner')
            c.q(query.exec())

        VideoSchema.statics.findOneById = (id)->
            c.q(Video.findById(id)
            .select('title private description duration thumbnail provider owner publishedAt originalId category categoryId')
            .populate('owner category')
            .exec())

        VideoSchema.statics.persist = (video)->
            c.q(video.save())

        VideoSchema.methods.toString = ->
            this.title

        ###
         * find Similar 
         * @param  {Video}   video   
         * @param  {Object}   options  
         * @param  {Function} callback 
        ###
        VideoSchema.statics.findSimilar = (video, options = {})->
            this.find({category: video.category, _id: {'$ne': video.id}}, null, options).exec()

        VideoSchema.pre('save', (next)->
            this.updated_at = Date.now()
            if not this.category and this.originalCategoryId
                c.q(c.Category.findOne({originalId: this.originalCategoryId}).exec())
                .then ((category)=>
                        this.category = category;
                        null)
                    .catch ->
                            next()
                            .done ->
                                    next()
            else next()
        )

        Video = c.db.model('Video', VideoSchema)
        return Video

    container.set "Playlist", container.share (c)->
        q = c.q
        PlaylistSchema = c.db.Schema
            title: {type: String, required: "title is required"}
            owner: {type: c.db.Schema.Types.ObjectId, ref: 'User'}
            thumbnail: String
            description: String
            videos: [
                {ref: 'Video', type: c.db.Schema.Types.ObjectId}
            ]
            video_urls: String
            private: {type: Boolean, default: false}
            created_at: {type: Date, default: Date.now}
            updated_at: {type: Date, default: Date.now}

        PlaylistSchema.pre('save', (next)->
            ### 
             transform a string of video urls into video documents and add video ids to video field 
            ###
            self = this
            this.updated_at = new Date
            if typeof @video_urls is "string"
                _urls = _.compact(this.video_urls.split(/[\s \n \r ,]+/))
                _props = if this.owner then {owner: this.owner} else {}
                c.q.all(_urls.map (url)->
                    c.Video.fromUrl(url, _props).catch (err)->
                        c.logger.err err;
                        false)
                .then (videos)->
                        self.videos = _(videos).compact().pluck('id').value()
                        self.thumbnail = videos[0]?.thumbnail
                        self.video_urls = _.pluck(videos, 'url').join("\r\n")
                        next()
                .catch next
            else
                next()
        )
        PlaylistSchema.statics.getLatest = (limit = 10, callback)->
            if limit instanceof Function
                callback = limit
                limit = 10
            Playlist.find().sort({updated_at: -1}).limit(10).exec(callback)

        PlaylistSchema.statics.findByOwnerId = (id, callback, q)->
            q = this.find({owner: id}).sort({created_at: -1}).populate('videos owner')
            if callback then q.exec(callback) else q

        PlaylistSchema.statics.fromUrl = (url, params)->
            ### @TODO fix playlist videos order in case videos already exist ###
            c.q.ninvoke(c.playlistParser, 'parse', url)
            .then (playlist)->
                    # get playlist data from api and videos already owned by user that are in the playlist
                    [playlist, c.Video.find({originalId:{$in: _.pluck(playlist.videos,'originalId')}, owner: params.owner}).select('id originalId').exec()]
            .spread (playlist, alreadyExistingVideos)->
                    ### create videos that are not already owned by user ###
                    alreadyExistingOriginalIds = _.pluck(alreadyExistingVideos, 'originalId')
                    [playlist, alreadyExistingVideos].concat(playlist.videos.filter((vid)->
                        alreadyExistingOriginalIds.indexOf(vid.originalId) < 0).map((video)->
                        c.Video.create(_.extend(video, {owner: params.owner,category:params.category}))))
            .spread (playlist, alreadyExistingVideos, videos...)=>
                    ### create playlist ,the id list is the concatenation of already existing videos and newly created videos ###
                    c.q(this.create(_.extend(playlist,
                        {thumbnail: videos[0]?.thumbnail, owner: params.owner, videos: _.pluck(videos,
                            'id').concat(_.pluck(alreadyExistingVideos, 'id'))})))


        PlaylistSchema.statics.persist = (playlist, options...)->
            c.q.ninvoke(playlist, 'save', options...)
        PlaylistSchema.methods.toString = ->
            this.title

        PlaylistSchema.methods.getFirstVideo = ->
            this.videos[0]

        PlaylistSchema.methods.hasNextVideo = (video)->
            if 0 <= this.videos.indexOf(this.videos.filter((vid)->vid.id is video.id)[0]) < this.videos.length-1 then true else false

        PlaylistSchema.methods.hasPreviousVideo = (video)->
            if this.videos.indexOf(this.videos.filter((vid)->vid.originalId is video.originalId)[0]) > 0 then true else false

        PlaylistSchema.methods.getPreviousVideo = (video)->
            this.videos[this.videos.indexOf(this.videos.filter((vid)->vid.id is video.id)[0])-1]

        PlaylistSchema.methods.getNextVideo = (video)->
            this.videos[this.videos.indexOf(this.videos.filter((vid)->vid.id is video.id)[0])+1]

        PlaylistSchema.methods.getNextVideoId = (video)->
            this.getNextVideo(video).id

        PlaylistSchema.methods.getPreviousVideoId = (video)->
            this.getPreviousVideo(video).id

        Playlist = c.db.model('Playlist', PlaylistSchema)
        return Playlist

    container.set "Session", container.share (c)->
        SessionSchema = c.db.Schema
            sid: String
            session: Object
        Session = c.db.model('Session', SessionSchema)
        return Session

    container.set 'User', container.share (c)->
        UserSchema = c.db.Schema
            role: {type: String, default: c.roles.MEMBER}
            username: {type: String,'unique', required: "username is required",validate:(u)->u.match(/^\w{5,50}$/)}
            isAccountNonExpired: {type: Boolean, default: true}
            isEnabled: {type: Boolean, default: true}
            isCredentialsNonExpired: {type: Boolean, default: true}
            isAccountNonLocked: {type: Boolean, default: true}
            created_at: {type: Date, default: Date.now, required: true}
            local:
                email:{type: String,'unique','required',validate:(u)->u.match(/\w{3,100}\@\w{3,200}\.\w{2,20}/)}
                password: String
            facebook:
                id: String
                token: String
                email: String
                name: String
            twitter:
                id: String
                token: String
                displayName: String
                username: String
            google:
                id: String
                token: String
                email: String
                name: String

        ### Hash generation ###
        UserSchema.methods.generateHash = (password)->
            bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
        ### check password ###
        UserSchema.methods.validPassword = (password)->
            bcrypt.compareSync(password, this.local.password)
        UserSchema.methods.toString = ->
            this.username.toString()

        UserSchema.methods.getRoleId = -> @role

        User = c.db.model('User', UserSchema)
        return User




