var express = require('express');
var path = require("path");
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var bcrypt = require("bcryptjs");
var regex_email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var regex_password = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,32}/;


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, "./client"))); // index.html
app.use(express.static(path.join(__dirname, "./bower_components")));

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/discussdb', function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected to Mongoose");
    }
});

var usersSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: [true, "Email is already registered"],
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: 8,
        validate: {
            validator: function (value) {
                return regex_email.test(value);
            },
            message: "Email is invalid."
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        maxlength: 24,
        validate: {
            validator: function (value) {
                return regex_password.test(value);
            },
            message: "Password failed validation, you must have at least 1 number, uppercase and special character"
        }
    }
}, { timestamps: true });

// 1 = Web Fundamentals, 2 = Python, 3 = MEAN, 4 = Ruby on rails, 5 = ASP.Net
var categoriesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 20
    },
    topics:[{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topics',
    }]
}, { timestamps: true });

// html5, css3, git, heroku, aws; mysql, sqlite, apache, django, flask, jinja; mongodb, express, angularjs, nodejs; ruby, rails; c#, visual basic, sqlserver.
var topicsSchema = new mongoose.Schema({
    _author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    _category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categories',
        required: true
    },
    title: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    description: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 140
    },
    posts:[{type:mongoose.Schema.Types.ObjectId, ref:'Posts'}]
}, { timestamps: true });

var postsSchema = new mongoose.Schema({
  _author: {
      type: String,
      ref: 'Users',
      required: true
  },
  postText: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 1000,
  },
	likes:{
		type: Number,
		default: 0,
		required: true
	},
	dislikes:{
		type: Number,
		default: 0,
		required: true
	},
  _topic:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Topics"
  },
  comments:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Comments"
  }]
}, { timestamps: true });

var commentsSchema = new mongoose.Schema({
    _author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    _post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Posts',
        required: true
    },
    commentText: {
        type: String,
        minlength: 1,
        maxlength: 140,
        required: true,
    }
}, { timestamps: true })


usersSchema.methods.comparePassword = function (password) {
    return bcrypt.compareSync(password, this.password);
}

usersSchema.pre('save', function(done){
  if (!this.isModified('password')){return done()};
  this.password = bcrypt.hashSync(this.password, bcrypt.genSaltSync(8));
  done();
})

mongoose.model('Users', usersSchema);
var UsersModel = mongoose.model('Users');

mongoose.model('Categories', categoriesSchema);
var CategoriesModel = mongoose.model('Categories');

mongoose.model('Topics', topicsSchema);
var TopicsModel = mongoose.model('Topics');

mongoose.model('Posts', postsSchema);
var PostsModel = mongoose.model('Posts');

mongoose.model('Comments', commentsSchema);
var CommentsModel = mongoose.model('Comments');

var usersController = {
    login: function (request, response) {
        var promise = UsersModel.findOne({ email: request.body.email });
        promise.then(function (user) {
            if (user) {
                var validPassword = user.comparePassword(request.body.password);
                if (validPassword) {
                    console.log("LOGIN SUCCESS", user.email);
                    response.json({ user: { id: user._id, username: user.username } });
                }
                else {
                    console.log("INCORRECT PASSWORD", user.email);
                    response.json({ error: { message: "Incorrect password" } });
                }
            }
            else {
                console.log("EMAIL NOT FOUND", user.email);
                response.json({ error: { message: "Email not found, please register" } })
            }
        }).catch(function (err) {
            console.log("LOGIN ERROR", err);// if the server fails then log the error in the console
            response.json({});//  but do not propagate it to the browser
        });
    },
    create: function (request, response) {
        var promise = UsersModel.findOne({ email: request.body.email });
        promise.then(function (user) {
            if (user) {
                console.log("EMAIL ALREADY EXISTS", user.email);
                response.json({ error: { email:{ message: "Email already exists, please login" } } })
            }
            else {
                var user = new UsersModel(request.body);
                var promise = user.save();
                promise.then(function (user) {
                    console.log("USER.SAVE.SUCCESS");
                    response.json({ user: user });
                }).catch(function (err) {
                    console.log("USER.SAVE.ERROR", err);// if the server fails then log the error in the console
                    response.json({});// but do not propagate it to the browser
                });
            }
        }).catch(function (err) {
            console.log("LOGIN ERROR", err);// if the server fails then log the error in the console
            response.json({});// but do not propagate it to the browser
        });
    },
    show: function (request, response) {
        var promise = UsersModel.findOne({ _id: request.params.id });
        promise.then(function (user) {
            console.log("USER.show.SUCCESS");
            response.json(user);
        }).catch(function (err) {
            console.log("USER.show.ERROR", err);// if the server fails then log the error in the console
            response.json({});// but do not propagate it to the browser
        });
    }
};

var categoriesController = {
    index: function (request, response) {
        var promise = CategoriesModel.find({});
        promise.then(function (categories) {
            if (categories) {
                console.log("categories.show", categories.length);
                response.json({ categories: categories });
            } else {
                console.log("categories not found");
                response.json({});
            }
        }).catch(function (err) {
            console.log("categories.show.ERROR", err);// if the server fails then log the error in the console
            response.json({});// but do not propagate it to the browser
        });
    },
    create: function (request, response) {
        var category = new CategoriesModel(request.body);
        var promise = category.save();
        promise.then(function (category) {
            console.log("category.SAVE.SUCCESS");
            response.json({category: category});
        }).catch(function (err) {
            console.log("category.SAVE.ERROR", err);// if the server fails then log the error in the console
            response.json({});// but do not propagate it to the browser
        });
    }
};

var topicsController = {
    index: function (request, response) {
        var promise = TopicsModel.find({}).populate("_author _category");
        promise.then(function (topics) {
            if (topics) {
                console.log("topics.find", topics.length);
                var promise = PostsModel.find({}).populate("_author _topic");
                promise.then(function (posts) {
                    if (posts) {
                        console.log("post.find", posts.length);
                        var promise = CommentsModel.find({}).populate("_author _post");
                        promise.then(function (comments) {
                            if (comments) {
                                console.log("comments.find", comments.length);
                                response.json({ topics: topics, posts: posts, comments: comments });
                            } else {
                                console.log("comments not found");
                                response.json({});
                            }
                        }).catch(function (err) {
                            console.log("comments.find.ERROR", err);// if the server fails then log the error in the console
                            response.json({});// but do not propagate it to the browser
                        });
                    } else {
                        console.log("posts not found");
                    }
                }).catch(function (err) {
                    console.log("posts.find.ERROR", err);// if the server fails then log the error in the console
                    response.json({});// but do not propagate it to the browser
                });
            } else {
                console.log("topics not found");
                response.json({});
            }
        }).catch(function (err) {
            console.log("topics.find.ERROR", err);// if the server fails then log the error in the console
            response.json({});// but do not propagate it to the browser
        });
    },
    create: function (request, response) {
        console.log("topicsController.create");
        // console.log("REQUEST: ", request)
        console.log(request.body)
        var topic = new TopicsModel(request.body)
        var promise = topic.save();
        promise.then(function(post){
          console.log("topic.SAVE.SUCCESS");
          response.json({topic:topic})
        }).catch(function(err){
          console.log("topic.SAVE.ERROR", err);
          response.json({});
        })

    },
    show: function(request, response){
      console.log("topicsController.show");
      var promise = TopicsModel.findOne({_id:request.params.id}).populate("_author posts posts._author posts.comments posts.comments._author");
      promise.then(function(topic){
        console.log("Found topic");
        response.json({topic:topic});
      }).catch(function(err){
        console.log("topic.show.ERROR", err);
        response.json({});
      })
    }
};

var postsController = {
    create: function (request, response) {
        var post = new PostsModel(request.body);
        var promise = post.save();
        promise.then(function (post) {
            console.log("post.SAVE.SUCCESS");
            response.json({ message: "Successfully created post", post: post });
        }).catch(function (err) {
            console.log("post.SAVE.ERROR", err);// if the server fails then log the error in the console
            response.json({});// but do not propagate it to the browser
        });
    }
};

var commentsController = {
    create: function (request, response) {
        var comment = new CommentsModel(request.body);
        var promise = comment.save();
        promise.then(function (comment) {
            console.log("comment.SAVE.SUCCESS");
            response.json({ message: "Successfully created comment", comment: comment });
        }).catch(function (err) {
            console.log("comment.SAVE.ERROR", err);// if the server fails then log the error in the console
            response.json({});// but do not propagate it to the browser
        });
    }
};

// login
app.post("/api/login", usersController.login);
// register user
app.post("/api/users", usersController.create);
// retrieve one / show one / find one
app.get("/api/users/:id", usersController.show);

// index / find / search / retrieve all / show all
app.get("/api/categories", categoriesController.index);
// create
app.post("/api/categories", categoriesController.create);


app.get('/api/topics/:id', topicsController.show);
// index / find / search / retrieve all / show all
app.get("/api/topics", topicsController.index);
// create topic
app.post("/api/topics", topicsController.create);



// create
app.post("/api/posts", postsController.create);

// create
app.post("/api/comments", commentsController.create);

app.listen(3000, function () {
    console.log("listening on port 3000");
});
