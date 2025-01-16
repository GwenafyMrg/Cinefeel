//-----------------------------------Importations des modules node:---------------------------------------//

//Modules généraux
const express = require('express');                         //Module express
const {engine} = require('express-handlebars');             //Gestion d'express et handlebars
const {Op} = require('sequelize');                          //Gestion des clauses de requête SQL
const bodyParser = require('body-parser');                  //Gestion des entrées de formulaire HTML
const path = require('path');                               //Gestion correcte de chemins d'accès
const session = require('express-session');                 //Gestion de sessions utilisateurs

//Modules de sécurité.
const sanitizeHtml = require('sanitize-html');              //Protéger contre les Injection SQL
const bcrypt = require('bcrypt');                           //Hacher les mots de passe  

//Import de module locaux.
const {Movie, Director, Genre, User} = require('./models'); //Importation des modèles de BDD
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
        if(req.session.user){
            res.render("home", {userData : req.session.user, movies : query});
        }
        else{
            res.render("home", {movies : query});   //Retourner le template home.handlebars avec la donnée movies.
        }
    } catch (err){
        console.error("Erreur lors de l'affichage des donneés.");
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
                genre.selected = false;
            }
        });

        if(req.session.user){
            res.render("filter", {
                userData : req.session.user, 
                genresList : genresList,
                currentFilters : null,
            });
        }
        else{
            res.render("filter", { 
                genresList : genresList,
                currentFilters : null,
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

        // Rendu de la vue avec les résultats
        const genresList = await Genre.findAll(); // Liste des genres pour le formulaire

        // Marquer les genres sélectionnés dans genresList
        genresList.forEach(genre => {
            // Vérifie si ce genre est dans les genres sélectionnés
            genre.selected = savedFilters.genreArray && savedFilters.genreArray.includes(genre.genre_libelle);
        });
        // console.log(genresList);

        if (req.session.user) {
            // res.render("filter", {userData : req.session.user, filteredMovies : queryFilter});
            res.render("filter", {
                userData: req.session.user, 
                genresList,
                filteredMovies: queryFilter,
                currentFilters : savedFilters,
            });
        } else {
            // res.render("filter", {filteredMovies : queryFilter});
            res.render("filter", {
                genresList, 
                filteredMovies: queryFilter,
                currentFilters : savedFilters,
            });
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
        console.log(query);
        if(req.session.user){
            res.render("search", {userData : req.session.user, result : query, research : value});
        }
        else{
            res.render("search", {result : query, research : value});
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
                            username: authenticateUser.user_username,
                            email: authenticateUser.user_email,
                            admin: authenticateUser.user_admin,
                        }
                        console.log(req.session.user);
                        console.log("Connecté avec succès !");
                    } else {// Le mot de passe transmis ne corresponds pas.
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
        if(req.session.user){
            res.render("home", {userData : req.session.user});
        }
        else{
            res.render("home");
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
            usernameInputCA = usernameInputCA.trim();                     //Supprimer les espaces de trop.
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
            // res.send(msgError);
        }
        else{//Sinon
            if(req.session.user){
                res.render("login", {userData : req.session.user});
            }
            else{
                res.render("login"); //Redirection vers la page de connexion.
            }
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