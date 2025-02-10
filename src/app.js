//-----------------------------------Importations des modules node:---------------------------------------//

//Modules généraux :
const express = require('express');                         //Module express
const {engine} = require('express-handlebars');             //Gestion d'express et handlebars
const Handlebars = require('handlebars');                   //Gestion des helpers pour les templates Handlebars
const {Op, Model} = require('sequelize');                   //Gestion des clauses de requête SQL
const bodyParser = require('body-parser');                  //Gestion des entrées de formulaire HTML
const path = require('path');                               //Gestion correcte de chemins d'accès
const session = require('express-session');                 //Gestion de sessions utilisateurs

//Modules de sécurité : 
const sanitizeHtml = require('sanitize-html');              //Protéger contre les Injection SQL
const bcrypt = require('bcrypt');                           //Hacher les mots de passe  

//Import de module locaux : 
const {Movie, Director, Genre, User, UserOpinion, Emotion, Vote, Badge, UserBadge} = require('./models'); //Importation des modèles de BDD
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

    //Helpers pour exécuter des fonctions lors du rendu des templates (côté client) :
    helpers: {
        convertRuntime: funct.convertRuntime,
        convertDateFormat: funct.convertDateFormat,
        normalizeString: funct.normalizeString,
    }
}));

//Définition d'un Helper personnalisé :
Handlebars.registerHelper("ifnot", function(value, options){
    //value --> valeur transmis après le "ifnot" dans le code Handlebars.
    //options --> décide quel bloc s'éxécute.
    if(!value){                         //Si le paramètre est falsy :
        return options.fn(this);        //Exécute le bloc principale "#ifnot"
    }
    else{                               //Sinon :
        return options.inverse(this);   //Exécute la partie "else"
    }
});

Handlebars.registerHelper("ifnot-or-if", function(value1, value2, options){
    if(!value1 || value2){          //Si le premier est falsy ou que le second est truly :
       return options.fn(this);
    }
    else{
        return options.inverse(this);
    }
});

app.set("view engine", "handlebars");                       //Définir les extensions de fichier à rechercher lors d'un rendu
app.set("views", "./views");                                //Configuration du répertoire des templates.

app.use(express.static(path.join(__dirname, "assets")));    //Définir le chemin des ressources statiques.
app.use(bodyParser.urlencoded({ extended: true}));          //Triater les données passées par URL.
app.use(session({
    secret: 'io8948Yhdid00nidz', // Une clé secrète pour signer la session
    resave: false, // Ne sauvegarde pas la session si aucune modification
    saveUninitialized: false, // Ne crée pas une session vide
    cookie: { 
      maxAge: 1000*60*60, // Durée de vie du cookie (en ms)
      httpOnly: true // Rend le cookie inaccessible depuis JavaScript côté client (sécurité+)
    }
}));

//-----------------------------------Définitions des routes:-------------------------------//

app.get("/", async (req, res) => {              //Chemin d'origine
    try {
        const allMoviesQuery = await Movie.findAll({     //Rechercher tous les films :           
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
        // console.log(allMoviesQuery);

        //Récupération des données complémentaires dynamiques des films.
        const allMoviesAndData = await funct.getMoviesData(allMoviesQuery);
        // console.log(allMoviesAndData);

        if(allMoviesAndData.error){
            res.status(500).send("Erreur : " + allMoviesAndData.error);
            //>>>>>>Envoyé la page d'erreur correspondante 
        }
        else{
            if(req.session.user){
                //Retourner le template home.handlebars avec la donnée movies et les données de session de l'utilsateur connecté.
                res.render("home", {userData : req.session.user, movies : allMoviesAndData});
            }
            else{
                //Retourner le template home.handlebars avec la donnée movies.
                res.render("home", {movies : allMoviesQuery});
            }
        }

    } catch (err){
        console.error("Erreur lors de l'affichage des donneés.", err);
        res.status(500).send("Erreur lors de l'affichage des données.");
    }
});

//Route pour la recherche de film par filtre (+ réinitialisation)
app.get("/moviesList", async (req, res) => {    //Chemin du filtrage des films obtenu par requête GET. 

    try{
        const genresList = await Genre.findAll();   //Récupérer tous les genres sans filtrage.
        //Réinitialiser le filtre des genres :
        genresList.forEach(genre => {               //Pour chaque genre :
            if("selected" in genre){                //Si l'attribut "selected" existe dans les données de "genre".
                genre.selected = false;             //Réinitiliser la séléction des genres (état non séléctionné)
            }
        });

        if(req.session.user){
            res.render("filter", {
                userData : req.session.user,    //Transmettre les données de session utilisateur.
                genresList : genresList,        //Transmettre la liste des genres.
                currentFilters : null,          //Réinitialiser les filtres.
            });
        }
        else{
            res.render("filter", { 
                genresList : genresList,        //Transmettre la liste des genres.
                currentFilters : null,          //Réinitialiser les filtres.
            });
        }
    }
    catch(err){
        console.log("Erreur de redirection.");
        res.send("Erreur de redirection.");
    }
});

app.post("/moviesList", async (req,res) => {    //Chemin du filtrage des films obtenu par requête POST.

    try {
        const selectedGenres = req.body.genres;         // Récupération des genres sélectionnés
        const minRuntime = req.body.runtimeMinScale;    // Récupération de la Durée minimale 
        const maxRuntime = req.body.runtimeMaxScale;    // Récupération de la Durée maximale
        const minYear = req.body.dateMinScale;          // Récupération de la Date de sortie minimale
        const maxYear = req.body.dateMaxScale;          // Récupération de la Date de sortie maximale
        // console.log(selectedGenres);
        // console.log(minRuntime);
        // console.log(maxDate);

        // Construire dynamiquement la clause WHERE
        const whereClause = {};
        const savedFilters = {};

        // Ajouter le filtre par genres si sélectionné
        //----------------------------------
        //Résultat attendu incorrecte (n'affiche pas tous les genres originaux)
        //----------------------------------
        if (selectedGenres) {
            const selectedValues = Object.keys(selectedGenres); // Récupération des clés (noms des genres) uniquement
            whereClause["$Genres.genre_libelle$"] = { [Op.in]: selectedValues };
            
            //Add savedFilters !!!
            savedFilters.genreArray = selectedValues;
        }
        //----------------------------------
        //----------------------------------

        // Ajouter le filtre par durée si spécifié:
        if (minRuntime || maxRuntime) {

            //Vérifie si des clauses AND existe déjà, sinon initialise un tableau.
            if(!whereClause[Op.and]){
                whereClause[Op.and] = [];
            }
            //Ajoute les conditions sur la durée du film : minRuntime <= movie_runtime <= maxRuntime
            if (minRuntime) {
                whereClause[Op.and].push({ movie_runtime: { [Op.gte]: minRuntime } });
                savedFilters.minRuntime = minRuntime;
            }
            if (maxRuntime) {
                whereClause[Op.and].push({ movie_runtime: { [Op.lte]: maxRuntime } });
                savedFilters.maxRuntime = maxRuntime;
            }
        }

        //Ajouter le filtre par date de sortie si spécifié:
        if(minYear || maxYear){

            //Vérifie si des clauses AND existe déjà, sinon initialise un tableau.
            if(!whereClause[Op.and]){
                whereClause[Op.and] = [];
            }
            //Ajout des filtres sur la date de sortie du film : fullMinDate <= movie_release_date <= fullMaxDate
            if(minYear){
                const fullMinDate = minYear + "-01-01"; //Reconstition d'une date minimale complète pour préciser la requête.
                whereClause[Op.and].push({movie_released_date : {[Op.gte]: fullMinDate} });
                savedFilters.minReleasedDate = minYear;
            }
            if(maxYear){
                const fullMaxDate = maxYear + "-12-31"; //Reconstition d'une date maximale complète pour préciser la requête.
                whereClause[Op.and].push({movie_released_date : {[Op.lte]: fullMaxDate} });
                savedFilters.maxReleasedDate = maxYear;
            }
        }

        // console.log(whereClause);
        console.log(savedFilters);

        // Effectuer la requête avec les clauses dynamiques
        const queryFilter = await Movie.findAll({
            where: whereClause,
            include: [
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
        // console.log(queryFilter);
        const filteredMovies = await funct.getMoviesData(queryFilter);
        
        // Rendu de la vue avec les résultats
        const genresList = await Genre.findAll(); // Liste des genres pour le formulaire

        // Marquer les genres sélectionnés dans genresList
        genresList.forEach(genre => {
            // Vérifie si ce genre est dans les genres sélectionnés
            genre.selected = savedFilters.genreArray && savedFilters.genreArray.includes(genre.genre_libelle);
        });
        // console.log(genresList);

        if(filteredMovies.error){
            res.status(500).send("Erreur détéctée :" + filteredMovies.error);
            //>>>>>>>Envoyé la page d'erreur
        }
        else{
            if (req.session.user) {
                // res.render("filter", {userData : req.session.user, filteredMovies : filteredMovies});
                res.render("filter", {
                    userData: req.session.user, 
                    genresList,
                    filteredMovies: filteredMovies,
                    currentFilters : savedFilters,
                });
            } else {
                // res.render("filter", {filteredMovies : filteredMovies});
                res.render("filter", {
                    genresList, 
                    filteredMovies: filteredMovies,
                    currentFilters : savedFilters,
                });
            }
        }

    } catch (error) {
        console.error("Erreur lors du filtrage :", error);
        res.status(500).send("Une erreur est survenue lors du filtrage des films.");
    }
});

app.get("/search", (req,res) => {           //Chemin de recherche des films par requête GET.
    
    if(req.session.user){
        res.render("search", {userData : req.session.user});
    }
    else{
        res.render("search");
    }
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
        // console.log(query);
        const researchedMovies = await funct.getMoviesData(query);

        if(researchedMovies.error){
            res.status(500).send("Erreur détéctée :" + researchedMovies.error);
            //>>>>>>>Envoyé la page d'erreur
        }
        else{
            if(req.session.user){
                res.render("search", {userData : req.session.user, result : researchedMovies, research : value});
            }
            else{
                res.render("search", {result : researchedMovies, research : value});
            }
        }
    }
    catch{
        console.error("Erreur lors de la recherche des donneés.");
        res.status(500).send("Une erreur s'est produite lors de la recherche.");
    }
});

app.get("/login", (req, res) => {   //Chemin de connexion initial (GET).

    if(req.session.user){
        res.render("login", {userData : req.session.user});
    }
    else{
        res.render("login");
    }
});

app.post("/login", async (req,res) => {     //Chemin de connexion (POST).

    const emailInputLog = req.body.email;       //Récupération de l'email transmis
    const passwordInputLog = req.body.password; //Récupération du mot de passe transmis
    let msgError = "";                          //Initialisation d'un message d'erreur potentiel.

    //-------------------------------Sécuriser les entrées utilisateurs---------------------------------
    //Gestion de la taille des entrées.
    if(emailInputLog.length > 40 || passwordInputLog.length > 25){
        msgError = "La taille des champs n'a pas été respectée !";
    }
    //Début de traitement des données.
    else{

        //Gestion de l'email :
        const safeEmail = emailInputLog.trim(); //L'input de type "email" se charge déjà de la bonne syntaxe.
        // console.log("Email de connexion : " + safeEmail);

        //Gestion du mot de passe :
        let safePassword = funct.cleanPassword(passwordInputLog);
        // console.log("Mot de passe de connexion : " + safePassword);

        //Si le mot de passe sécurisé correspond au mot de passe initial.
        if(safePassword == passwordInputLog){
            //Récupérer la liste des utilisateurs.
            const users = await User.findAll();
            // console.log(users);

            //Rechercher dans un premier temps une correspondance avec l'adresse Email.
            let foundEmail = false;
            let i = 0;

            //Tant que l'email recherché n'est pas trouvé ou que la liste n'est pas parcouru totalement.
            while(!foundEmail && i < users.length){
                if(emailInputLog == users[i].user_email){ //L'email corresponds :
                    //Email/Utilisateur trouvé.
                    foundEmail = true;
                }
                else{//L'email ne corresponds pas :
                    i++; //Passer à l'utilisateur suivant.
                }
            }

            //Dans un second temps comparer la correspondance avec le mot de passe.
            if(foundEmail){//L'email/l'utilisateur est trouvé : 
                try {
                    //await bcrypt.compare(<brutPassword>, <HashedPassword>);
                    const isPwMatch = await bcrypt.compare(passwordInputLog, users[i].user_mdp);
                    if (isPwMatch) {//Le mot de passe transmis corresponds.
                        const authenticateUser = users[i];
                        //Création de la session utilisateur.
                        req.session.user = {
                            id: authenticateUser.user_id_user,
                            username: authenticateUser.user_username,
                            email: authenticateUser.user_email,
                            admin: authenticateUser.user_admin,
                        }
                        console.log(req.session.user);
                        console.log("Connecté avec succès !");
                    } else { // Le mot de passe transmis ne corresponds pas.
                        msgError = "Mot de passe incorrect.";
                    }
                } catch (error) {
                    console.error('Erreur lors de la recherche de correspondance entre les mots de passe :', error);
                }
            }
            else{//L'email n'est pas dans la liste des utilisateurs : 
                msgError = "L'email transmis n'est associé à aucun compte utilisateur !";
            }
        }
        else{ //Si le mot de passe initial est différent du mot de passe sécurisé :
            //On s'arrête ici car le mot de passe entré par l'utilisateur sera différent et ne pourra pas être correctement comparé.
            msgError = "Votre mot de passe de connexion semble suspect... Veuillez réessayer.";
        }
    }
    if(msgError){//Une erreur est relevée :
        res.render("login", {error : msgError});
    }
    else{//Succès de la connexion :
        try {
            const movieQuery = await Movie.findAll({           //Rechercher tous les films : 
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
            const movies = await funct.getMoviesData(movieQuery);

            if(movies.error){
                res.status(500).send("Erreur détéctée :" + movies.error);
                //>>>>>>>Envoyé la page d'erreur
            }
            else{
                if(req.session.user){
                    res.render("home", {
                        userData : req.session.user, movies : movies});
                }
                else{
                    res.render("home", {movies : movies});
                }
            }
        }
        catch(err){
            console.error("Erreur lors de la redirection vers l'acceuil.");
            res.status(500).send("Erreur lors de la redirection vers l'acceuil. Les données n'ont pas pu être chargées...");
        }
    }
});

//Route de deconnection de compte :
app.get("/logout", (req, res) => {

    try {
        req.session.destroy();          //Détruire la session utilisateur.
        res.clearCookie("connect.sid"); //Supprimer le cookie de session du client (utilisé pour identifier).
        console.log("Déconnecté avec Succés !");
    } 
    catch (error) {
        console.log("Erreur lors de la déconnexion.");
        res.status(500).send("Une erreur est survenue lors de la déconnexion à votre compte.");
    }
    res.redirect("/");  //Redirige vers l'URL de l'accueil.
});

//Chemin de création de compte :
app.get("/create-account", (req, res) => {
    if(req.session.user){
        //>>>>>>>>>>>>
        //Bloqué la page de création de compte si déjà connecté
        //>>>>>>>>>>>>
        res.render("createAccount", {userData : req.session.user});
    }
    else{
        res.render("createAccount");
    }
});

//Chemin de création de compte par POST :
app.post("/create-account", async (req,res) => { 

    //Récupérer les adresses emails existantes.
    const existingEmail = await User.findAll({
        attributes: ['user_email']
    });
    const emailList = existingEmail.map(email => email.user_email);
    // console.log(emailList);

    try{
        //----------------------------------------------------
        //Voir pour mettre la partit récup + insertion dans une fonction pour séparer le code.
        //----------------------------------------------------

        let usernameInputCA = req.body.username;   //Récupèration du pseudo.
        let emailInputCA = req.body.email;         //Récupération de l'email.
        const passwordInputCA = req.body.password; //Récupération du mot de passe. Ne doit pas être altéré !
        let msgError = "";                  //Définition d'un message d'erreur potentiel.

        //-----------------------------------
        //Ajouter une fonction vérif du mdp. (taille, caractère spéciaux)
        //-----------------------------------

        //Gestion de la taille des entrées.
        if(usernameInputCA.length > 25 || emailInputCA.length > 40 || passwordInputCA.length > 25){
            msgError = "La taille des champs n'a pas été respectée !";
        }
        //Gestion de l'unicité des adresses email. (1 compte = 1 adresse email)
        else if(emailList.includes(emailInputCA)) {
            msgError = "L'email transmis existe déjà. Veuillez en choisir un autre.";
        }
        //Début de traitement des données.
        else{
            usernameInputCA = usernameInputCA.trim();              //Supprimer les espaces de trop.
            const safeUsername = sanitizeHtml(usernameInputCA, {   //Limiter les balises HTML :
                allowedTags: ['b','i','em','strong'],       //Balises autorisées.
                allowedAttributes: []                       //Attributs de balises autorisés.
            });
            console.log("Pseudo utilisateur traité : " + safeUsername);

            //Erreur en cas de nom d'utilisateur suspect.
            if(!safeUsername){
                msgError = "Impossible de créer un compte. Votre nom d'utilisateur semble suspect...";
            }
            else{
                //Gestion de l'email :
                const safeEmail = emailInputCA.trim(); //L'input de type "email" se charge déjà de la bonne syntaxe.
                console.log("Email traité : " + safeEmail);

                //Gestion du mot de passe :
                let safePassword = funct.cleanPassword(passwordInputCA);

                //Si le mot de passe initial est différent du mot de passe sécurisé
                if(safePassword != passwordInputCA){
                    //On empêche la création du compte car le mot de passe entré par l'utilisateur sera différent.
                    msgError = "Impossible de créer votre compte. Votre mot de passe semble suspect...";
                }
                else{//Si le mot de passe sécurisé correspond au mot de passe initial.
                    const hashedPw = await bcrypt.hash(safePassword,11);
                    console.log("Mot de passe haché : " + hashedPw);
                    
                    try{
                        //Insérer les informations dans la BDD.
                        await User.create(
                            {
                                user_username : safeUsername,
                                user_email : safeEmail,
                                //Enregistrement du mdp haché !
                                user_mdp : hashedPw
                            }
                        );
                        console.log("Utilisateur enregistré.");
                    }
                    catch{
                        console.log("Une erreur est survenue lors de la création de votre compte utilisateur.");
                        res.status(500).send("Une erreur est survenue lors de la création de votre compte utilisateur.");
                    }
                }
            }
        }
        //Fin de traitement des données.
        
        if(msgError){//Si une erreur est détécté.
            res.render("createAccount", {error : msgError});
        }
        else{//Sinon
            res.render("login", {createdAccount : true}); //Redirection vers la page de connexion.
        }
    }
    catch {
        console.log("Une erreur est survenue lors de la récupération de vos informations.");
        res.status(422).send("Une erreur est survenue lors de la récupération de vos informations.");
    }
});

//Chemin de publication d'un avis :
app.get("/shareReview", async (req,res) => {

    //------------------
    //>>>>>>Check la structure du code
    //------------------

    const movieID = req.query.movie;        //Récupération de l'identifiant du film concerné.
    let existingReview = false;

    if(req.session.user){   //Si un utilisateur est connécté
        const userID = req.session.user.id; //On récupère son identifiant

        const reviewByCurrentUser = await UserOpinion.findAll({ //Avis de l'utilisateur actuel
            where : {
                [Op.and] : {
                    opinion_id_movie : {[Op.eq] : movieID},
                    opinion_id_user : {[Op.eq] : userID}
                }
            }
        });
        console.log(reviewByCurrentUser);
        if(reviewByCurrentUser.length != 0){
            console.log("un avis est publié ici");
            existingReview = true;
        }
    }

    if(movieID){
        //---------------------Afficher le film séléctionné :-------------------
        try{ 
            const movieQuery = await Movie.findAll({        //Récupérer les informations du film correspondant
                where : {
                    movie_id_movie : {[Op.eq] : movieID}    //Restriction sur l'identifiant du film.
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
            // Voir pour passer au raw: true pour faciliter et alléger les infos récupérées ou le noter dans le CR.
            // console.log(movieQuery);

            const movies = await funct.getMoviesData(movieQuery);
    
            const emotionQuery = await Emotion.findAll();   //Récupérer toutes les émotions disponibles.
            // console.log(emotionQuery);
    
            //---------------------Afficher les avis associés au film séléctionné :-------------------
            try {
                const opinions = await UserOpinion.findAll({    //Récupérer les avis associées au film.
                    where : {
                        opinion_id_movie : {[Op.eq] : movieID}  //Restriction sur l'identifiant du film.
                    },
                    include : [
                        {
                            model: User,
                            as: "User", // Doit correspondre à l'alias défini dans belongsTo
                            attributes: ["user_username"], // Colonnes spécifiques à inclure
                        }
                    ]
                });
                // console.log(opinions);
                
                const votes = await Vote.findAll({      //Récupérer les votes d'émotions associé au film.
                    where : {
                        id_movie : {[Op.eq] : movieID}  //Restriction sur l'identifiant du film.
                    },
                    include : [
                        {
                            model : Emotion,
                            as : "Emotion",
                            attributes : ["emotion_name"],  //Récupération directe du nom des émotions votées.
                        }
                    ]
                });
                // console.log(votes);

                //Associé les avis avec les émotions des mêmes utilisateurs.
                votes.forEach(vote => {     //Pour chaque votes récupérés :
                    opinions.forEach(opinion => {   //Pour chaque avis publiés :
                        //Si l'utilisateur qui a publié l'avis a aussi voté l'émotion concernée :
                        if(opinion.opinion_id_user === vote.id_user){
                            if(!opinion.vote){      //Si l'objet vote n'existe pas, le créer.
                                opinion.vote = [];
                            }
                            opinion.vote.push({emotion : vote.Emotion.emotion_name}); //Ajouter l'émotion votée à l'avis émit.
                        }
                    });
                });
                // console.log(votes);
                // console.log(opinions);

                if(movies.error){
                    res.status(500).send("Erreur détéctée :" + movies.error);
                    //>>>>>>>
                    //Envoyé la page d'erreur
                    //>>>>>>>
                }
                else{
                    if(req.session.user){ //Si l'utilisateur est inscrit :
                        res.render("shareReview", {
                            userData : req.session.user, 
                            movie : movies, emotionsList: emotionQuery, 
                            reviews: opinions, 
                            existingReview : existingReview
                        });
                    }
                    else{   //S'il ne l'est pas :
                        res.render("shareReview", {
                            movie : movies,
                            emotionsList: emotionQuery, 
                            reviews : opinions
                        });
                    }
                }
            }
            catch (err) {
                console.error("Impossible de charger la section des commentaires.", err);
                res.status(500).send("Impossible de charger la section des commentaires.");
            }
        }
        catch(err){
            console.log("Impossible d'accéder au film que vous souhaitez.");
            res.status(500).send("Impossible d'accéder au film que vous souhaitez.");
        }
    }
    else{
        //Si on accède à la page shareReview directement depuis l'URL :
        console.log("Chemin d'accès anormal.");
        res.status(404).send("Le chemin d'accès utilisé est incorrecte...");
    }
});

//Chemin de publication d'un avis par post
app.post("/shareReview", async(req,res) => {

    try{
        //Récupération des entrées de l'avis utilisateur par le formulaire :
        const noteReview = parseInt(req.body.note,10);  //Conversion de la note en INT pour la BDD.
        let emotionsChoices = req.body.emotions;
        let favReview = req.body.fav;                   //favReview vaut "undefined" ou "on".
        let commentReview = req.body.comment;

        //Si aucune émotions n'est choisi ou qu'aucun commentaire est fait, l'avis est considéré comme imcomplet :
        if(!emotionsChoices && commentReview == ""){
            const movieID = req.body.movie;
            console.log("Redirection vers la page d'avis en raison du manque d'information.");
            res.redirect(`/shareReview?movie=${movieID}`);
        }
        //S'il y a assez d'informations pour traiter l'avis :
        else{
            //---------Traitement du favori :----------- : (pour correspondre au modèle de la BDD)
            favReview = favReview ? true : false;   //true si favReview vaut "on", false s'il vaut undefined.
            // console.log(favReview);

            //---------Traitement du commentaire :----------- :
            if(commentReview == ""){    //S'il est vide :
                commentReview = null;
            }
            else{   //S'il n'est pas vide :
                commentReview = commentReview.trim();           //Supprimer les espaces de trop.
                commentReview = sanitizeHtml(commentReview, {   //Limiter les balises HTML :
                    allowedTags: ['b','i','em','strong', 'br'], //Balises autorisées.
                    allowedAttributes: []                       //Attributs de balises autorisés.
                });
            }
            // console.log(commentReview);

            //---------Enregistrement de l'avis :----------- :
            try{
                const userID = parseInt(req.session.user.id,10); //Forcer le type INT sur l'identifiant user.
                // console.log("id user:", userID);
                const movieID = parseInt(req.body.movie, 10);   //Forcer le type INT sur l'identifiant movie.
                // console.log("id movie :", movieID);

                //>>>>>>>>>>>>>>>>>
                //Temporairement commenté pour les tests:
                // await UserOpinion.create(   //Insérer l'avis dans la BDD :
                //     {
                //         opinion_id_user : userID,
                //         opinion_id_movie : movieID,
                //         opinion_note : noteReview,
                //         opinion_fav : favReview,
                //         opinion_comment : commentReview,
                //     }
                // );

                //---------Traitement des Emotions :----------- :
                if(emotionsChoices){
                    emotionsChoices = Object.keys(emotionsChoices); //Récupération des noms des émotions seulement ({émotions : "on"})
                    // console.log(emotionsChoices);

                    //Contraignant de récupérer l'id par le formulaire, cela surcharge le formulaire, on préfèrera volontairement rechercher dans la BDD.
                    //Pour toutes les émotions choisies (3 au plus) faire :
                    for (emotion of emotionsChoices){
                        const emotionChoiceQuery = await Emotion.findAll({ //Récupérer l'identifiant de l'émotion associée :
                            attributes: ["emotion_id_emotion"],
                            where : {
                                emotion_name : {[Op.eq] : emotion}
                            }
                        });

                        //Eviter de récupérer un tableau à la suite du .map() (retour par défaut).
                        const emotionID = emotionChoiceQuery.map(emotion => emotion.dataValues.emotion_id_emotion)[0];
                        // console.log(emotionID);

                        //---------Enregistrement du/des vote(s) dans la BDD : -----------
                        //>>>>>>>>>>>>>>>>>
                        //Temporairement commenté pour les tests :

                        // await Vote.create(  
                        //     {
                        //         id_user : userID,
                        //         id_movie : movieID,
                        //         id_emotion : emotionID
                        //     }
                        // );                
                        //transaction et callback ???
                        // console.log("Vote de l'émotion ", emotionID, " de l'utilisateur", userID, "enregistré pour le film", movieID);
                    }
                    console.log("Avis avec votes des émotions de l'utilisateur", userID, "enregistré pour le film", movieID);
                }
                else{
                    console.log("Avis sans votes de l'utilisateur", userID, "enregistré pour le film", movieID);
                }

                //---------------------------------------------------------------------
                //Gestion des nouveaux badges obtenus suite à la soumission de l'avis :
                //---------------------------------------------------------------------
                
                try{
                    //Récupération des badges non obtenus :
                    const notObtainedBadge = await Badge.findAll({
                        include: [{
                            model: UserBadge,
                            as : "userBadges",
                            attributes : [],
                            required: false,
                            where: { id_user: userID }  //Restriction par l'identifiant utilisateur
                        }],
                        //Récupéré ce qu'il ne possède pas, sans association dans la table userBadge.
                        where: {
                            '$userBadges.id_badge$': null
                        }
                    });
                    // console.log("Les badges non obtenues :", notObtainedBadge);
                    
                    //Récupéré l'ensemble des films qu'il a vu (celui sur lequel il vient de donner un avis aussi)
                    const moviesWatched = await Movie.findAll({
                        include: [
                            {
                                model: UserOpinion,
                                as: "UserOpinions",
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
    
                    let newObtainedBadges = []; //Tableau contenant les badges qu'il va débloqué.
                    let cmpt = 0    //Compteur pour la gestion des conditions d'obtention.
                    for(badge of notObtainedBadge){ //Pour tous les badges qu'il n'a pas débloqué.
                        cmpt = 0;   //réinitialisation du compteur.
                        switch (badge.badge_type) {
                            case "genre_count": //La condition dépend des genres regardés :
    
                                const [genreTarget, genreOfCondition] = badge.badge_value.split(",");
                                //genreTarget --> le nombre de films de ce genre à voir.
                                //genreOfCondition --> le genre qui est ciblé.

                                // console.log("Cible :" + target);
                                // console.log("Genre :" + genreOfCondition);
    
                                //Pour chaque films vus, récupéré tous ses genres :
                                moviesWatched.forEach(movie => {
                                    let genresListPerMovie = [];    //Tableau des genres du film.
                                    movie.dataValues.Genres.forEach(genre => {
                                        genresListPerMovie.push(genre.genre_libelle); //Insertion des genres.
                                    });
                                    // console.log(genresList);
    
                                    //Si le genre cible est présent dans la liste de genre du film :
                                    if(genresListPerMovie.includes(genreOfCondition)){
                                        cmpt++; //Incrémenter le compteur.
                                    }
                                });
                                console.log("type : genre_count | condition :", genreOfCondition, "| cible :", genreTarget, "| actuel :", cmpt);
                                
                                //Si le compteur a atteint la cible :
                                if(cmpt >= genreTarget){
                                    //Débloqué le badge correspond.
                                    const isCreated = await funct.insertObtainedBadge(userID, badge);
                                    if(isCreated){
                                        newObtainedBadges.push(badge);  //Ajouter ce badge débloqué à la liste.
                                    }
                                }
                                break;
    
                            case "date_count":  //La condition dépend de la date des films regardés :
                                const [dateTarget, dateOfCondition] = badge.badge_value.split(",");
                                //dateTarget --> le nombre de films avant la date demandée à voir.
                                //dateOfCondition --> la date de sortie du film ciblée.

                                // console.log("Cible :" + target);
                                // console.log("Genre :" + genreOfCondition);

                                //Pour chaque films vus :
                                moviesWatched.forEach(movie => {
                                    //Si l'année est inférieur à la date(année) de la condition :
                                    if(movie.movie_released_date.split("-")[0] <= dateOfCondition){
                                        cmpt++; //Incrémenter le compteur.
                                    }
                                });
                                console.log("type : date_count | condition :", dateOfCondition, "| cible :", dateTarget, "| actuel :", cmpt);
                                
                                //Si le compteur a atteint la cible :
                                if(cmpt >= dateTarget){
                                    //Débloqué le badge correspond.
                                    const isCreated = await funct.insertObtainedBadge(userID, badge);
                                    if(isCreated){
                                        newObtainedBadges.push(badge);  //Ajouter ce badge débloqué à la liste.
                                    }
                                }
                                break;
    
                            case "movie_count": //La condition du nombre de films vus :
                                const target = badge.badge_value; //Nombre de film à voir.
                                cmpt = moviesWatched.length; //Compteur égale au nombre de films vus.
                                console.log("type : movie_count | cible :", target, "| actuel :", cmpt);

                                //Si le compteur a atteint la cible :
                                if(cmpt >= target){
                                    //Débloqué le badge correspond.
                                    const isCreated = await funct.insertObtainedBadge(userID, badge);
                                    if(isCreated){
                                        newObtainedBadges.push(badge); //Ajouter ce badge débloqué à la liste.
                                    }
                                }
                                break;

                            default :
                                console.log("Ce type d'obtention n'est pas pris en charge.");
                        }
                    }

                    //Simplification des données du tableau :
                    newObtainedBadges = newObtainedBadges.map(badge => ({
                        badge_id: badge.badge_id_badge,
                        badge_distinction: badge.badge_distinction,
                        badge_url : badge.badge_url,
                        badge_serial_nb : badge.badge_serial_nb
                    }));
                    // console.log(newObtainedBadges);
    
                    //----------------------------------------------
                    //Récupération des données pour la redirection :
                    //----------------------------------------------
    
                    try{
                        const movieQuery = await Movie.findAll({           //Rechercher tous les films : 
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
                        const movies = await funct.getMoviesData(movieQuery);
                        //Pas de gestion d'erreur sur la fonction getMoviesData
                        //S'il y a une erreur le premier catch() s'en chargera.
    
                        //Retour à l'accueil à la suite de la publication d'avis.
                        res.render("home", {
                            userData : req.session.user, 
                            movies : movies,
                            badges: JSON.stringify(newObtainedBadges), // Convertion en JSON string
                        });
                    }
                    catch(err){
                        console.error("La redirection a échoué :", err);
                        res.status(500).send("La redirection vers l'acceuil a échoué mais votre avis est bien sauvegardé !");
                    }
                }
                catch(err){
                    console.error("Erreur lors de la mise à jour des badges :", err);
                    res.status(500).send("Erreur lors de la mise à jour des badges.");
                }
            }
            catch(err){
                console.error("Erreur lors de l'enregistrement de l'avis :", err);
                res.status(500).send("Erreur lors de l'enregistrement de l'avis.");
            }
        }
    }
    catch(err){
        console.log("Erreur lors de la récupération des informations de votre avis :", err);
        res.status(500).send("Erreur lors de la récupération des informations de votre avis.");
    }
});

app.get("/my-movies", async (req, res) => {       //Chemin vers les films de l'utilisateur.

    if(req.session.user){   //Si un utilisateur est connecté :
        try{
            const userID = req.session.user.id; //Récupération de son identifiant :

            const moviesWatchedUser = await Movie.findAll({ //Récupération de tous les films vus par l'utilisateur :
                include: [
                    {
                        model: UserOpinion,
                        as: "UserOpinions",
                        attributes: [],
                        where: {
                            opinion_id_user: userID //Restriction sur l'identifiant utilisateur.
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

            res.render("myMovies", {
                userData : req.session.user, 
                watchedMovies : moviesWatchedUser
            });
        }
        catch(err){
            console.error("Erreur lors de la récupération de vos films.", err);
            res.status(500).send("Vos films visionnés non pas pu être récupéré correctement...");
        }
    }
    else{
        console.error("Chemin d'accès non autorisé pour votre statut.");
        res.status(404).send("Le chemin d'accès utilisé est incorrecte... Vous n'avez pas le statut adéquat pour accéder à cette page.");
    }
});

app.get("/my-favorites", async (req, res) => {    //Chemin vers les films favoris de l'utilisateur.

    if(req.session.user){   //Si un utilisateur est connecté :
        try{
            const userID = req.session.user.id; //Récupération de son identifiant :

            const favoritesMoviesUser = await Movie.findAll({ //Récupération de tous les films favoris par l'utilisateur :
                include: [
                    {
                        model: UserOpinion,
                        as: "UserOpinions",
                        attributes: [],
                        where: {
                            [Op.and] : {
                                opinion_id_user: userID,    //Restriction sur l'identifiant utilisateur.
                                opinion_fav : 1             //Et sur la valeur de l'attribut favori (true).
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

            res.render("myFav", {
                userData : req.session.user, 
                favoritesMovies : favoritesMoviesUser
            });
        }
        catch(err){
            console.error("Erreur lors de la récupération de vos films.", err);
            res.status(500).send("Vos films préférés non pas pu être récupéré correctement...");
        }
    }
    else{
        console.error("Chemin d'accès non autorisé pour votre statut.");
        res.status(404).send("Le chemin d'accès utilisé est incorrecte... Vous n'avez pas le statut adéquat pour accéder à cette page.");
    }
});

app.get("/my-badges", async (req, res) => {       //Chemin vers les badges de l'utilisateur.

    if(req.session.user){   //Si l'utilisateur est bien connecté
        try{
            const userID = req.session.user.id; //Récupération de l'identifiant utilisateur
            // console.log(userID);

            const userBadgeQuery = await UserBadge.findAll({
                where: {
                    id_user: { [Op.eq]: userID }    //Restriction sur l'identifiant utilisateur
                },
                include: [  //Jointure avec la table Badge
                    {
                        model: Badge,
                        as: "badge",
                        attributes: ["badge_distinction","badge_url","badge_serial_nb"],
                    }
                ]
            });
            // console.log(userBadgeQuery);
            let unlockedBadges = [];
            userBadgeQuery.forEach(userBadge => {
                unlockedBadges.push(userBadge.badge);
            });
            // console.log(unlockedBadges);

            try{
                const idOfUnlockedBadges = userBadgeQuery.map(userBadge => userBadge.id_badge);
                // console.log(idOfUnlockedBadges);

                const lockedBadges = await Badge.findAll({
                    where : {
                        badge_id_badge : {[Op.notIn] : idOfUnlockedBadges}
                    },
                    attributes : ["badge_distinction","badge_url","badge_serial_nb"]
                });
                // console.log(lockedBadges);

                res.render("myBadges", {
                    userData: req.session.user, 
                    obtainedBadges : unlockedBadges,
                    notObtainedBadges : lockedBadges
                });
            }
            catch(err){
                console.error("Erreur lors de la récupération des badges vérouillés :", err);
                res.status(500).send("Une erreur s'est produite lors de la récupération des badges vérouillés...");
            }
        }
        catch(err){
            console.error("Erreur lors de la récupération de vos badges :", err);
            res.status(500).send("Une erreur s'est produite lors de la récupération de vos badges...");
        }
    }
    else{
        console.error("Chemin d'accès non autorisé pour votre statut.");
        res.status(404).send("Le chemin d'accès utilisé est incorrecte... Vous n'avez pas le statut adéquat pour accéder à cette page.");
    }
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