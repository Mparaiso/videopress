Rest = require 'mpm.express.rest'
express = require 'express'
database = require './database'
players = require './players'
Video = database.model('Video')
Playlist = database.model('Playlist')
async = require 'async'
forms = require "./forms"
csrf = express.csrf()
### SOME MIDDLEWARES ###

### route middleware to check user status ###
isLoggedIn= (req,res,next)->
    if req.isAuthenticated() then do next else res.redirect('/login')

cache = (req, res, next)-> # basic caching
    if req.method is "GET" and req.app.get('env') is "production"
        res.header('Cache-Control', "max-age=#{120}")
        res.header('X-Powered-By', 'mparaiso mparaiso@online.fr')
    next()
###
 A map of routes
###
routes = 
    "/api":
        ### video api ###
        "/video":
            use: do ->
                controller = new Rest.Controller(express())
                controller.setAdapter(new Rest.adapter.MongooseAdapter(Video))
                controller.handle()
            ### create resource from url ###
            ".fromUrl":
                post:(req,res,next)->
                    url = req.query.url
                    if not url then  res.json(500,{error:"url query parameter not found"})
                    else Video.fromUrl url,(err,result)->
                        if err then res.json(500,{error:"video for url #{url} not found"}) 
                        else res.json(result)
        ### playlist api ###
        "/playlist":
            use: do ->
                controller = new Rest.Controller(express())
                controller.setAdapter(new Rest.adapter.MongooseAdapter(Playlist))
                controller.handle()
    ### index page ###
    "/": 
        get:[cache,(req,res,next)-> #default page
            Video.find().select('title thumbnail created_at owner').sort({created_at:-1}).exec (err,videos)->
                if err then next(err)
                else res.render('index',{videos})]
    ### get video by id ###           
    "/video/:id":
        get:[cache,(req,res,next)->
            async.auto 
                video: (next)->Video.findOne({_id:req.params.id}).exec(next)
                videos:['video',(next,res)->
                    if not res.video then err= new Error('Video not found');err.status= 404;next(err) #no video found
                    else Video.findSimilar(res.video,{limit:8},next)]
            ,(err,result)->
                if err then res.status(err.status||500);next(err) #error
                else if result.video 
                    player = new players.Youtube(result.video.originalId)
                    res.render('video',{video:result.video,videos:result.videos,player:player.render()})
                else
                    res.status(404)
                    next()] #not found
    "/login":
        get:(req,res)->
            res.render('login',{message:req.flash('loginMessage')})
    "/signup":
        all:[csrf,(req,res)->
            _csrf = req.csrfToken()
            form = forms.SignUp(_csrf)
            if req.method=="POST"
                form.bind(req.body)
                form.validate (err,isValid)->
                    if isValid then console.log('form is valid')
            res.render('signup',{form:form,message:req.flash('signupMessage')})]
    "/profile":
        get: [isLoggedIn,(req,res)->res.render('profile',{user:req.user})]
    "/logout":
        get:(req,res)-> req.logout() ; res.redirect('/')






            


module.exports = routes

