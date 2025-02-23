//-------------------- Importations des modules node : --------------------//

//---------- Modules généraux : ----------//
const express = require('express');                         // Module express.
const {engine} = require('express-handlebars');             // Gestion d'express et handlebars.
const Handlebars = require('handlebars');                   // Gestion des helpers pour les templates Handlebars.
const {Op} = require('sequelize');                          // Gestion des clauses des requêtes SQL.
const path = require('path');                               // Gestion correcte de chemins d'accès.
const session = require('express-session');                 // Gestion des sessions utilisateurs.

//---------- Modules de sécurité : ----------// 
const bodyParser = require('body-parser');                  // Gestion des entrées de formulaire HTML.
const sanitizeHtml = require('sanitize-html');              // Protéger contre les injections SQL.
const bcrypt = require('bcrypt');                           // Hacher les mots de passe.

//---------- Importations de modules locaux : ----------//
const {Movie, Director, Genre, User, UserOpinion, Emotion, Vote, Badge, UserBadge} = require('./models'); // Importation des modèles de BDD.
const funct = require('./assets/functions');                // Importation des fonctions personnelles.

//-------------------- Définition de l'application Web : --------------------//

const app = express();                  // Création de l'application.
app.engine('handlebars', engine({       // Définition des paramètres de l'application.

    // Chemin des répertoires:
    defaultLayout : "main",             // Nom de la page par défaut à générer.
    layoutsDir : "views/layouts",       // Dossier des différentes pages/layouts disponibles.
    partialsDir : "views/partials",     // Dossier des différents partials disponibles.
    
    // Définir les paramètres de gestion des templates et de leurs données.
    runtimeOptions: {
        // Permet à Handlebars d'accéder aux propriétés des objets hérités (comme les instances Sequelize).
        allowProtoPropertiesByDefault: true,
        // Permet l'accès aux méthodes du prototype (méthodes manipulant le DOM).
        allowProtoMethodsByDefault: true
    },

    // Importations des Helpers pour exécuter des fonctions lors du rendu des templates (côté client):
    helpers: {
        convertRuntime: funct.convertRuntime,
        convertDateFormat: funct.convertDateFormat,
        normalizeString: funct.normalizeString,
    }
}));

//---------- Définition des Helpers personnalisés : ----------//
Handlebars.registerHelper("ifnot", function(value, options){
    // "ifnot"   --> nom donné au helper.
    // value     --> valeur transmise à la suite du "ifnot" dans la partie Handlebars.
    // options   --> décide quel bloc s'éxécute.
    if(!value){                         // Si le paramètre d'entrée est falsy :
        return options.fn(this);        // Exécute le bloc principale "#ifnot".
    }
    else{                               // Sinon :
        return options.inverse(this);   // Exécute la partie "else".
    }
});

Handlebars.registerHelper("ifnot-or-if", function(value1, value2, options){
    if(!value1 || value2){              // Si le premier est falsy ou que le second est truly :
       return options.fn(this);
    }
    else{                               // Sinon :
        return options.inverse(this);
    }
});

//---------- Définition des paramètres de l'application web : ----------//
app.set("view engine", "handlebars");       // Définir les extensions de fichier à rechercher lors d'un rendu.
app.set("views", "./views");                // Définir le répertoire des templates.

app.use(express.static(path.join(__dirname, "assets")));    // Définir le chemin des ressources statiques.
app.use(bodyParser.urlencoded({ extended: true}));          // Sécurisé et traiter les données passées par URL.
app.use(session({                                           // Définir les paramètres de sessions :
    secret: 'io8948Yhdid00nidz',    // Une clé secrète pour signer la session.
    resave: false,                  // Ne sauvegarde pas la session si aucune modification.
    saveUninitialized: false,       // Ne crée pas une session vide.
    cookie: {                       // Paramètrage des cookies de session:
        maxAge: 1000*60*60,             // Durée de vie du cookie (en ms).
        httpOnly: true                  // Rend le cookie inaccessible depuis JavaScript côté client (sécurité +).
    }
}));

//-------------------- Définitions des routes : --------------------//

//---------- Chemin d'origine / Accueil (GET) : ----------//
app.get("/", async (req, res) => {

    try {   // Essayer de récupérer l'ensemble des films :
        const allMoviesQuery = await Movie.findAll({     // Récupérer tous les films :           
            include: [{                         // Jointure sur la table Genre et Director.
                model: Genre,                   // Modéle / Table à inclure.
                as: "Genres",                   // Donner un Alias pour accéder aux données de la table.
                attributes: ['genre_libelle'],  // Champs du Modèle / de la table à inclure.
                through: { attributes: []}      // Exclure les informations de la table pivot (MovieGenre ici).
            },
            {
                model: Director, 
                as: 'Directors',
                attributes: ['director_lastname','director_firstname'],
                through: { attributes: []}
            }]
        });
        // console.log(allMoviesQuery);

        // Récupération des données dynamiques supplémentaires des films.
        const allMoviesAndData = await funct.getMoviesData(allMoviesQuery);
        // console.log(allMoviesAndData);

        if(allMoviesAndData.error){     //Si une erreur est détéctée :
            const error = allMoviesAndData.error;
            console.error("Une erreur est survenue lors de la récupération des informations dynamiques :", error);
            res.status(error.status || 500);
            res.render("error", {
                layout : false, 
                code_error : error.status || 500, 
                desc_error : error
            });
        }
        else{                           // Si tout s'est bien passé :
            if(req.session.user){       // Si un utilsateur est connecté :
                // Retourner le template home avec les données sur les films et celles de session de l'utilsateur connecté.
                res.render("home", {
                    userData : req.session.user, 
                    movies : allMoviesAndData
                });
            }
            else{                       // Si aucun utilisateur est connecté :
                // Retourner le template home.handlebars avec les données sur les films.
                res.render("home", {
                    movies : allMoviesQuery
                });
            }
        }
    } catch (err){  // Si la récupération a échouée :
        console.error("Erreur lors de l'affichage des donneés :", err);     // Afficher l'erreur dans la console.
        res.status(err.status || 500);      // Transmettre du code HTTP de l'erreur.
        res.render("error", {               // Afficher de la page d'erreur au client.
            layout : false,                 // Désactiver l'affichage du template par défaut.
            code_error : err.status || 500,     // Transmettre le code HTTP.
            desc_error : "Erreur lors de l'affichage des donneés : " + err  // Transmettre l'erreur.
        });
    }
});

//---------- Chemin de recherche de films par filtrage (GET) : ----------//
app.get("/explore-movies", async (req, res) => { 

    try{    // Essayer d'afficher la page de filtre avec l'ensemble des genres existants.
        const genresList = await Genre.findAll();   // Récupérer tous les genres existants.
        //Réinitialiser le filtre des genres :

        //>>>>>>>>>>>>>
        // Voir pour supprimer cette section qui est inutile !!!
        genresList.forEach(genre => {               // Pour chaque genre :
            if("selected" in genre){                // Si l'attribut "selected" existe dans les données de "genre".
                genre.selected = false;             // Réinitiliser la séléction des genres (état non séléctionné)
            }
        });
        //>>>>>>>>>>>>>

        if(req.session.user){
            res.render("filter", {
                userData : req.session.user,    // Transmettre les données de session de l'utilisateur.
                genresList : genresList,        // Transmettre la liste des genres existants.
                currentFilters : null,          // Réinitialiser les filtres séléctionnés.
            });
        }
        else{
            res.render("filter", { 
                genresList : genresList,
                currentFilters : null,      
            });
        }
    }
    catch(err){     // En cas d'échec :
        console.error("Erreur lors de la redirection :", err);
        res.status(err.status || 500);
        res.render("error", {
            layout : false, 
            code_error : err.status || 500, 
            desc_error : "Erreur lors de la redirection : " + err
        });
    }
});

//---------- Chemin de recherche de films par filtrage (POST) : ----------//
app.post("/explore-movies", async (req,res) => {

    try {   // Essayer de récupérer les filtres séléctionnés par l'utilisateur via un formulaire :
        //----- Initialisation des variables : -----//
        const selectedGenres = req.body.genres;         // Récupération des genres.
        const minRuntime = req.body.runtimeMinScale;    // Récupération de la durée minimale.
        const maxRuntime = req.body.runtimeMaxScale;    // Récupération de la durée maximale.
        const minYear = req.body.dateMinScale;          // Récupération de la date de sortie minimale.
        const maxYear = req.body.dateMaxScale;          // Récupération de la date de sortie maximale.
        const minAvgNote = req.body.noteMinScale;       // Récupération de la note moyenne minimale.
        const maxAvgNote = req.body.noteMaxScale;       // Récupération de la note moyenne maximale.

        const whereClause = {};     // Définir l'objet de la clause dynamique de restriction WHERE.
        const savedFilters = {};    // Définir l'objet de sauvegarde des filtres séléctionnés.

        // console.log(selectedGenres);
        // console.log(minRuntime);
        // console.log(maxDate);
        // console.log(maxAvgNote);

        //----- Filtrer par genres : -----//
        if (selectedGenres) {   // Si des genres sont séléctionnés :
            if(!whereClause[Op.and]){       // Si la clause AND n'existe pas:
                whereClause[Op.and] = [];   // Créer la clause AND.
            }   

            const genreNames = Object.keys(selectedGenres); // Récupérer les clés uniquement (noms des genres).
            try{    // Essayer de récupérer les identifiants de films associés aux genres séléctionnés :
                const movieIDs = await Movie.findAll({
                    attributes : ["movie_id_movie"],    // Limiter la récupération aux identifiants.
                    include : [{                        // Jointure sur la table Genre.
                        model: Genre,
                        as : "Genres",
                        attributes : [],
                        where : {genre_libelle : {[Op.in] : genreNames}}    // Restriction sur le genre.
                    }]
                });
                // Stocker les films filtrés dans un tableau simple et non un objet :
                const movieIDsArray = movieIDs.map(movie => movie.movie_id_movie);

                // console.log(movieIDs);
                // console.log(movieIDsArray);

                // Ajouter les films spécifiques aux genres séléctionnés à la clause WHERE :
                whereClause[Op.and].push({movie_id_movie : {[Op.in] : movieIDsArray}});
            }
            catch(err){     // En cas d'échec de requête :
                console.error("Erreur lors de la récupération des genres associés aux films filtrés :", err);
                res.status(err.status || 500);
                res.render("error", {
                    layout : false, 
                    code_error : err.status || 500, 
                    desc_error : "Erreur lors de la récupération des genres associés aux films filtrés :", err
                });
            }
            
            savedFilters.genreArray = genreNames;   // Ajouter les genres séléctionnés à l'objet de sauvegarde.
        }

        //----- Filtrer par durée : -----//
        if (minRuntime || maxRuntime) {     // Si une durée minimale ou maximale est séléctionnée :
            if(!whereClause[Op.and]){       // Si la clause AND n'existe pas:
                whereClause[Op.and] = [];   // Créer la clause AND.
            } 

            //Ajouter des restrictions sur la durée du film : minRuntime <= movie_runtime <= maxRuntime :
            if (minRuntime) {   // Si une durée minimale est séléctionnée :
                whereClause[Op.and].push({ movie_runtime: { [Op.gte]: minRuntime } });
                savedFilters.minRuntime = minRuntime; // Ajouter la durée séléctionnée à l'objet de sauvegarde.
            }
            if (maxRuntime) {   // Si une durée maximale est séléctionnée :
                whereClause[Op.and].push({ movie_runtime: { [Op.lte]: maxRuntime } });
                savedFilters.maxRuntime = maxRuntime; // Ajouter la durée séléctionnée à l'objet de sauvegarde.
            }
        }

        //----- Filtrer sur la date de sortie : -----//
        if(minYear || maxYear){             // Si une année minimale ou maximale est séléctionnée : 
            if(!whereClause[Op.and]){       // Si la clause AND n'existe pas:
                whereClause[Op.and] = [];   // Créer la clause AND.
            } 

            // Ajouter des restrictions sur la date de sortie du film : fullMinDate <= movie_release_date <= fullMaxDate
            if(minYear){    // Si une année minimale est séléctionnée :
                const fullMinDate = minYear + "-01-01"; // Reconstituer une date minimale complète.
                whereClause[Op.and].push({movie_released_date : {[Op.gte]: fullMinDate} });
                savedFilters.minReleasedDate = minYear; // Ajouter la date minimale séléctionnée à l'objet de sauvegarde.
            }
            if(maxYear){    // Si une année maximale est séléctionnée :
                const fullMaxDate = maxYear + "-12-31"; // Reconstituer une date maximale complète.
                whereClause[Op.and].push({movie_released_date : {[Op.lte]: fullMaxDate} });
                savedFilters.maxReleasedDate = maxYear; // Ajouter la date maximale séléctionnée à l'objet de sauvegarde.
            }
        }

        //----- Filtrer sur la note moyenne : -----//
        if(minAvgNote || maxAvgNote){       // Si une note minimale ou maximale est séléctionnée : 
            if(!whereClause[Op.and]){       // Si la clause AND n'existe pas:
                whereClause[Op.and] = [];   // Créer la clause AND.
            } 
            if(minAvgNote){     // Si une note minimale est séléctionnée :
                whereClause[Op.and].push({movie_avg_note : {[Op.gte] : minAvgNote}});
                savedFilters.minAvgNote = minAvgNote; // Ajouter la note minimale séléctionnée à l'objet de sauvegarde.
            }
            if(maxAvgNote){     // Si une note maximale est séléctionnée :
                whereClause[Op.and].push({movie_avg_note : {[Op.lte] : maxAvgNote}});
                savedFilters.maxAvgNote = maxAvgNote; // Ajouter la npte maximale séléctionnée à l'objet de sauvegarde.
            }
        }

        // console.log(whereClause);
        // console.log(savedFilters);

        //----- Récupérer les films filtrés : -----//
        const filteredMoviesQuery = await Movie.findAll({
            where: whereClause,     // Restriction sur l'ensemble des critères définis précédemment.
            include: [              // Jointure sur la table Genre et Director.
                {
                    model: Genre,
                    as: "Genres",
                    attributes: ["genre_libelle"],
                    through: { attributes: [] },
                },
                {
                    model: Director,
                    as: "Directors",
                    attributes: ["director_lastname", "director_firstname"],
                    through: { attributes: [] },
                },
            ],
        });

        // console.log(filteredMoviesQuery);
        // filteredMoviesQuery.forEach(movie => {
        //     console.log(movie.Genres);
        // });

        const filteredMovies = await funct.getMoviesData(filteredMoviesQuery);

        //----- Renvoyer les genres sauvegardés à la vue : -----//
        const genresList = await Genre.findAll();   // Liste complète des genres existants.
        genresList.forEach(genre => {               // Pour chaque genre présent dans la liste :
            // Noter le genre comme séléctionné si celui-ci est présent dans l'objet de sauvegarde.
            genre.selected = savedFilters.genreArray && savedFilters.genreArray.includes(genre.genre_libelle);
        });
        // console.log(genresList);

        //----- Afficher le résultat à la suite du traitement : -----//
        if(filteredMovies.error){   // Gestion des erreurs potentielles :  
            const error = filteredMovies.error;       
            console.error("Une erreur est survenue lors de la récupération des informations dynamiques : ", error);
            res.status(error.status || 500);
            res.render("error", {
                layout : false, 
                code_error : error.status || 500, 
                desc_error : error
            });
        }
        else{   // Retour à la vue :
            if (req.session.user) {
                res.render("filter", {
                    userData: req.session.user,
                    genresList,                     // Transmettre la liste des genres existants.
                    filteredMovies: filteredMovies, // Transmettre la liste des films filtrés.
                    currentFilters : savedFilters,  // Transmettre les filtres utilisés pour ce traitement.
                });
            } else {
                res.render("filter", {
                    genresList, 
                    filteredMovies: filteredMovies,
                    currentFilters : savedFilters,
                });
            }
        }
    } catch(err) {   // En cas d'échec de la récupération des filtres :
        console.error("Erreur lors du filtrage :", err);
        res.status(err.status || 500);
        res.render("error", {
            layout : false, 
            code_error : err.status || 500, 
            desc_error : "Une erreur est survenue lors du filtrage des films. " + err
        });
    }
});

//---------- Chemin de recherche de films par texte (GET) : ----------//
app.get("/find-movies", (req,res) => {
    
    if(req.session.user){
        res.render("search", {
            userData : req.session.user
        });
    }
    else{
        res.render("search");
    }
})

//---------- Chemin de recherche de films par texte (POST) : ----------//
app.post("/find-movies", async (req, res) => {

    const value = req.body.researchValue;   
    // Insensible à la casse, pas besoin de toLowerCase();

    try {   // Essayer de récupérer la liste de films filtrés :
        const searchedMoviesQuery = await Movie.findAll({ // Rechercher un film par son titre, le nom ou le prénom de son réalisateur.
            where: {
                [Op.or] : [
                    {movie_title : { [Op.substring] : value}},  // Restriction sur le titre.
                    {'$Directors.director_lastname$' : { [Op.substring] : value }}, // Restriction sur le nom du réalisateur.
                    {'$Directors.director_firstname$' : {[Op.substring] : value}}   // Restriction sur le prénom du réalisateur.
                ]
            },
            include: [  // Jointure sur la table Genre et Director.
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
        // console.log(query);

        const searchedMovies = await funct.getMoviesData(searchedMoviesQuery);

        if(searchedMovies.error){   // Gérer les erreurs potentielles :
            const researchError = searchedMovies.error
            console.error(researchError);
            res.status(researchError.status || 500);
            res.render("error", {
                layout : false, 
                code_error : researchError.status || 500, 
                desc_error : researchError
            });
        }
        else{   // Retour à la vue :
            if(req.session.user){
                res.render("search", {
                    userData : req.session.user,
                    result : searchedMovies,        // Transmettre les films recherchés trouvés.
                    research : value                // Transmettre l'information recherchée.
                });
            }
            else{
                res.render("search", {
                    result : searchedMovies, 
                    research : value
                });
            }
        }
    }
    catch(err){     // En cas d'échec de la recherche des films :
        console.error("Erreur lors de la recherche des donneés :", err);
        res.status(err.status || 500);
        res.render("error", {
            layout : false, 
            code_error : err.status || 500, 
            desc_error : "Erreur lors de la recherche des donneés :", err
        });
    }
});

//---------- Chemin de connexion (GET) : ----------//
app.get("/login", (req, res) => {

    if(req.session.user){
        res.render("login", {
            userData : req.session.user
        });
    }
    else{
        res.render("login");
    }
});

//---------- Chemin de connexion (POST) : ----------//
app.post("/login", async (req,res) => {

    try {
        const emailInputLog = req.body.email;       // Récupération de l'email transmis.
        const passwordInputLog = req.body.password; // Récupération du mot de passe transmis. 
        let msgError = "";                          // Initialisation d'un message d'erreur potentiel.

        //---------- Sécuriser les entrées utilisateurs : ----------//
        
        try{
            //----- Gestion de la taille des entrées : -----//
            if(emailInputLog.length > 40 || passwordInputLog.length > 25){
                msgError = "La taille des champs n'a pas été respectée !";  // Enregistrer un message d'erreur.
            }
            else{   //----- Début de traitement des données : -----//

                // Gestion de l'email :
                const safeEmail = emailInputLog.trim(); // L'input de type "email" se charge déjà de la bonne syntaxe.
                // console.log("Email de connexion : " + safeEmail);

                // Gestion du mot de passe :
                let safePassword = funct.cleanPassword(passwordInputLog);
                // console.log("Mot de passe de connexion : " + safePassword);

                // Si le mot de passe sécurisé correspond au mot de passe initial :
                if(safePassword === passwordInputLog){
                    const users = await User.findAll(); // Récupérer la liste des utilisateurs.
                    // console.log(users);

                    //----- Rechercher dans un premier temps une correspondance avec l'adresse Email : -----//
                    let foundEmail = false; // Définir si l'email est trouvé ou non.
                    let i = 0;              // Définir l'index pour parcourir les utilisateurs.

                    //Tant que l'email recherché n'est pas trouvé ou que la liste n'est pas parcouru totalement.
                    while(!foundEmail && i < users.length){
                        if(safeEmail === users[i].user_email){ // Si l'email corresponds :
                            foundEmail = true;  //Email / Utilisateur trouvé.
                        }
                        else{   // Sinon :
                            i++;    // Passer à l'utilisateur suivant.
                        }
                    }

                    //----- Comparer dans un second temps la correspondance avec le mot de passe : 
                    if(foundEmail){ // Si l'email / l'utilisateur est trouvé : 
                        try {   // Essayer de créer la session utilisateur si le mot de passe corresponds :
                            const DoesPwMatch = await bcrypt.compare(passwordInputLog, users[i].user_mdp);
                            if (DoesPwMatch) {  // Si le mot de passe transmis corresponds :
                                const authenticateUser = users[i]; // Récupérer l'utilisateur correspondant.
                                req.session.user = {    //  Création de la session utilisateur :
                                    id: authenticateUser.user_id_user,
                                    username: authenticateUser.user_username,
                                    email: authenticateUser.user_email,
                                    admin: authenticateUser.user_admin,
                                }
                                console.log(req.session.user);
                                console.log("Connecté avec succès !");
                            } else { // Sinon :
                                msgError = "Mot de passe incorrect."; // Enregistrer un message d'erreur.
                            }
                        } catch (err) { // En cas d'échec de la création de la session :
                            console.error("Erreur lors de la recherche de correspondance entre les mots de passe :", err);
                            res.status(err.status || 500);
                            res.render("error", {
                                layout : false, 
                                code_error : err.status || 500, 
                                desc_error : err
                            });
                        }
                    }
                    else{   // L'email n'a pas été trouvé / l'utilisateur n'existe pas : 
                        msgError = "L'email transmis n'est associé à aucun compte utilisateur !";
                    }
                }
                else{ // Si le mot de passe initial est différent du mot de passe sécurisé :
                    // On s'arrête ici car le mot de passe entré par l'utilisateur sera différent et ne pourra pas être correctement comparé.
                    msgError = "Votre mot de passe de connexion semble suspect... Veuillez réessayer.";
                }
            }

            if(msgError){   // Une erreur a été enregistré durant le traitement :
                console.error("Vous n'avez pas rempli le formulaire correctement : ", msgError);
                res.status(msgError.status || 400);
                res.render("login", {
                    error : msgError
                });
            }
            else{   // Si la connexion est un succès :
                try {   // Essayer de rediriger l'utilisateur vers la page d'accueil :
                    const movieQuery = await Movie.findAll({    // Récupérer tous les films : 
                        include: [{     // Jointure sur la table Genre et Director.
                            model: Genre,
                            as: "Genres",
                            attributes: ['genre_libelle'],
                            through: { attributes: []}
                        },
                        {
                            model: Director, 
                            as: 'Directors',
                            attributes: ['director_lastname','director_firstname'],
                            through: { attributes: []}
                        }]
                    });
                    const movies = await funct.getMoviesData(movieQuery);

                    if(movies.error){   // Si la récupération des données a échoué :
                        console.error(movies.error);
                        res.status(movies.error.status || 500);
                        res.render("error", {
                            layout : false, 
                            code_error : movies.error.status || 500, 
                            desc_error : movies.error
                        });                
                    }
                    else{   // Sinon rediriger l'utilisateur vers l'accueil :
                        res.redirect("/");  // Rediriger vers la route "/"
                    }
                }
                catch(err){ // En cas d'échec de la redirection :
                    console.error("Erreur lors de la redirection vers l'acceuil :", err);
                    res.status(err.status || 500);
                    res.render("error", {
                        layout : false, 
                        code_error : err.status || 500, 
                        desc_error : "Erreur lors de la redirection vers l'acceuil. Les données n'ont pas pu être chargées..." + err
                    });  
                }
            }
        }
        catch(err){
            console.error("Erreur lors du traitement des entrées utilisateurs :", err);
            res.status(err.status || 500);
            res.render("error", {
                layout : false, 
                code_error : err.status || 500, 
                desc_error : "Erreur lors du traitement des entrées utilisateurs :" + err
            }); 
        }
    }
    catch(err){
        console.error("Erreur lors de la récupération des entrées utilisateurs :", err);
        res.status(err.status || 500);
        res.render("error", {
            layout : false, 
            code_error : err.status || 500, 
            desc_error : "Erreur lors de la récupération des entrées utilisateurs :" + err
        }); 
    }
});

//---------- Chemin de déconnexion (GET) : ----------//
app.get("/logout", (req, res) => {

    try {   // Essayer de détruire la session utilisateur :
        req.session.destroy();          // Détruire la session utilisateur.
        res.clearCookie("connect.sid"); // Supprimer le cookie de session du client (utilisé pour l'identifier).
        res.redirect("/");              // Rediriger vers l'accueil.
        console.log("Déconnecté avec Succés !");
    } 
    catch (err) {   // En cas d'échec de la déconnexion :
        console.error("Erreur lors de la déconnexion :", err);
        res.status(err.status || 500);
        res.render("error", {
            layout : false, 
            code_error : err.status || 500, 
            desc_error : "Une erreur est survenue lors de la déconnexion à votre compte. " + err
        });
    }
});

//---------- Chemin de création de compte (GET) : ----------//
app.get("/create-account", (req, res) => {
    
    if(req.session.user){   // Si un utilisateur est déjà connecté :
        //Bloqué la page de création de compte :
        console.error("Chemin d'accès non autorisé pour votre statut. Vous possédez déjà un compte utilisateur.");
        res.status(404);
        res.render("error", {
            layout : false, 
            code_error : 404, 
            desc_error : "Le chemin d'accès utilisé est incorrecte... Vous n'avez pas le statut adéquat pour accéder à cette page. En effet, vous possédez déjà un compte utilisateur."
        });
    }
    else{   // Sinon :
        res.render("createAccount");    // Redirection vers la page de création de compte.
    }
});

//---------- Chemin de création de compte (POST) : ----------//
app.post("/create-account", async (req,res) => { 

    const existingEmails = await User.findAll({  // Récupérer les adresses emails existantes :
        attributes: ['user_email']  // Projection sur l'email uniquement.
    });
    const emailsList = existingEmails.map(email => email.user_email);    // Convertir en liste simple d'emails.
    // console.log(emailsList);

    //----- Début de traitement des données : -----//
    try{    // Essayer de traiter les entrées de l'utilisateur :
        let usernameInputCA = req.body.username;    // Récupérer le pseudo.
        let emailInputCA = req.body.email;          // Récupérer l'email.
        const passwordInputCA = req.body.password;  // Récupérer le mot de passe qui ne doit pas être altéré !
        let msgError = "";                          // Définition d'un message d'erreur potentiel.

        //----- Si la taille des entrées est incorrecte : -----//
        if(usernameInputCA.length > 25 || emailInputCA.length > 40 || passwordInputCA.length > 25){
            msgError = "La taille des champs n'a pas été respectée !";
        }
        //----- Sinon si l'unicité des adresses n'est pas respectée (1 compte = 1 adresse email) : -----//
        else if(emailsList.includes(emailInputCA.trim())) {    // Si l'email transmis est inclut dans la liste des adresses existantes :
            msgError = "L'email transmis existe déjà. Veuillez en choisir un autre.";
        }
        //----- Sinon, début de traitement des données : -----//
        else{
            //----- Sauvegarder l'email traité : -----//
            const safeEmail = emailInputCA.trim();
            // console.log("Email traité : " + safeEmail);

            //----- Sauvegarder le pseudo traité : -----//
            usernameInputCA = usernameInputCA.trim();              // Supprimer les espaces de trop.
            const safeUsername = sanitizeHtml(usernameInputCA, {   // Limiter les balises HTML / caractères suspects :
                allowedTags: ['b','i','em','strong'],       // Les balises autorisées.
                allowedAttributes: []                       // Les attributs de balises autorisés.
            });
            // console.log("Pseudo utilisateur traité : " + safeUsername);

            if(!safeUsername){  // Si le pseudo traité semble quand même suspect :
                msgError = "Impossible de créer un compte. Votre nom d'utilisateur semble suspect...";
            }
            else{   // Sinon :
                //----- Sauvegarder le mot de passe traité : -----//
                let safePassword = funct.cleanPassword(passwordInputCA);    // Traiter le mot de passe.

                // Si le mot de passe initial est différent du mot de passe sécurisé :
                if(safePassword != passwordInputCA){
                    // Empêcher la création du compte.
                    msgError = "Impossible de créer votre compte. Votre mot de passe semble suspect...";
                }
                else{   // Sinon :
                    const hashedPw = await bcrypt.hash(safePassword,11);    // Hasher le mot de passe.
                    // console.log("Mot de passe haché : " + hashedPw);
                    
                    try{    // Essayer d'enregister le compte utilisateur dans le base de données :
                        await User.create(  // Créer un enregistrement.
                            {
                                user_username : safeUsername,   //Enregistrer le pseudo.
                                user_email : safeEmail,         //Enregistrer l'email.
                                user_mdp : hashedPw             //Enregistrer le mot de passe hashé !
                            }
                        );
                        console.log("Utilisateur enregistré.");
                    }
                    catch(err){ // En cas d'échec de l'enregistrement :
                        console.error("Une erreur est survenue lors de la création de votre compte utilisateur :", err);
                        res.status(err.status || 500);
                        res.render("error", {
                            layout : false, 
                            code_error : err.status || 500, 
                            desc_error : "Une erreur est survenue lors de la création de votre compte utilisateur. " + err
                        });
                    }
                }
            }
        }
        //----- Fin de traitement des données : -----//
        
        if(msgError){   // Si un message d'erreur est détécté :
            console.error("Vous n'avez pas rempli le formulaire correctement : ", msgError);
            res.status(msgError.status || 400);   
            res.render("createAccount", {
                error : msgError
            });
        }
        else{   // Sinon :
            res.redirect("/login"); // Rediger vers la page de connexion (suite logique).
        }
    }
    catch(err) { // En cas d'échec du traitement des informations :
        console.error("Une erreur est survenue lors de la récupération de vos informations :", err);
        res.status(err.status || 422);
        res.render("error", {
            layout : false, 
            code_error : err.status || 422, 
            desc_error : "Une erreur est survenue lors de la récupération de vos informations. " + err
        });
    }
});

//---------- Chemin de publication d'un avis (GET) : ----------//
app.get("/share-review", async (req,res) => {

    //>>>>>>>>>>>
    // Ajouter un trycatch
    //>>>>>>>>>>
    const movieID = req.query.movie;    // Récupérer l'identifiant du film concerné.
    let existingReview = false;         // Définir si un avis existe déjà ou non.

    if(req.session.user){   // Si un utilisateur est connecté :
        const userID = req.session.user.id; // Récupérer l'identifiant de l'utilisateur.

        const reviewByCurrentUser = await UserOpinion.findOne({ // Récupérer l'avis de l'utilisateur sur ce film.
            where : {
                [Op.and] : {
                    opinion_id_movie : {[Op.eq] : movieID}, // Restriction sur l'identifiant du film.
                    opinion_id_user : {[Op.eq] : userID}    // Restriction sur l'identifiant de l'utilisateur.
                }
            },
            attributes : ["opinion_id_movie", "opinion_id_user"]    // Projection sur 2 attributs.
        });
        // console.log(reviewByCurrentUser);

        // Si un avis existe déjà (différent de null) :
        if(reviewByCurrentUser){
            console.log("un avis est publié ici");  
            existingReview = true;  // Un avis existe déjà.
        }
    }

    if(movieID){    // Si l'identifiant du film est bien récupéré :
        try{    // Essayer de d'afficher le film concerné et les émotions disponibles au vote :
            const movieQuery = await Movie.findOne({    // Récupérer le film concerné par l'avis :
                where : {
                    movie_id_movie : {[Op.eq] : movieID}    // Restriction sur l'identifiant du film.
                },
                include: [  // Jointure sur la table Genre et Director.
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
            // console.log(movieQuery);

            const movie = await funct.getMoviesData([movieQuery]); // Convertir en tableau simple.
            const availableEmotionsQuery = await Emotion.findAll();   // Récupérer toutes les émotions disponibles.
            // console.log(availableEmotionsQuery);
    
            try {   // Essayer d'afficher les avis associés au film concerné :
                const opinions = await UserOpinion.findAll({    // Récupérer les avis associés au film.
                    where : {
                        opinion_id_movie : {[Op.eq] : movieID}  // Restriction sur l'identifiant du film.
                    },
                    include : [     // Jointure sur la table User.
                        {
                            model: User,
                            as: "User", // Définir un alias (Doit correspondre à l'alias défini dans belongsTo()).
                            attributes: ["user_username"], // Projection sur le champs du pseudo utilisateur.
                        }
                    ],
                    attributes : { exclude : ["opinion_id_movie"]}  // Projection sur l'ensemble des champs excepté l'identifiant du film.
                });
                // console.log(opinions);
                
                const votes = await Vote.findAll({      // Récupérer les votes d'émotions associé au film.
                    where : {
                        id_movie : {[Op.eq] : movieID}  // Restriction sur l'identifiant du film.
                    },
                    include : [     // Jonction sur la table Emotion.
                        {
                            model : Emotion,
                            as: "Emotion",
                            attributes : ["emotion_name"],  // Projection sur le nom des émotions.
                        }
                    ],
                    attributes : { exclude : ["opinion_id_movie"]} // Projection sur l'ensemble des champs excepté l'identifiant du film.
                });
                // console.log(votes);

                //----- Associer les avis avec les émotions des mêmes utilisateurs : -----//
                votes.forEach(vote => {     // Pour chaque votes récupérés :
                    opinions.forEach(opinion => {   // Pour chaque avis publiés :
                        // Si l'utilisateur qui a publié l'avis a aussi voté l'émotion concernée :
                        if(opinion.opinion_id_user === vote.id_user){
                            if(!opinion.vote){      // Si l'objet vote n'existe pas :
                                opinion.vote = [];  // Créer l'objet vote.
                            }
                            opinion.vote.push({emotion : vote.Emotion.emotion_name}); // Ajouter l'émotion votée à l'avis émit.
                        }
                    });
                });
                // console.log(votes);
                // console.log(opinions);

                if(movie.error){   // Si une erreur est détectée durant le traitement.
                    const error = movie.error;
                    console.error("Une erreur est survenue lors de la récupération de vos informations : ", error);
                    res.status(error.status || 500);
                    res.render("error", {
                        layout : false, 
                        code_error : error.status || 500, 
                        desc_error : "Une erreur est survenue lors de la récupération de vos informations : " + error
                    });
                }
                else{   // Sinon :
                    if(req.session.user){ // Si l'utilisateur est inscrit :
                        res.render("shareReview", {
                            userData : req.session.user, 
                            movie : movie,                          // Transmettre le film subissant l'avis.
                            emotionsList: availableEmotionsQuery,   // Transmettre l'ensemble des émotions disponibles au vote.
                            reviews: opinions,                      // Transmettre l'ensemble des avis associés à ce film.
                            existingReview : existingReview         // Transmettre si l'utilisateur a déjà publié ou non.
                        });
                    }
                    else{   // Sinon :
                        res.render("shareReview", {
                            movie : movie,
                            emotionsList: availableEmotionsQuery, 
                            reviews : opinions
                        });
                    }
                }
            }
            catch (err) {   // En cas d'erreur pour l'affichage des avis :
                console.error("Impossible de charger la section des commentaires :", err);
                res.status(err.status || 500);
                res.render("error", {
                    layout : false, 
                    code_error : err.status || 500, 
                    desc_error : "Impossible de charger la section des commentaires. " + err
                });
            }
        }   // En cas d'erreur pour l'affichage du film concernée et des émotions :
        catch(err){
            console.error("Impossible d'accéder au film que vous souhaitez :", err);
            res.status(err.status || 500);
            res.render("error", {
                layout : false, 
                code_error : err.status || 500, 
                desc_error : "Impossible d'accéder au film que vous souhaitez. " + err
            });
        }
    }
    else{   //Sinon (Si on accède à la page share-review directement depuis l'URL) :
        console.error("Chemin d'accès anormal :", err);
        res.status(err.status || 404);
        res.render("error", {
            layout : false, 
            code_error : err.status || 404, 
            desc_error : "Le chemin d'accès utilisé est incorrecte... " + err
        });
    }
});

//---------- Chemin de publication d'un avis (POST) : ----------//
app.post("/share-review", async(req,res) => {

    // STOP HERE :
    try{    // Essayer de traiter les entrées de l'utilisateur :
        //----- Récupérer les entrées utilisateurs via le formulaire :-----//
        const noteReview = parseInt(req.body.note,10);  // Convertir la note en INT pour la BDD.
        let selectedEmotions = req.body.emotions;        // Récupérer les émotions votées.
        let favReview = req.body.fav;                   // Définir si le film est considéré comme favori ou non.
        let commentReview = req.body.comment;           // Récupérer le commentaire.

        // Si aucune émotions n'est choisi ou qu'aucun commentaire est fait, l'avis est considéré comme imcomplet :
        if(!selectedEmotions && commentReview == "" || commentReview.length > 500 || Object.keys(selectedEmotions).length > 3){
            const movieID = req.body.movie;     // Récupérer l'identifiant du film concerné par le vote.
            console.log("Redirection vers la page d'avis en raison du manque d'information.");
            res.redirect(`/share-review?movie=${movieID}`); // Rediriger vers la page d'avis (réinitialiser l'avis).
        }
        // Sinon (S'il y a assez d'informations pour traiter l'avis) :
        else{
            //----- Traitement de la mise en favori (pour correspondre au modèle de la BDD) : -----//
            favReview = favReview ? true : false;   // Convertir à true si favReview vaut "on", false s'il vaut undefined.
            // console.log(favReview);

            //-----Traitement du commentaire : -----//
            if(commentReview == ""){    // S'il est vide :
                commentReview = null;   // Convertir à null.
            }
            else{   // Sinon :
                commentReview = commentReview.trim();           // Supprimer les espaces de trop.
                commentReview = sanitizeHtml(commentReview, {   // Limiter les balises HTML :
                    allowedTags: ['b','i','em','strong', 'br'], // Balises autorisées.
                    allowedAttributes: []                       // Attributs de balises autorisés.
                });
            }
            // console.log(commentReview);

            //-----Enregistrement de l'avis (sans les votes d'émotions) : -----//
            try{    // Essayer d'enregistrer l'avis de l'utilisateur :
                const userID = parseInt(req.session.user.id,10);    // Forcer le type INT sur l'identifiant user.
                const movieID = parseInt(req.body.movie, 10);       // Forcer le type INT sur l'identifiant movie.

                // console.log("id user:", userID);
                // console.log("id movie :", movieID);

                await UserOpinion.create(   // Enregistrer l'avis dans la BDD :
                    {
                        opinion_id_user : userID,
                        opinion_id_movie : movieID,
                        opinion_note : noteReview,
                        opinion_fav : favReview,
                        opinion_comment : commentReview,
                    }
                );

                //----- Traitement des Emotions : -----//
                if(selectedEmotions){    // Si l'utilisateur a voté pour des émotions :
                    selectedEmotions = Object.keys(selectedEmotions); // Récupérer le nom des émotions seulement ( où {émotions : "on"})
                    // console.log(selectedEmotions);

                    for (emotion of selectedEmotions){    // Pour toutes les émotions choisies (3 au plus) faire :
                        const selectedEmotionsQuery = await Emotion.findAll({ // Récupérer l'identifiant des émotions séléctionnées :
                            attributes: ["emotion_id_emotion"],     // Projection sur l'identifiant des émotions.
                            where : {
                                emotion_name : {[Op.eq] : emotion}  // Restriction sur le nom de l'émotion.
                            }
                        });

                        // Convertir en tableau simple d'identifiant.
                        const emotionID = selectedEmotionsQuery.map(emotion => emotion.dataValues.emotion_id_emotion)[0];
                        // console.log(emotionID);

                        await Vote.create(  // Enregistrer les votes dans la BDD :
                            {
                                id_user : userID,
                                id_movie : movieID,
                                id_emotion : emotionID
                            }
                        );                
                        console.log("Vote de l'émotion ", emotionID, " de l'utilisateur", userID, "enregistré pour le film", movieID);
                    }
                    console.log("Avis avec votes des émotions de l'utilisateur", userID, "enregistré pour le film", movieID);
                }
                else{   // Sinon :
                    console.log("Avis sans votes de l'utilisateur", userID, "enregistré pour le film", movieID);
                }

                //----- Gestion des éventuels nouveaux badges obtenus suite à la soumission de l'avis : -----//               
                try{    // Essayer de traiter les nouveaux badges obtenus :
                    const notObtainedBadge = await Badge.findAll({  // Récupérer les badges vérouillés.
                        include: [{                     // Jointure sur la table UserBadge.
                            model: UserBadge,
                            as: "ObtentionsBadge",
                            attributes : [],
                            required: false,            // Jointure externe gauche (LEFT OUTER JOIN, récupérer les badges sans correspondance avec UserBadge).
                            where: { id_user: userID }  // Restriction sur l'identifiant utilisateur.
                        }],
                        where: {
                            '$ObtentionsBadge.id_badge$': null  // Restriction sur l'inexistance des identifiants.
                        }
                    });
                    // console.log("Les badges non obtenues :", notObtainedBadge);
                    
                    // Récupérer les films que l'utilisateur a vu (celui sur lequel il vient de donner un avis aussi) :
                    const moviesWatched = await Movie.findAll({
                        include: [  // Jointure sur les tables UserOpinion et Genre.
                            {
                                model: UserOpinion,
                                as: "Opinions",
                                attributes: [],
                                where: {
                                    opinion_id_user: userID
                                },
                            },
                            {
                                model: Genre,
                                as: "Genres",
                                attributes: ["genre_libelle"],
                                through: { attributes: [] }
                            },
                        ]
                    });
                    // console.log(moviesWatched);
    
                    //----- Traitement et gestion des badges dévérouillés : -----//
                    let newObtainedBadges = []; // Définir le tableau contenant les badges qu'il va débloqué.
                    let cmpt = 0    // Définir un compteur utile à la gestion des conditions d'obtention.

                    for(badge of notObtainedBadge){ // Pour tous les badges vérouillés :
                        cmpt = 0;   // Réinitialiser le compteur.
                        switch (badge.badge_type) { // Gérer les différents types d'obtention :
                            case "genre_count": // Dans le cas où la condition dépend des genres regardés :
    
                                const [genreTarget, genreOfCondition] = badge.badge_value.split(",");   // Récupérer les valeurs de la condition.
                                // genreTarget      --> le nombre de films de ce genre à voir.
                                // genreOfCondition --> le genre qui est ciblé.

                                // console.log("Cible :" + target);
                                // console.log("Genre :" + genreOfCondition);
    
                                moviesWatched.forEach(movie => {    // Pour chaques films vus, récupérer tous ses genres :
                                    let genresListPerMovie = [];    // Définir le tableau des genres du film.
                                    movie.dataValues.Genres.forEach(genre => {  // Pour chaques genres du film :
                                        genresListPerMovie.push(genre.genre_libelle); // Insérer le genre.
                                    });
                                    // console.log(genresList);
    
                                    // Si le genre cible de la condition est présent dans la liste des genres du film :
                                    if(genresListPerMovie.includes(genreOfCondition)){
                                        cmpt++; // Incrémenter le compteur.
                                    }
                                });
                                console.log("type : genre_count | condition :", genreOfCondition, "| cible :", genreTarget, "| actuel :", cmpt);
                                
                                if(cmpt >= genreTarget){    // Si le compteur a atteint la cible :
                                    const isCreated = await funct.insertObtainedBadge(userID, badge); // Débloquer le badge correspondant.
                                    if(isCreated){  // Si le badge a bien été débloqué :
                                        newObtainedBadges.push(badge);  // Ajouter ce badge débloqué à la liste des nouveaux badges.
                                    }
                                }
                                break;
    
                            case "date_count":  // Dans le cas où la condition dépend de la date des films regardés :

                                const [dateTarget, dateOfCondition] = badge.badge_value.split(","); // Récupérer les valeurs de la condition.
                                //dateTarget        --> le nombre de films avant la date demandée à voir.
                                //dateOfCondition   --> la date de sortie du film ciblée.

                                // console.log("Cible :" + target);
                                // console.log("Genre :" + genreOfCondition);

                                moviesWatched.forEach(movie => {     // Pour chaque films vus :
                                    // Si l'année est inférieur à la date (l'année) de la condition :
                                    if(movie.movie_released_date.split("-")[0] <= dateOfCondition){
                                        cmpt++; // Incrémenter le compteur.
                                    }
                                });
                                console.log("type : date_count | condition :", dateOfCondition, "| cible :", dateTarget, "| actuel :", cmpt);
                                
                                if(cmpt >= dateTarget){ // Si le compteur a atteint la cible :
                                    const isCreated = await funct.insertObtainedBadge(userID, badge); // Débloquer le badge correspondant.
                                    if(isCreated){  // Si le badge a bien été débloqué :
                                        newObtainedBadges.push(badge);  // Ajouter ce badge débloqué à la liste des nouveaux badges.
                                    }
                                }
                                break;
    
                            case "movie_count": // Dans le cas où la condition dépend du nombre de films vus :

                                const target = badge.badge_value; // Récupérer le nombre de film à voir.
                                cmpt = moviesWatched.length; // Modifier la valeur au nombre de films vus par l'utilisateur.
                                console.log("type : movie_count | cible :", target, "| actuel :", cmpt);

                                if(cmpt >= target){ // Si le compteur a atteint la cible :
                                    const isCreated = await funct.insertObtainedBadge(userID, badge); // Débloquer le badge correspondant.
                                    if(isCreated){  // Si le badge a bien été débloqué :
                                        newObtainedBadges.push(badge); // Ajouter ce badge débloqué à la liste des nouveaux badges.
                                    }
                                }
                                break;

                            default :   // Si aucune des conditions précédantes n'est remplie :
                                console.log("Ce type d'obtention n'est pas pris en charge.");
                        }
                    }

                    //----- Simplifier les données du tableau : -----//
                    newObtainedBadges = newObtainedBadges.map(badge => ({
                        badge_id: badge.badge_id_badge,
                        badge_distinction: badge.badge_distinction,
                        badge_url : badge.badge_url,
                        badge_serial_nb : badge.badge_serial_nb
                    }));
                    // console.log(newObtainedBadges);
    
                    //----- Récupération des données pour la redirection : -----//
                    try{    // Essayer de rediriger l'utilisateur :
                        const moviesQuery = await Movie.findAll({    // Récupérer tous les films : 
                            include: [{     // Jointure sur la table Genre et Director :
                                model: Genre,
                                as: "Genres",
                                attributes: ['genre_libelle'],
                                through: { attributes: []}
                            },
                            {
                                model: Director, 
                                as: 'Directors',
                                attributes: ['director_lastname','director_firstname'],
                                through: { attributes: []}
                            }]
                        });
                        const movies = await funct.getMoviesData(moviesQuery);
    
                        // Retourner à l'accueil à la suite de la publication d'avis.
                        res.render("home", {
                            userData : req.session.user, 
                            movies : movies,
                            badges: JSON.stringify(newObtainedBadges), // Convertion en JSON string
                        });
                    }
                    catch(err){ // En cas d'erreur pour la redirection :
                        console.error("La redirection a échoué :", err);
                        res.status(err.status || 500);
                        res.render("error", {
                            layout : false, 
                            code_error : err.status || 500, 
                            desc_error : "La redirection vers l'acceuil a échoué mais votre avis est bien sauvegardé !" + err
                        });
                    }
                }
                catch(err){ // En cas d'erreur de traitement et de gestion des nouveaux badges :
                    console.error("Erreur lors du traitement des nouveaux badges dévérouillés :", err);
                    res.status(err.status || 500);
                    res.render("error", {
                        layout : false, 
                        code_error : err.status || 500, 
                        desc_error : "Erreur lors du traitement des nouveaux badges dévérouillés : " + err
                    });
                }
            }
            catch(err){ // En cas d'erreur lors de l'enregistrement de l'avis :
                console.error("Erreur lors de l'enregistrement de l'avis :", err);
                res.status(err.status || 500);
                res.render("error", {
                    layout : false, 
                    code_error : err.status || 500, 
                    desc_error : "Erreur lors de l'enregistrement de l'avis : " + err
                });
            }
        }
    }
    catch(err){ // En cas d'erreur lors de la récupération de l'avis utilisateur :
        console.error("Erreur lors de la récupération des informations de votre avis :", err);
        res.status(err.status || 500);
        res.render("error", {
            layout : false, 
            code_error : err.status || 500, 
            desc_error : "Erreur lors de la récupération des informations de votre avis. " + err
        });
    }
});

//---------- Chemin des films vus (GET) : ----------//
app.get("/my-movies", async (req, res) => { 

    try{    // Essayer de récupérer l'identifiant de l'utilisateur :
        const userID = req.session.user.id; // Récupérer l'identifiant de l'utilisateur.
        try{    // Essayer d'afficher les films vus par l'utilisateur :
            const moviesWatchedUser = await Movie.findAll({ // Récupérer les films vus :
                include: [  // Jointure sur les tables UserOpinion, Genre et Director.
                    {
                        model: UserOpinion,
                        as: "Opinions",
                        attributes: [],
                        where: {
                            opinion_id_user: userID // Restriction sur l'identifiant utilisateur.
                        }
                    },
                    {
                        model: Genre,
                        as: "Genres",
                        attributes: ["genre_libelle"],
                        through: { attributes: [] }
                    },
                    {
                        model: Director,
                        as: "Directors",
                        attributes: ["director_lastname", "director_firstname"],
                        through: { attributes: [] }
                    }
                ]
            });
            // console.log(moviesWatchedUser);

            // Afficher la page :
            res.render("myMovies", {
                userData : req.session.user, 
                watchedMovies : moviesWatchedUser
            });
        }
        catch(err){ // En cas d'erreur lors de l'affichage des films vus :
            console.error("Erreur lors de la récupération de vos films :", err);
            res.status(err.status || 500);
            res.render("error", {
                layout : false, 
                code_error : err.status || 500, 
                desc_error : "Les films que vous avez visionnés non pas pu être récupéré correctement... " + err
            });
        }
    }
    catch(err){ // En cas d'erreur lors de la récupération de l'identifiant utilisateur :
        console.error("Chemin d'accès non autorisé pour votre statut :", err);
        res.status(err.status || 404);
        res.render("error", {
            layout : false, 
            code_error : err.status || 404, 
            desc_error : "Le chemin d'accès utilisé est incorrecte... Vous n'avez pas le statut adéquat pour accéder à cette page. " + err
        });
    }
});

//---------- Chemin des films favoris (GET) : ----------//
app.get("/my-favorites", async (req, res) => {

    try{    // Essayer de récupérer l'identifiant de l'utilisateur :
        const userID = req.session.user.id; // Récupérer l'identifiant de l'utilisateur.
        try{    // Essayer d'afficher les films favoris par l'utilisateur :
            const favoritesMoviesUser = await Movie.findAll({   // Récupérer tous les films favoris :
                include: [  // Jointure sur les tables UserOpinion, Genre et Director.
                    {
                        model: UserOpinion,
                        as: "Opinions",
                        attributes: [],
                        where: {
                            [Op.and] : {
                                opinion_id_user: userID,    // Restriction sur l'identifiant utilisateur.
                                opinion_fav : 1             // Et sur la valeur de l'attribut favori (doit être égale à 1/true).
                            }
                        }
                    },
                    {
                        model: Genre,
                        as: "Genres",
                        attributes: ["genre_libelle"],
                        through: { attributes: [] }
                    },
                    {
                        model: Director,
                        as: "Directors",
                        attributes: ["director_lastname", "director_firstname"],
                        through: { attributes: [] }
                    }
                ]
            });
            // console.log(favoritesMoviesUser);

            // Afficher la page :
            res.render("myFav", {
                userData : req.session.user, 
                favoritesMovies : favoritesMoviesUser
            });
        }
        catch(err){ // En cas d'erreur lors de l'affichage des films favoris :
            console.error("Erreur lors de la récupération de vos films favoris :", err);
            res.status(err.status || 500);
            res.render("error", {
                layout : false, 
                code_error : err.status || 500, 
                desc_error : "Les films que vous avez préférés non pas pu être récupéré correctement... " + err
            });
        }
    }
    catch(err){ // En cas d'erreur lors de la récupération de l'identifiant utilisateur :
        console.error("Chemin d'accès non autorisé pour votre statut. :", err);
        res.status(err.status || 404);
        res.render("error", {
            layout : false, 
            code_error : err.status || 404, 
            desc_error : "Le chemin d'accès utilisé est incorrecte... Vous n'avez pas le statut adéquat pour accéder à cette page." + err
        });
    }
});

//---------- Chemin des badges de l'utilisateur (GET) : ----------//
app.get("/my-badges", async (req, res) => { 

    try{    // Essayer de récupérer l'identifiant de l'utilisateur :
        const userID = req.session.user.id; // Récupérer l'identifiant de l'utilisateur.
        // console.log(userID);
        try{    // Essayer d'afficher les badges de l'utilisateur :
            const obtainedBadgesQuery = await UserBadge.findAll({    // Récupérer les badges obtenus par l'utilisateur.
                where: {
                    id_user: { [Op.eq]: userID }    // Restriction sur l'identifiant utilisateur.
                },
                include: [  // Jointure sur la table Badge.
                    {
                        model: Badge,
                        as: "Badge",
                        attributes: ["badge_distinction","badge_url","badge_serial_nb"],
                    }
                ],
                attributes : { exclude : ["id_user"]}   // Projection sur tous les attributs excepté l'identifiant utilisateur.
            });
            // console.log(obtainedBadgesQuery);

            let unlockedBadges = [];    // Définir le tableau des badges dévérouillés.
            obtainedBadgesQuery.forEach(userBadge => {  // Pour chaque badges dévérouillés.
                unlockedBadges.push(userBadge.Badge);   // Insérer dans le tableau.
            });
            // console.log(unlockedBadges);

            try{    // Essayer de récupérer les badges vérouillés :
                // Récupérer uniquement les identifiants des badges vérouillés dans un tableau.
                const idOfUnlockedBadges = obtainedBadgesQuery.map(userBadge => userBadge.id_badge);
                // console.log(idOfUnlockedBadges);

                const lockedBadges = await Badge.findAll({  // Récupérer les badges vérouillés :
                    where : {
                        badge_id_badge : {[Op.notIn] : idOfUnlockedBadges}  // Restriction sur les identifiants des badges.
                    },
                    attributes : ["badge_distinction","badge_url","badge_serial_nb"]    // Projection sur 3 champs.
                });
                // console.log(lockedBadges);

                // Afficher la page :
                res.render("myBadges", {
                    userData: req.session.user, 
                    obtainedBadges : unlockedBadges,
                    notObtainedBadges : lockedBadges
                });
            }
            catch(err){ // En cas d'erreur lors de la récupération des badges vérouillés :
                console.error("Erreur lors de la récupération des badges vérouillés :", err);
                res.status(err.status || 500);
                res.render("error", {
                    layout : false, 
                    code_error : err.status || 500, 
                    desc_error : "Une erreur s'est produite lors de la récupération des badges vérouillés :" + err
                });
            }
        }
        catch(err){ // En cas d'erreur lors de la récupération des badges dévérouillés :
            console.error("Erreur lors de la récupération de vos badges :", err);
            res.status(err.status || 500);
            res.render("error", {
                layout : false, 
                code_error : err.status || 500, 
                desc_error : "Une erreur s'est produite lors de la récupération de vos badges :" + err
            });
        }
    }
    catch(err){ // En cas d'erreur lors de la récupération de l'identifiant utilisateur :
        console.error("Chemin d'accès non autorisé pour votre statut :", err);
        res.status(err.status || 404);
        res.render("error", {
            layout : false, 
            code_error : err.status || 404, 
            desc_error : "Le chemin d'accès utilisé est incorrecte... Vous n'avez pas le statut adéquat pour accéder à cette page." + err
        });
    }
});

app.get("/parameters", (req, res) => {      //Chemin vers les paramètres.
    if(req.session.user){
        res.render("parameters", {
            userData : req.session.user
        });
    }
    else{
        res.render("parameters");
    }
});

app.listen(3000, () => {    // Lancer le serveur.
    console.log("Server started!");
});