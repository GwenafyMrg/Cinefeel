const express = require('express');
const {engine} = require('express-handlebars');

const path = require('path');

//Définitionn de l'application Web :
const app = express();
app.engine('handlebars', engine({
    defaultLayout : "main",
    layoutsDir : "views/layouts",
    partialsDir : "views/partials"
}));

app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.static(path.join(__dirname, "assets")));

//Définiton des routes :
app.get("/", (req, res) => {
    const movies = [
        {
            titre : "Avengers",
            image : "images/interstellar.jpg",
            genres : "Superhéros - Action - Si-Fi",
            emotions : "enjouée - excitée - curieux",
            realisateur : "guys",
            runtime : 120,
            releasedDate : 2012
        },
        {
            titre : "Avengers",
            image : "images/interstellar.jpg",
            genres : "Superhéros - Action - Si-Fi",
            emotions : "enjouée - excitée - curieux",
            realisateur : "guys",
            runtime : 120,
            releasedDate : 2012
        },
        {
            titre : "Avengers",
            image : "images/interstellar.jpg",
            genres : "Superhéros - Action - Si-Fi",
            emotions : "enjouée - excitée - curieux",
            realisateur : "guys",
            runtime : 120,
            releasedDate : 2012
        },
        {
            titre : "Avengers",
            image : "images/interstellar.jpg",
            genres : "Superhéros - Action - Si-Fi",
            emotions : "enjouée - excitée - curieux",
            realisateur : "guys",
            runtime : 120,
            releasedDate : 2012
        },{
            titre : "Avengers",
            image : "images/interstellar.jpg",
            genres : "Superhéros - Action - Si-Fi",
            emotions : "enjouée - excitée - curieux",
            realisateur : "guys",
            runtime : 120,
            releasedDate : 2012
        }
    ]
    console.log(movies);
    res.render("home", {movies});
});

app.get("/moviesList", (req, res) => {
    res.render("filter");
});

app.get("/search", (req, res) => {
    res.render("search");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/create-account", (req, res) => {
    res.render("createAccount");
});

app.get("/my-movies", (req, res) => {
    res.render("myMovies");
});

app.get("/my-favorites", (req, res) => {
    res.render("myFav");
});

app.get("/my-badges", (req, res) => {
    res.render("myBadges");
});

app.get("/parameters", (req, res) => {
    res.render("parameters");
});

//Lancer le serveur :
app.listen(3000, () => {
    console.log("Server started!");
})