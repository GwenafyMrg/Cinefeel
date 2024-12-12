//-----------------------------------Importation des modules node:---------------------------------------//
const {Sequelize, DataTypes} = require('sequelize');

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

//-----------------------------------Créations des modèles de BDD: -------------------------------//

const Movie = sequelize.define("movie", {
    movie_id_movie : {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement : true
    },
    movie_title: {
        type: DataTypes.STRING,
        allowNull: false
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
        tableName: 'movie',  
        timestamps: false,    // Utilise les champs `createdAt` et `updatedAt`.
});

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

const movieGenre = sequelize.define("movieGenre", {
    id_movie: {
        type: DataTypes.INTEGER,
        references : {              //Définir une clé étrangère, à qui fait elle référence ?
            model: Movie,           //id_movie de movieGenre fait référence au modèle Movie.
            key: "movie_id_movie"   //id_movie de movieGenre fait référence au champ id_movie du modèle Movie.
        }
    },
    id_genre: {
        type: DataTypes.INTEGER,
        references: {
            model: Genre,
            key: "genre_id_genre"
        }
    }
}, {
    tableName: "movieGenre",
    timestamps: false
});

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

const movieDir = sequelize.define("movieDir", {
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
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: 0
    }},
    {
        tableName: "user",
        timestamps: false
    }
);

const UserOpinion = sequelize.define("userOpinion", {
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

//-------------------------------Jointure entre les modèles de BDD : -------------------------------//

//<model>.belongsToMany(<model_à_joindre>, {
    // through: <model_pivot>, 
    // foreignKey: <model_pivot_fk1>, 
    // otherKey: <model_pivot_fk2>, 
    // as: <nom_model_à_joindre>
// });

//Lié la table Movie avec la table Genre.
Movie.belongsToMany(Genre, {
    through: movieGenre, 
    foreignKey: 'id_movie', 
    otherKey: "id_genre", 
    as: "Genres"
});

//Lié la table Movie avec la table Director.
Movie.belongsToMany(Director, {
    through: movieDir, 
    foreignKey: 'id_movie', 
    otherKey: 'id_director',
    as: 'Directors'
});

//Lié la table Movie avec la table User.
Movie.belongsToMany(User, {
    through: UserOpinion,
    foreignKey: "id_user",
    otherKey: "id_movie",
    as: "Users"
})


sequelize.sync({force: false})
    .then(() => {
        console.log("Synchronisée.");
    })
    .catch((err) => {
        console.error("Erreur : ", err);
});

module.exports = {
    sequelize,
    Movie,
    Genre,
    Director,
    User,
};