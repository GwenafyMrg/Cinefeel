//---------- Importations des modules node : ----------//

const {Sequelize, DataTypes} = require('sequelize');    // Gestion de la BDD.

//---------- Définition du serveur Base De Données (mariaDB) : ----------//

const sequelize = new Sequelize('cinefeel','test','test', { // Définir les paramètres de connexion.
    dialect: 'mysql',
    host : 'localhost',
    logging: false      // Afficher les logs.
});

sequelize.authenticate()    // Tenter de se connecter à la BDD.
    .then(() => {   // En cas de réussite :
        console.log("La connexion avec la BDD est établie !");
    })
    .catch(() => {  // En cas d'échec :
        console.error("La connexion a échouée...");
});

//---------- Créations des modèles de BDD : ----------//

//----- Définition du modèle Movie : -----//
const Movie = sequelize.define("movie", {
    movie_id_movie : {              // Nom du champ.
        type: DataTypes.INTEGER,    // Type de donnée du champ.
        primaryKey: true,           // Est-il une clé primaire ?
        autoIncrement : true        // Est-il auto-incrémenté ?
    },
    movie_title: {                  
        type: DataTypes.STRING,     // Le type STRING limite la taille par défaut à 255 caractères.
        allowNull: false            // Peut-il être de type null ?
    },
    movie_poster_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    movie_runtime: {
        type: DataTypes.SMALLINT,
        allowNull: false
    },
    movie_released_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    movie_avg_note: {
        type: DataTypes.DOUBLE, // Le type DOUBLE permet les nombres à virgules.
        allowNull: false
    }
}, {
        tableName: 'movie',     // Nom de la table dans la BDD.
        timestamps: false,      // Faut-il utiliser les champs `createdAt` et `updatedAt` ?
});

//----- Définition du modèle Genre : -----//
const Genre = sequelize.define("genre", {
    genre_id_genre : {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    genre_libelle : {
        type: DataTypes.STRING,
        allowNull : false
    }
},  {
        tableName: "genre",
        timestamps: false
});

//----- Définition du modèle MovieGenre : -----//
const MovieGenre = sequelize.define("MovieGenre", {
    id_movie: {
        type: DataTypes.INTEGER,
        references : {              // Définir une clé étrangère :
            model: Movie,           // A quel modèle fait-on référence ?
            key: "movie_id_movie"   // Quel champ est une clé étrangère pour ce modèle ?
        }
    },
    id_genre: {
        type: DataTypes.INTEGER,
        references: {               // Définir la clé étrangère :
            model: Genre,           // Définir une clé étrangère pour faire référence à Genre depuis MovieGenre.
            key: "genre_id_genre"   // Définir le champ genre_id_genre comme clé étrangère de MovieGenre.
        }
    }
}, {
    tableName: "MovieGenre",
    timestamps: false
});

//----- Définition du modèle Director : -----//
const Director = sequelize.define("director", {
    director_id_director: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    director_lastname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    director_firstname: {
        type: DataTypes.STRING,
        allowNull: true
    },
    director_nationality: {
        type: DataTypes.STRING,
        allowNull: true
    },
    director_birth_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: "director",
    timestamps: false
});

//----- Définition du modèle MovieDir : -----//
const MovieDir = sequelize.define("MovieDir", {
    id_movie : {
        type: DataTypes.INTEGER,
        references: {
            model: Movie,
            key: 'movie_id_movie'
        }
    },
    id_director : {
        type: DataTypes.INTEGER,
        references: {
            model: Director,
            key: 'director_id_director'
        }
    }
}, {
    tableName: "MovieDir",
    timestamps: false
});

//----- Définition du modèle User : -----//
const User = sequelize.define("user", {
    user_id_user : {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_username : {
        type: DataTypes.STRING,
        allowNull: false,
    },
    user_email : {
        type: DataTypes.STRING,
        allowNull: false
    },
    user_mdp : {
        type: DataTypes.STRING,
        allowNull:false
    },
    user_admin : {
        type: DataTypes.BOOLEAN,    // Le type BOOLEAN contient soit la valeur "true" soit la valeur "false".
        allowNull: true,
        defaultValue: 0
    }},
    {
        tableName: "user",
        timestamps: false
    }
);

//----- Définition du modèle UserOpinion : -----//
const UserOpinion = sequelize.define("userOpinion", { 
    opinion_id_user : {
        type: DataTypes.INTEGER,
        references : {
            model: "user",
            key: "user_id_user"
        }
    },
    opinion_id_movie : {
        type: DataTypes.INTEGER,
        references : {
            model : "movie",
            key : "movie_id_movie"
        }
    },
    opinion_note : {
        type: DataTypes.DOUBLE,
        allowNull: false
    },
    opinion_comment : {
        type: DataTypes.TEXT,  
        allowNull: true
    },
    opinion_fav : {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0
    }},
    {
        tableName: "userOpinion",
        timestamps: false
    }
);

//----- Définition du modèle Vote : -----//
const Vote = sequelize.define("vote", {
    id_user : {
        type : DataTypes.INTEGER,
        references : {
            model: "user",
            key: "user_id_user"
        }
    },
    id_movie : {
        type : DataTypes.INTEGER,
        references : {
            model : "movie",
            key : "movie_id_movie"
        }
    },
    id_emotion : {
        type : DataTypes.INTEGER,
        references : {
            model : "emotion",
            key: "emotion_id_emotion"
        }
    }},
    {
        tableName: "vote",
        timestamps : false
});

//----- Définition du modèle Emotion : -----//
const Emotion = sequelize.define("emotion", {
    emotion_id_emotion : {
        type : DataTypes.INTEGER,
        primaryKey : true,
        autoIncrement: true
    },
    emotion_name : {
        type : DataTypes.STRING,
        allowNull : false
    }}, {
        tableName : "emotion",
        timestamps : false
});

//----- Définition du modèle UserBadge : -----//
const UserBadge = sequelize.define("userBadge", {
    id_user : {
        type: DataTypes.INTEGER,
        references: {
            model: "user",
            key: "user_id_user"
        }
    },
    id_badge : {
        type: DataTypes.INTEGER,
        references : {
            model: "badge",
            key: "badge_id_badge"
        }
    }},
    {
        tableName: "userBadge",
        timestamps: false,           //Voir basculer à true pour plus d'info sur l'obtention des badges.
});

//----- Définition du modèle Badge : -----//
const Badge = sequelize.define("badge", {
    badge_id_badge : {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    badge_distinction : {
        type: DataTypes.STRING,
        allowNull: false
    },
    badge_url : {
        type: DataTypes.STRING,
        allowNull: false
    },
    badge_serial_nb : {
        type: DataTypes.TINYINT,
        allowNull: true
    },
    badge_type :{
        type: DataTypes.STRING,
        allowNull : false
    },
    badge_value :{
        type : DataTypes.STRING,
        allowNull: false
    }},
    {
        tableName: "badge",
        timestamps: false
});

//----- Jointures entre les modèles de BDD : -----//

//>>>>>>>>>>>>>>>>>>
//ASSOCIATION A EXPLIQUER ET A TRIEE :
    // Un utilisateur peut avoir plusieurs badges
    //...
    //Pour chaque association.
//>>>>>>>>>>>>>>>>>>

//----- Les relations plusieurs à plusieurs (avec une table intermédiaire) : -----//

// Création d'une relation plusieurs à plusieurs entre les films et les réalisateurs :
// Un film peut avoir plusieurs réalisateurs.
Movie.belongsToMany(Director, {
    through: MovieDir,          // Quel modèle/table fait la jonction entre les deux ?
    foreignKey: 'id_movie',     // Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    otherKey: 'id_director',    // Quelle est la clé étrangère de la table de jonction qui relie Director ?
    as: 'Directors'             // Donner un alias à l'association.
});

// Un réalisateur peut réaliser plusieurs films.
Director.belongsToMany(Movie, {
    through: MovieDir,          
    foreignKey: 'id_director',  
    otherKey: 'id_movie',       
    as: 'Movies'             
});

// Création d'une relation plusieurs à plusieurs entre les films et les genres :
// Un film peut être associé à plusieurs genres.
Movie.belongsToMany(Genre, {
    through: MovieGenre,        // Quel modèle/table fait la jonction entre les deux ?
    foreignKey: 'id_movie',     // Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    otherKey: "id_genre",       // Quelle est la clé étrangère de la table de jonction qui relie Genre ?
    as: "Genres"                // Donner un alias à l'association.
});

// Un Genre peut être associé à plusieurs films.
Genre.belongsToMany(Movie, {
    through: MovieGenre,        
    foreignKey: 'id_genre',     // Quelle est la clé étrangère de la table de jonction qui relie Genre ?
    otherKey: "id_movie",       // Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    as: "Movies"                
});

// Création d'une relation plusieurs à plusieurs entre les films et les utilisateurs :
// Un film peut être vu par plusieurs utilisateurs.
Movie.belongsToMany(User, {
    through: UserOpinion,           // Utiliser le modèle userOpinion pour associer des avis à des films.
    foreignKey: "opinion_id_movie", // Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    otherKey: "opinion_id_user",    // Quelle est la clé étrangère de la table de jonction qui relie User ?
    as: "Users"
});

// Un utilisateur peut voir plusieurs films.
User.belongsToMany(Movie, {
    through: UserOpinion,           // Utiliser le modèle userOpinion pour associer des avis à des films.
    foreignKey: "opinion_id_user",  // Quelle est la clé étrangère de la table de jonction qui relie User ?
    otherKey: "opinion_id_movie",   // Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    as: "Movies"
});

// Création d'une relation plusieurs à plusieurs entre les utilisateurs et les émotions :
// Un utilisateur peut ressentir plusieurs émotions.
User.belongsToMany(Emotion, {
    through: Vote,               // Utiliser le modèle Vote pour relier un vote utilisateur et une émotion.
    foreignKey: "id_user",
    otherKey: "id_emotion",
    as: "Emotions"
});

// Une émotion peut être ressenti par plusieurs utilisateurs.
Emotion.belongsToMany(User, {
    through: Vote,               // Utiliser le modèle Vote pour relier des votes utilisateur et des émotions.
    foreignKey: "id_emotion",
    otherKey: "id_user",
    as: "Users"
});

// Création d'une relation plusieurs à plusieurs entre les utilisateurs et les badges :
// Un utilisateur peut avoir plusieurs badges.
User.belongsToMany(Badge, {
    through: UserBadge,         // Utiliser le modèle UserBadge pour relier des utilisateurs à des badges.
    foreignKey: "id_user",
    otherKey: "id_badge",
    as: "Badges"
});

// Un badge peut appartenir à plusieurs utilisateurs.
Badge.belongsToMany(User, {
    through: UserBadge,         // Utiliser le modèle UserBadge pour relier des badges à des utilisateurs.
    foreignKey: "id_badge",
    otherKey: "id_user",
    as: "Users"
});

//----- Les relations individuels / Sans tablot pivot (sans table intermédiaire) -----//
// C'est-à-dire des relations par une clé étrangère stockée directement dans l'une des 2 relations (pas de table pivot donc).

//----- Pour les avis : -----//
// Un utilisateur peut avoir plusieurs opinions.
User.hasMany(UserOpinion, {
    foreignKey: "opinion_id_user",  // Clé étrangère dans UserOpinion pointant vers User.
    as: "Opinions",                 // Alias pour accéder aux opinions depuis un utilisateur.
});

// Une opinion appartient à un utilisateur.
UserOpinion.belongsTo(User, {
    foreignKey: "opinion_id_user",  // Clé étrangère dans UserOpinion pointant vers User.
    as: "User",                     // Alias pour accéder à l'utilisateur depuis une opinion.
});

// Un film a 0 ou plusieurs avis.
Movie.hasMany(UserOpinion, {
    foreignKey: "opinion_id_movie",
    as: "Opinions"
});

// Un avis est donné à un film.
UserOpinion.belongsTo(Movie, {
    foreignKey: "opinion_id_movie",
    as: "Movie"
});

//----- Pour les votes : -----//
// Un utilisateur a 0 ou plusieurs votes.
User.hasMany(Vote, {
    foreignKey: "id_user", 
    as: "Votes", 
});

// Un vote appartient à un utilisateur.
Vote.belongsTo(User, {
    foreignKey: "id_user",
    as: "User",
});

// Une emotion a 0 ou plusieurs votes associés.
Emotion.hasMany(Vote, {
    foreignKey: "id_emotion", 
    as : "Votes"
});

// Un vote appartient à une émotion (mais on peut réaliser plusieurs votes dans le même avis).
Vote.belongsTo(Emotion, {
    foreignKey: "id_emotion",
    as: "Emotion",
});

//----- Pour les badges : -----//
// Associer UserBadge à User pour inclure directement les informations de l'utilisateur.
// Un utilisateur a obtenu 0 ou plusieurs badges. (pas encore utilisé)
User.hasMany(UserBadge, {
    foreignKey: "id_user",
    as: "ObtainedBadges"
});

// Un badge obtenu est lié à un utilisateur.
UserBadge.belongsTo(User, {
    foreignKey: "id_user",
    as: "User"
});

// Un badge peut être sujet à plusieurs obtentions différentes.
Badge.hasMany(UserBadge, {
    foreignKey : "id_badge",
    as : "ObtentionsBadge"
});

// Un badge obtenu est lié à un badge.
UserBadge.belongsTo(Badge, {
    foreignKey: "id_badge",
    as: "Badge"
});

//----- Synchronisation entre les modèles et la Base De Données : -----//

sequelize.sync({force: false})              // Tenter de synchronisation.
    .then(() => {                           //En cas de réussite.
        console.log("Synchronisée.");
    })
    .catch((err) => {                       //En cas d'échec.
        console.error("Erreur : ", err);
});

//----- Exportations des modèles utilisés dans la BDD : -----//
module.exports = {
    sequelize,
    Movie,
    Genre,
    Director,
    UserOpinion,
    User,
    Vote,
    Emotion,
    UserBadge,
    Badge,
};