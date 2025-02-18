//-----------------------------------Importations des modules node:---------------------------------------//

const {Sequelize, DataTypes} = require('sequelize');    //Gestion de la BDD.

//-----------------------------------Définition du serveur BDD (mariaDB) :-------------------------------//

const sequelize = new Sequelize('cinefeel','test','test', { //Définition des paramètres de connexion.
    dialect: 'mysql',
    host : 'localhost',

    //Afficher les logs (requête test/par défaut).
    logging: false
});

sequelize.authenticate()    //Tentative de connexion avec le BDD.
    .then(() => {
        console.log("La connexion avec la BDD est établie !");
    })
    .catch(() => {
        console.error("La connexion a échouée...");
});

//-----------------------------------Créations des modèles de BDD: -------------------------------//

const Movie = sequelize.define("movie", {   //Définit le modèle Movie
    movie_id_movie : {              //Nom du champ.
        type: DataTypes.INTEGER,    //Type de donnée du champ.
        primaryKey: true,           //Est-il une clé primaire ?
        autoIncrement : true        //Est-il auto-incrémenté ?
    },
    movie_title: {                  
        type: DataTypes.STRING,     //STRING limite la taille par défaut à 255.
        allowNull: false            //Peut-il être de type null ?
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
        type: DataTypes.DOUBLE,
        allowNull: false
    }
}, {
        tableName: 'movie',     //Nom de la table dans la BDD.
        timestamps: false,      //Utiliser les champs `createdAt` et `updatedAt` ?
});

const Genre = sequelize.define("genre", {   //Définit la modèle Genre.
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

const MovieGenre = sequelize.define("MovieGenre", { //Définit le modèle MovieGenre
    id_movie: {
        type: DataTypes.INTEGER,
        references : {              //Définir une clé étrangère :
            model: Movie,           //Quel modèle fait-on référence ?
            key: "movie_id_movie"   //Quel champ est une clé étrangère pour ce modèle ?
        }
    },
    id_genre: {
        type: DataTypes.INTEGER,
        references: {               //Définit la clé étrangère :
            model: Genre,           //Définir une clé étrangère pour relier MovieGenre à Genre.
            key: "genre_id_genre"   //Définir le champ genre_id_genre comme clé étrangère de MovieGenre.
        }
    }
}, {
    tableName: "MovieGenre",
    timestamps: false
});

const Director = sequelize.define("director", { //Définit le modèle Director.
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

const MovieDir = sequelize.define("MovieDir", { //Définit le modèle MovieDir.
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

const User = sequelize.define("user", { //Définit le modèle User.
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
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0
    }},
    {
        tableName: "user",
        timestamps: false
    }
);

const UserOpinion = sequelize.define("userOpinion", {   //Définit le modèle UserOpinion.
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
        type: DataTypes.STRING(500),       
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

const Vote = sequelize.define("vote", {     //Définit le modèle Vote
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

const Emotion = sequelize.define("emotion", {   //Définit le modèle Emotion
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

const UserBadge = sequelize.define("userBadge", {   //Définit le modèle userBadge
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

const Badge = sequelize.define("badge", {   //Définit le modèle Badge
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

//------------------------------- Jointure entre les modèles de BDD : -------------------------------//

//<model>.belongsToMany(<model_à_joindre>, {
    // through: <model_pivot>, 
    // foreignKey: <model_pivot_fk1_model>, 
    // otherKey: <model_pivot_fk2_model_à_joindre>, 
    // as: <nom_association>
// });

//>>>>>>>>>>>>>>>>>>
//ASSOCIATION A EXPLIQUER ET A TRIEE :
    // Un utilisateur peut avoir plusieurs badges
    //...
    //Pour chaque association.
//>>>>>>>>>>>>>>>>>>

//-----------Les relations plusieurs à plusieurs (à table intermédiaire)--------//

//Création d'une relation plusieurs à plusieurs entre les films et les réalisateurs.
Movie.belongsToMany(Director, {
    through: MovieDir,          //Quel modèle/table fait la jonction entre les deux ?
    foreignKey: 'id_movie',     //Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    otherKey: 'id_director',    //Quelle est la clé étrangère de la table de jonction qui relie Director ?
    as: 'Directors'             //Donner un alias à l'association.
});

Director.belongsToMany(Movie, {
    through: MovieDir,          
    foreignKey: 'id_director',  
    otherKey: 'id_movie',       
    as: 'Movies'             
});

//Création d'une relation plusieurs à plusieurs entre les films et les genres.
Movie.belongsToMany(Genre, {
    through: MovieGenre,        //Quel modèle/table fait la jonction entre les deux ?
    foreignKey: 'id_movie',     //Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    otherKey: "id_genre",       //Quelle est la clé étrangère de la table de jonction qui relie Genre ?
    as: "Genres"                //Donner un alias à l'association.
});

Genre.belongsToMany(Movie, {
    through: MovieGenre,        
    foreignKey: 'id_genre',     //Quelle est la clé étrangère de la table de jonction qui relie Genre ?
    otherKey: "id_movie",       //Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    as: "Movies"                
});

//Création d'une relation plusieurs à plusieurs entre les films et les utilisateurs.
Movie.belongsToMany(User, {
    through: UserOpinion,           //Utilisation du modèle userOpinion pour associer des avis à des films.
    foreignKey: "opinion_id_movie", //Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    otherKey: "opinion_id_user",    //Quelle est la clé étrangère de la table de jonction qui relie User ?
    as: "Users"
});

User.belongsToMany(Movie, {
    through: UserOpinion,           //Utilisation du modèle userOpinion pour associer des avis à des films.
    foreignKey: "opinion_id_user",  //Quelle est la clé étrangère de la table de jonction qui relie User ?
    otherKey: "opinion_id_movie",   //Quelle est la clé étrangère de la table de jonction qui relie Movie ?
    as: "Movies"
});

//Création d'une relation plusieurs à plusieurs entre les utilisateurs et les émotions.
User.belongsToMany(Emotion, {
    through: Vote,               //Utilisation du modèle Vote pour relier un vote utilisateur et une émotion.
    foreignKey: "id_user",
    otherKey: "id_emotion",
    as: "Emotions"
});

User.belongsToMany(Emotion, {
    through: Vote,               //Utilisation du modèle Vote pour relier des votes utilisateur et des émotions.
    foreignKey: "id_user",
    otherKey: "id_emotion",
    as: "Users"
});

//Création d'une relation plusieurs à plusieurs entre les utilisateurs et les badges.
// Un utilisateur peut avoir plusieurs badges
User.belongsToMany(Badge, {
    through: UserBadge,         //Utilisation du modèle UserBadge pour relier des utilisateurs à des badges.
    foreignKey: "id_user",
    otherKey: "id_badge",
    as: "Badges"
});

// Un badge peut appartenir à plusieurs utilisateurs
Badge.belongsToMany(User, {
    through: UserBadge,         //Utilisation du modèle UserBadge pour relier des badges à des utilisateurs.
    foreignKey: "id_badge",
    otherKey: "id_user",
    as: "Users"
});


//Nouvelle section ajouté à la suite de problème de jointure entre User et UserOpinion 
//Relation à retirer éventuellement ???

//-----------Les relations individuels / Sans tablot pivot (sans table intermédiaire)--------//
//Relier par une clé étrangère stocké dans l'une des 2 relations (pas de table pivot)

// <Model1>.hasMany(<Model2>, {
//     foreignKey: <Model2_fk>,  
//     as: <nom_association>,                 
// }); 

// <Model2>.belongsTo(<Model1>, {
//     foreignKey: <Model2_fk>, 
//     as: <nom_association>,                     
// }); 

//-----Pour les avis-----//
// Un utilisateur peut avoir plusieurs opinions
User.hasMany(UserOpinion, {
    foreignKey: "opinion_id_user",  // Clé étrangère dans UserOpinion pointant vers User
    as: "Opinions",                 // Alias pour accéder aux opinions depuis un utilisateur
});

// Une opinion appartient à un utilisateur
UserOpinion.belongsTo(User, {
    foreignKey: "opinion_id_user",  // clé étrangère dans UserOpinion pointant vers User
    as: "User",                     // alias pour accéder à l'utilisateur depuis une opinion
});

//...
Movie.hasMany(UserOpinion, {
    foreignKey: "opinion_id_movie",
    as: "Opinions"
});

//...
UserOpinion.belongsTo(Movie, {
    foreignKey: "opinion_id_movie",
    as: "Movie"
});

//-----Pour les votes-----//
//Un utilisateur a plusieurs votes
User.hasMany(Vote, {
    foreignKey: "id_user", 
    as: "Votes", 
});

//Un vote appartient à un utilisateur
Vote.belongsTo(User, {
    foreignKey: "id_user",
    as: "User",
});

//Une emotion a plusieurs votes associés
Emotion.hasMany(Vote, {
    foreignKey: "id_emotion", 
    as : "Votes"
});

//Un vote appartient à une émotion (mais on peut réaliser plusieurs votes dans le même avis)
Vote.belongsTo(Emotion, {
    foreignKey: "id_emotion",
    as: "Emotion",
});

//-----Pour les badges-----//
// Associer UserBadge à User pour inclure directement les informations de l'utilisateur
//...   (pas encore utilisé)
User.hasMany(UserBadge, {
    foreignKey: "id_user",
    as: "ObtainedBadges"
});

//...
UserBadge.belongsTo(User, {
    foreignKey: "id_user",
    as: "User"
});

//Pour les badges pas obtenus.
Badge.hasMany(UserBadge, {
    foreignKey : "id_badge",
    as : "ObtentionsBadge"
});

//...
UserBadge.belongsTo(Badge, {
    foreignKey: "id_badge",
    as: "Badge"
});

//------------------------------- Synchronisation entre les modèles et la BDD :-------------------------------//

sequelize.sync({force: false})              //Tentative de synchronisation.
    .then(() => {                           //Cas de réussite.
        console.log("Synchronisée.");
    })
    .catch((err) => {                       //Cas d'échec.
        console.error("Erreur : ", err);
});

//Exportation des modèles utilisés dans la BDD :
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