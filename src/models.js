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
        type: DataTypes.STRING, 
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

const UserOpinion = sequelize.define("userOpinion", {   //Définit le modèle userOpinion.
    id_user : {
        type: DataTypes.INTEGER,
        references : {
            model: "user",
            key: "user_id_user"
        }
    },
    id_movie : {
        type: DataTypes.INTEGER,
        references : {
            model : "movie",
            key : "movie_id_movie"
        }
    },
    note : {
        type: DataTypes.DOUBLE,
        allowNull: false
    },
    comment : {
        type: DataTypes.STRING,
        allowNull: true
    },
    fav : {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0
    }},
    {
        tableName: "userOpinion",
        timestamps: true
    }
);

//------------------------------- Jointure entre les modèles de BDD : -------------------------------//

//<model>.belongsToMany(<model_à_joindre>, {
    // through: <model_pivot>, 
    // foreignKey: <model_pivot_fk1>, 
    // otherKey: <model_pivot_fk2>, 
    // as: <nom_model_à_joindre>
// });

//Création d'une relation plusieurs à plusieurs entre les films et les genres.
Movie.belongsToMany(Genre, {
    through: movieGenre,        //Quel modèle/table fait la jonction entre les deux ?
    foreignKey: 'id_movie',     //Qui est la clé étrangère relié à Movie ?
    otherKey: "id_genre",       //Qui est la clé étrangère relié à Genre ?
    as: "Genres"                //Renommer le modèle.
});

//Création d'une relation plusieurs à plusieurs entre les films et les réalisateurs.
Movie.belongsToMany(Director, {
    through: movieDir, 
    foreignKey: 'id_movie', 
    otherKey: 'id_director',
    as: 'Directors'
});

//Création d'une relation plusieurs à plusieurs entre les films et les utilisateurs..
Movie.belongsToMany(User, {
    through: UserOpinion,       //Utilisationde du modèle userOpinion pour associer des avis à des films.
    foreignKey: "id_user",
    otherKey: "id_movie",
    as: "Users"
})

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
};