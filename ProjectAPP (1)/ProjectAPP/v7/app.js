const express           = require("express"),
    bodyParser          = require("body-parser"),
    mongoose            = require("mongoose"),
    passport            = require("passport"),
    LocalStrategy       = require("passport-local"),
    methodOverride      = require("method-override"),
    User                = require("./models/user"),
    Rating              = require("./models/rating"),
    Movie               = require("./models/movie");

mongoose.connect("mongodb://localhost/movieappv7", {useNewUrlParser: true, useUnifiedTopology: true});

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("cssFiles"));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));


// =====================================================
//      AUTHENTICATION SETUP
app.use(require("express-session")({
    secret: "Bond, James Bond",
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//========================================================

app.use((req, res, next)=>{
    res.locals.currentUser = req.user;
    next();
});

//SHOW HOMEPAGE
app.get("/", function(req, res){
    res.render("home")
});

//SHOW ALL MOVIES
app.get("/movies", function(req, res){
    Movie.find({}, function(err, movies){
        if(err){
            console.log(err);
        } else {
            res.render("movies/movies", {movies: movies});
        }
    });
});

//SHOW A PAGE TO ADD NEW MOVIES TO THE DATABASE
app.get("/movies/new", isLoggedIn, function(req, res){
    res.render("movies/new");
});

//ADD A MOVIE TO THE DATABASE
app.post("/movies", isLoggedIn, function(req, res){
    var newMovie = {
        name: req.body.name,
        poster: req.body.poster,
        image: req.body.image,
        genre: req.body.genre,
        plot: req.body.plot,
        // boxoffice: {
        //     budget: req.body.budget,
        //     profit: req.body.profit
        // },
        addedBy:{
            id: req.user._id,
            username: req.user.username
        },
        ratingValue: '0',
    }

    Movie.create(newMovie, function(err, movie){
        if(err){
            console.log(err);
        } else {
            console.log(movie);              
            res.redirect("/movies");
        }
    });
});

//RATING A MOVIE
app.post("/movies/:id/rating", isLoggedIn, function(req, res){
    
    var rateIt = {
        rating: req.body.rating,
        ratedBy:{
            id: req.user._id,
            username: req.user.username
        },
        movie: req.params.id
    };

    Rating.create(rateIt, function(err, data){
        Movie.findById(req.params.id, function(err, foundMovie){
            if(err){
                console.log(err);
            } else {
                foundMovie.ratings.push(data);
                foundMovie.save(function(err, data2){
                    if(err){
                        console.log(er);
                    } else {
                        movieFound(data2.name);
                        res.redirect("/movies");
                    }
                });
            }
        });
    });
});

function movieFound(str){
    var total = 0, count = 0;
    Movie.findOne({name: str}).populate({ path: 'ratings', model: Rating }).exec(function(err, foundMovie){
        if(err){
            console.log(err);
        } else {
            foundMovie.ratings.forEach(function(rating){
                total = total + Number(rating.rating);
            });
            count = foundMovie.ratings.length;
            total = total/count;
            var n = total.toFixed(1);
            rateMovie(n, foundMovie.name);
        }
    });
}
function rateMovie(num, str){
    Movie.updateOne({name: str}, {$set: {ratingValue: num}}, function(err, found){
        console.log(found);
    });
}

//DELETE A MOVIE FROM THE DATABASE ALONG WITH THEIR RATINGS FROM RATING MODEL
app.delete("/movies/:id", isLoggedIn, function(req, res){
    Movie.findByIdAndDelete(req.params.id, function(err){
        if(err){
            res.send("ERROR HAPPENED!");
        } else {
            Rating.deleteMany({movie: req.params.id}, (err)=>{
                console.log(err);
            });
            res.redirect("/movies");
        }
    })
});

//SHOW MORE DETAILS ABOUT A MOVIE
app.get("/movies/:id", isLoggedIn, (req, res)=>{
    Movie.findById(req.params.id, (err, foundM)=>{
        if(err){
            console.log(err);
            res.redirect("/");
        }
        else{
            res.render("movies/show", {movie: foundM});
        }
    });
});

//SHOW THE REVIEWS OF A MOVIE
app.get("/movies/:id/reviews", (req, res)=>{
    Movie.findById(req.params.id, (err, found)=>{
        if(err){
            console.log(err);
        } else {
            Rating.find({movie: req.params.id}, (err, rateOb)=>{
                if(err){
                    console.log(err);
                } else {
                    console.log(rateOb);
                    res.render("movies/reviews", {movie: found, rateOb: rateOb});
                }
            });
        }
    });
});

//============================================================================
//RECOMMENDATION ROUTES

app.get("/recommendation", (req, res)=>{
    res.send("THERE WILL BE BLOOOD!");
});





//=============================================================================
//      AUTHENTICATION ROUTES

app.get("/register", (req, res)=>{
    res.render("register");
});

app.post("/register", (req, res)=>{
    var newUser = new User({
        name: req.body.name,
        dob: req.body.dob,
        email: req.body.email,
        phone: req.body.phone,
        username: req.body.username
    });

    User.register(newUser, req.body.password, (err, user)=>{
        if(err){
            console.log(err);
            return res.redirect("/");
        }
        passport.authenticate("local")(req, res, function(){
            res.redirect("/movies");
            console.log(user);
        });
    });
});

app.get("/login", (req, res)=>{
    res.render("login");
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/movies",
    failureRedirect: "/login"
}), (req, res)=>{ });

app.get("/logout", (req, res)=>{
    req.logOut();
    res.redirect("/movies");
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

//=============================================================================


app.listen(3000, function(req, res){
    console.log("SERVER STARTED AT PORT 3000!");
});