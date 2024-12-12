//-----------------------------------Importation des modules node:---------------------------------------//

//Modules prédéfinis.
const express = require('express');
const {engine} = require('express-handlebars');
const {Op} = require('sequelize');
const bodyParser = require('body-parser');
const path = require('path');

//Modules de sécurité.
const sanitizeHtml = require('sanitize-html');  //Injection SQL
const bcrypt = require('bcrypt');               //Haché les mots de passe   .

//Import de module locaux.
const {Movie, Director, Genre} = require('./models');
const funct = require('./assets/functions');
const sanitize = require('sanitize-html');
const { send } = require('process');

//-----------------------------------Définition de l'application Web :-------------------------------//

const app = express();
app.engine('handlebars', engine({
    //Chemin des répertoire:
    defaultLayout : "main",
    layoutsDir : "views/layouts",
    partialsDir : "views/partials",
    //
    runtimeOptions: {
        //permet à Handlebars d'accéder aux propriétés des objets hérités (comme les instances Sequelize).
        allowProtoPropertiesByDefault: true,
        //permet l'accès aux méthodes du prototype
        allowProtoMethodsByDefault: true
    },
    //Helpers ?
    helpers: {
        convertRuntime: funct.convertRuntime,
        convertDateFormat: funct.convertDateFormat,
        normalizeString: funct.normalizeString,
    }
}));

app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.static(path.join(__dirname, "assets")));
app.use(bodyParser.urlencoded({ extended: true}));

//-----------------------------------Définition des routes:-------------------------------//
app.get("/", async (req, res) => {
    try {
        query = await Movie.findAll({
            include: [{
                model: Genre,                   //Modéle/Table à inclure.
                as: "Genres",                   //Modifier le nom de l'attribut dans dataValues.
                attributes: ['genre_libelle'],  //Champs du Modèle/Table à inclure.
                through: { attributes: []}      //Exclure les informations de la table pivot (movieGenre).
            },
            {
                model: Director, 
                as: 'Directors',
                attributes: ['director_lastname','director_firstname'],
                through: { attributes: []}
            }]
        });
        // console.log(query);
        res.render("home", {movies : query});
    } catch (err){
        console.error("Erreur lors de l'affichage des donneés.");
        res.status(500).send("Erreur lors de l'affichage des données.");
    }
});

app.get("/moviesList", async (req, res) => {

    const genresList = await Genre.findAll();
    res.render("filter", { genresList : genresList});
});

app.post("/moviesList", async (req,res) => {

    const selectedGenres = req.body.genres;//Dictionnaire {name, value}
    selectedValues = Object.keys(selectedGenres); //Récupération des clés (name) uniquement
    // console.log(selectedValues);

    const queryFilter = await Movie.findAll({

        where : {
            '$Genres.genre_libelle$': { [Op.in]: selectedValues }
        },
        include : [{
            model: Genre,
            as : "Genres",
            attributes: ["genre_libelle"],
            through : { attributes : []}
        },
        {
            model: Director,
            as: "Directors",
            attributes: ["director_lastname","director_firstname"],
            through: { attributes: []}
        }
        ]
    });
    // console.log(queryFilter);

    res.render("filter", {genresList : await Genre.findAll(), FilteredMovies : queryFilter});
})

app.get("/search", (req,res) => {
    res.render("search");
})

app.post("/search", async (req, res) => {

    const value = req.body.researchValue;
    //Insensible à la casse, pas besoin de toLowerCase();

    try {
        const query = await Movie.findAll({

            //Search by Title, Last name or First Name of Director.
            where: {
                [Op.or] : [
                    {movie_title : { [Op.substring] : value}},
                    {'$Directors.director_lastname$' : { [Op.substring] : value }},
                    {'$Directors.director_firstname$' : {[Op.substring] : value}}
                ]
            },
            include: [
                {
                    model: Genre,
                    as: "Genres",
                    attributes: ["genre_libelle"],
                    through: { attributes: []}
                },
                {
                    model: Director,
                    as: "Directors",
                    attributes : ["director_lastname","director_firstname"],
                    through: { attributes : []}
                }
            ]
        });
        console.log(query);
        res.render("search", {result : query, research : value});
    }
    catch{
        console.error("Erreur lors de la recherche des donneés.");
        res.status(500).send("Une erreur s'est produite lors de la recherche.");
    }
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/create-account", (req, res) => {
    res.render("createAccount");
});

app.post("/create-account", async (req,res) => {

    try{
        //Voir pour mettre la partit récup + insertion dans une fonction pour séparer le code.
        let username = req.body.username;
        let email = req.body.email;
        const password = req.body.password; //Ne doit pas être modifié !
        let msgError = "";

        //Managing username input:
        if(username.length > 25 || email.length > 40 || password.length > 25){
            msgError = "La taille des champs n'a pas été respectée !";
        }
        else{
            username = username.trim();
            const safeUsername = sanitizeHtml(username, {
                allowedTags: ['b','i','em','strong'],
                allowedAttributes: []
            });
            console.log(safeUsername);

            if(!safeUsername){
                msgError = "Impossible de créer un compte.<br>Votre nom d'utilisateur semble suspect.";
            }
            else{
                //Managing email input:
                const safeEmail = email.trim(); //L'input de type "email" se charge déjà de la bonne syntaxe.
                console.log(safeEmail);

                //Managing password input:
                let safePassword = password;
                safePassword = safePassword.trim();
                safePassword = sanitizeHtml(safePassword, {
                    allowedTags: [],
                    allowedAttributes: []
                });

                if(safePassword != password){
                    msgError = "Impossible de créer votre compte.<br>Votre mot de passe semble suspect.";
                }
                else{//Si le mot de passe sécurisé correspond au mot de passe initial.
                    const hashedPw = await bcrypt.hash(safePassword,11);
                    console.log(hashedPw);
                    
                    try{
                        //Insérer les informations dans la BDD.
                    }
                    catch{
                        console.log("Une erreur est survenue lors de la création de votre compte utilisateur.");
                        res.status(500).send("Une erreur est survenue lors de la création de votre compte utilisateur.");
                    }
                }
            }
        }
        if(msgError){//Si une erreur est détécte.
            res.send(msgError);
        }
        else{//Sinon
            res.render("login"); //Redirection vers la page de connexion.
        }
    }
    catch {
        console.log("Une erreur est survenue lors de la récupération de vos informations.");
        res.status(500).send("Une erreur est survenue lors de la récupération de vos informations.");
    }
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
});

//Check logical error status.