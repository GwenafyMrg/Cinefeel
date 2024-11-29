//-----------------------------------Importation des modules node:---------------------------------------//

const express = require('express');
const {engine} = require('express-handlebars');
const {Sequelize, DataTypes} = require('sequelize');

const path = require('path');

//-----------------------------------Définition du serveur BDD (mariaDB) :-------------------------------//
const sequelize = new Sequelize('cinefeel','test','test', {
    dialect: 'mysql',
    host : 'localhost'
});

sequelize.authenticate()
    .then(() => {
        console.log("La connexion avec la BDD est établie");
    })
    .catch(() => {
        console.error("La connexion a échouée...");
});

const Movie = sequelize.define("movie", {
    id_movie : {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement : true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    poster_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    runtime: {
        type: DataTypes.SMALLINT,
        allowNull: false
    },
    released_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    avg_note: {
        type: DataTypes.DOUBLE,
        allowNull: false
    }
}, {
        tableName: 'movie',  
        timestamps: false,    // Utilise les champs `createdAt` et `updatedAt`.
});

sequelize.sync({force: false})
    .then(() => {
        console.log("Synchronisée.");
    })
    .catch((err) => {
        console.error("Erreur : ", err);
});

//-----------------------------------Définitionn de l'application Web :-------------------------------//

const app = express();
app.engine('handlebars', engine({
    defaultLayout : "main",
    layoutsDir : "views/layouts",
    partialsDir : "views/partials",
    runtimeOptions: {
        //permet à Handlebars d'accéder aux propriétés des objets hérités (comme les instances Sequelize).
        allowProtoPropertiesByDefault: true,
        //permet l'accès aux méthodes du prototype
        allowProtoMethodsByDefault: true
    }
}));

app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.static(path.join(__dirname, "assets")));

//Définiton des routes :
app.get("/", async (req, res) => {
    try {
        query = await Movie.findAll();
        res.render("home", {movies : query});
    } catch (err){
        console.error("Erreur lors de l'affichage des donneés.");
        res.status(500).send("Erreur lors de l'affichage des données.");
    }
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