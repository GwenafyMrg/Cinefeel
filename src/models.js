//-----------------------------------Importation des modules node:---------------------------------------//

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

const movieGenre = sequelize.define("movieGenre", { //Définit le modèle movieGenre
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
            model: Genre,           //Définir une clé étrangère pour relier movieGenre à Genre.
            key: "genre_id_genre"   //Définir le champ genre_id_genre comme clé étrangère de movieGenre.
        }
    }
}, {
    tableName: "movieGenre",
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

const movieDir = sequelize.define("movieDir", { //Définit le modèle movieDir.
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
    tableName: "movieDir",
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
        timestamps: false           //Voir basculer à true pour plus d'info sur l'obtention des badges.
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
    }},
    {
        tableName: "badge",
        timestamps: false
});

//------------------------------- Jointure entre les modèles de BDD : -------------------------------//

//<model>.belongsToMany(<model_à_joindre>, {
    // through: <model_pivot>, 
    // foreignKey: <model_pivot_fk1>, 
    // otherKey: <model_pivot_fk2>, 
    // as: <nom_model_à_joindre>
// });

//Création d'une relation plusieurs à plusieurs entre les films et les réalisateurs.
Movie.belongsToMany(Director, {
    through: movieDir,          //Quel modèle/table fait la jonction entre les deux ?
    foreignKey: 'id_movie',     //Qui est la clé étrangère relié à Movie ?
    otherKey: 'id_director',    //Qui est la clé étrangère relié à Genre ?
    as: 'Directors'             //Renommer le modèle.
});

//Création d'une relation plusieurs à plusieurs entre les films et les utilisateurs.
Movie.belongsToMany(User, {
    through: UserOpinion,       //Utilisation du modèle userOpinion pour associer des avis à des films.
    foreignKey: "opinion_id_user",
    otherKey: "opinion_id_movie",
    as: "Users"
});

//Création d'une relation plusieurs à plusieurs entre les films et les genres.
Movie.belongsToMany(Genre, {
    through: movieGenre,        //Quel modèle/table fait la jonction entre les deux ?
    foreignKey: 'id_movie',     //Qui est la clé étrangère relié à Movie ?
    otherKey: "id_genre",       //Qui est la clé étrangère relié à Genre ?
    as: "Genres"                //Renommer le modèle.
});

//Création d'une relation plusieurs à plusieurs entre les utilisateurs et les émotions.
User.belongsToMany(Emotion, {
    through: Vote,               //Utilisation du modèle Vote pour relier un vote utilisateur et une émotion.
    foreignKey: "id_user",
    otherKey: "id_emotion",
    as: "Emotions"
});

//Création d'une relation plusieurs à plusieurs entre les utilisateurs et les films.
User.belongsToMany(Movie, {
    through: UserOpinion,        //Utilisation du modèle userOpinion pour associer des avis à des films.
    foreignKey: "opinion_id_user",
    otherKey: "opinion_id_movie",
    as: "Movies"
});

//Création d'une relation plusieurs à plusieurs entre les utilisateurs et les films.
User.belongsToMany(Badge, {
    through: UserBadge,
    foreignKey: "id_user",
    otherKey: "id_badge",
    as: "Badges"
});

//Nouvelle section ajouté à la suite de problème de jointure entre User et UserOpinion 
//Relation à retirer éventuellement ???

// Un utilisateur peut avoir plusieurs opinions
User.hasMany(UserOpinion, {
    foreignKey: "opinion_id_user", // clé étrangère dans UserOpinion pointant vers User
    as: "Opinions", // alias pour accéder aux opinions depuis un utilisateur
});

// Une opinion appartient à un utilisateur
UserOpinion.belongsTo(User, {
    foreignKey: "opinion_id_user", // clé étrangère dans UserOpinion pointant vers User
    as: "User", // alias pour accéder à l'utilisateur depuis une opinion
});

//-----------------Pour les votes :----------------------
//Un utilisateur a plusieurs votes
User.hasMany(Vote, {
    foreignKey: "id_user", 
    as: "Vote", 
});

//Un vote appartient à un utilisateur
Vote.belongsTo(User, {
    foreignKey: "id_user",
    as: "User",
});

//Une emotion a plusieurs votes associés
Emotion.hasMany(Vote, {
    foreignKey: "id_emotion", 
});

//Un vote appartient à une émotion
Vote.belongsTo(Emotion, {
    foreignKey: "id_emotion",
    as: "Emotion",
});

//----------------Pour les films des utilisateurs :
//Code à expliquer >>>>>>>

UserOpinion.belongsTo(Movie, {
    foreignKey: "opinion_id_movie",
    as: "Movie"
});

Movie.hasMany(UserOpinion, {
    foreignKey: "opinion_id_movie",
    as: "UserOpinions"
});


//------------------------------- Synchronisation entre les modèles et la BDD :-------------------------------//

sequelize.sync({force: false})              //Tentative de synchrinisation.
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
    User,
    UserOpinion,
    Vote,
    Emotion,
    Badge,
};