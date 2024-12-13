//-----------------------------------Importations des modules node:---------------------------------------//

//Modules généraux
const express = require('express');                         //Module express
const {engine} = require('express-handlebars');             //Gestion d'express et handlebars
const {Op} = require('sequelize');                          //Gestion des clauses de requête SQL
const bodyParser = require('body-parser');                  //Gestion des entrées de formulaire HTML
const path = require('path');                               //Gestion correctes des chemins d'accès

//Modules de sécurité.
const sanitizeHtml = require('sanitize-html');              //Protéger contre les Injection SQL
const bcrypt = require('bcrypt');                           //Hacher les mots de passe  

//Import de module locaux.
const {Movie, Director, Genre} = require('./models');       //Importation des modèles de BDD
const funct = require('./assets/functions');                //Importer les fonctions personnelles

//-----------------------------------Définition de l'application Web :-------------------------------//

const app = express();
app.engine('handlebars', engine({       //Définition des paramètres de l'application

    //Chemin des répertoire:
    defaultLayout : "main",             //Page par défaut à générer.
    layoutsDir : "views/layouts",       //Dossier des différentes pages disponibles.
    partialsDir : "views/partials",     //Doisser des partials.
    
    //Définir les paramètres de gestion des templates et de leurs données.
    runtimeOptions: {
        //permet à Handlebars d'accéder aux propriétés des objets hérités (comme les instances Sequelize).
        allowProtoPropertiesByDefault: true,
        //permet l'accès aux méthodes du prototype.
        allowProtoMethodsByDefault: true
    },

    //Helpers pour exécuter des fonctions lors du rendu des templates.
    helpers: {
        convertRuntime: funct.convertRuntime,
        convertDateFormat: funct.convertDateFormat,
        normalizeString: funct.normalizeString,
    }
}));

app.set("view engine", "handlebars");                       //Définir les extensions de fichier à rechercher lors d'un rendu
app.set("views", "./views");                                //Configuration du répertoire des templates.

app.use(express.static(path.join(__dirname, "assets")));    //Définir le chemin des ressources statiques.
app.use(bodyParser.urlencoded({ extended: true}));          //Triater les données passées par URL.

//-----------------------------------Définitions des routes:-------------------------------//

app.get("/", async (req, res) => {              //Chemin d'origine
    try {
        query = await Movie.findAll({           //Rechercher tous les films : 
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
        res.render("home", {movies : query});   //Retourner le template home.handlebars avec la donnée movies.
    } catch (err){
        console.error("Erreur lors de l'affichage des donneés.");
        res.status(500).send("Erreur lors de l'affichage des données.");
    }
});

app.get("/moviesList", async (req, res) => {    //Chemin du filtrage des films obtenu par requête GET. 

    const genresList = await Genre.findAll();   //Récupérer tous les genres sans filtrage;
    res.render("filter", { genresList : genresList});
});

app.post("/moviesList", async (req,res) => {    //Chemin du filtrage des films obtenu par requête POST.

    const selectedGenres = req.body.genres;         //Dictionnaire {name, value}
    selectedValues = Object.keys(selectedGenres);   //Récupération des clés (name) uniquement
    // console.log(selectedValues);

    const queryFilter = await Movie.findAll({       //Récupérer tous les genres 

        where : {                                                   //Où
            '$Genres.genre_libelle$': { [Op.in]: selectedValues }   //Le genre est inclus dans le dico contenu dans selectedValues
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

app.get("/search", (req,res) => {           //Chemin de recherche des films par requête GET.
    res.render("search");
})

app.post("/search", async (req, res) => {   //Chemin de recherche par requête POST.

    const value = req.body.researchValue;
    //Insensible à la casse, pas besoin de toLowerCase();

    try {
        const query = await Movie.findAll({

            //Recherché un film par son titre, le nom ou le prénom du réalisateur.
            where: {
                [Op.or] : [
                    {movie_title : { [Op.substring] : value}},
                    {'$Directors.director_lastname$' : { [Op.substring] : value }}, //Où la chaine de caractère value est inclus dans le nom du réalisateur
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

app.get("/login", (req, res) => {   //Chemin de connexion.
    res.render("login");
});

app.get("/create-account", (req, res) => {  //Chemin de création de compte.
    res.render("createAccount");
});

app.post("/create-account", async (req,res) => {    //Chemin de création de compte par POST.

    try{
        //----------------------------------------------------
        //Voir pour mettre la partit récup + insertion dans une fonction pour séparer le code.
        //----------------------------------------------------
        let username = req.body.username;   //Récupèration du pseudo.
        let email = req.body.email;         //Récupération de l'email.
        const password = req.body.password; //Récupération du mot de passe. Ne doit pas être altéré !
        let msgError = "";                  //Définition d'un message d'erreur potentiel.

        //Gestion du pseudo.
        if(username.length > 25 || email.length > 40 || password.length > 25){
            msgError = "La taille des champs n'a pas été respectée !";
        }
        else{
            username = username.trim();                     //Supprimer les espaces de trop.
            const safeUsername = sanitizeHtml(username, {   //Limiter les balises HTML :
                allowedTags: ['b','i','em','strong'],       //Balises autorisées.
                allowedAttributes: []                       //Attributs de balises autorisés.
            });
            console.log(safeUsername);

            if(!safeUsername){
                msgError = "Impossible de créer un compte.<br>Votre nom d'utilisateur semble suspect.";
            }
            else{
                //Gestion de l'email :
                const safeEmail = email.trim(); //L'input de type "email" se charge déjà de la bonne syntaxe.
                console.log(safeEmail);

                //Gestion du mot de passe :
                let safePassword = password;
                safePassword = safePassword.trim();         //Retirer les espaces inutiles.
                safePassword = sanitizeHtml(safePassword, { //Supprimer les caractères suspects.
                    allowedTags: [],
                    allowedAttributes: []
                });

                //Si le mot de passe initial est différent du mot de passe sécurisé
                if(safePassword != password){
                    //On empêche la création du compte car le mot de passe entré par l'utilisateur sera différent.
                    msgError = "Impossible de créer votre compte.<br>Votre mot de passe semble suspect.";
                }
                else{//Si le mot de passe sécurisé correspond au mot de passe initial.
                    const hashedPw = await bcrypt.hash(safePassword,11);
                    console.log(hashedPw);
                    
                    try{
                        //---------------------------------------------------
                        //Insérer les informations dans la BDD.
                        //----------------------------------------------------
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
        res.status(422).send("Une erreur est survenue lors de la récupération de vos informations.");
    }
});

app.get("/my-movies", (req, res) => {       //Chemin vers les films de l'utilisateur.
    res.render("myMovies");
});

app.get("/my-favorites", (req, res) => {    //Chemin vers les films favoris de l'utilisateur.
    res.render("myFav");    
});

app.get("/my-badges", (req, res) => {       //Chemin vers les badges de l'utilisateur.
    res.render("myBadges");
});

app.get("/parameters", (req, res) => {      //Chemin vers les paramètres.
    res.render("parameters");
});

app.listen(3000, () => {                    //Lancer le serveur.
    console.log("Server started!");
});

//200 --> Requête réussie.
//201 --> Une ressource a été créée avec succés.
//400 --> Requête mal formé ou invalide.
//422 --> Données correctes mais ne peuvent pas être traitées.
//500 --> erreur générique provenant du serveur.

//----------------------------------------------------
//Check logical error status.
//----------------------------------------------------