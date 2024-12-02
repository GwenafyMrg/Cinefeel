//-----------------------------------Importation des modules node:---------------------------------------//

const express = require('express');
const {engine} = require('express-handlebars');
const {Sequelize, DataTypes} = require('sequelize');

const path = require('path');

const funct = require('./functions');

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
    id_movie : {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement : true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    poster_url: {
        type: DataTypes.STRING,
        allowNull: true
    },
    runtime: {
        type: DataTypes.SMALLINT,
        allowNull: false
    },
    released_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    avg_note: {
        type: DataTypes.DOUBLE,
        allowNull: false
    }
}, {
        tableName: 'movie',  
        timestamps: false,    // Utilise les champs `createdAt` et `updatedAt`.
});

const Genre = sequelize.define("genre", {
    id_genre : {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    libelle : {
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
            key: "id_movie"         //id_movie de movieGenre fait référence au champ id_movie du modèle Movie.
        }
    },
    id_genre: {
        type: DataTypes.INTEGER,
        references: {
            model: Genre,
            key: "id_genre"
        }
    }
}, {
    tableName: "movieGenre",
    timestamps: false
});

const Director = sequelize.define("director", {
    id_director: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Fname: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nationality: {
        type: DataTypes.STRING,
        allowNull: true
    },
    birth_date: {
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
            through: 'id_movie'
        }
    },
    id_director : {
        type: DataTypes.INTEGER,
        references: {
            model: Director,
            through: 'id_director'
        }
    }
}, {
    tableName: "movieDir",
    timestamps: false
});

//Jointure entre les modéles de BDD :
//<model>.belongsToMany(<model_à_joindre>, {through: <model_pivot>, foreignKey: <model_pivot_pk>, otherKey: <model_à_joindre_pk>, options: <>})
Movie.belongsToMany(Genre, {through: movieGenre, foreignKey: 'id_movie', otherKey: "id_genre", as: "Genres"});
Movie.belongsToMany(Director, {through: movieDir, foreignKey: 'id_movie', otherKey: 'id_director', as: 'Directors'})

sequelize.sync({force: false})
    .then(() => {
        console.log("Synchronisée.");
    })
    .catch((err) => {
        console.error("Erreur : ", err);
});

//-----------------------------------Définitionn de l'application Web :-------------------------------//

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
        convertDateFormat: funct.convertDateFormat
    }
}));

app.set("view engine", "handlebars");
app.set("views", "./views");

app.use(express.static(path.join(__dirname, "assets")));

//Définiton des routes :
app.get("/", async (req, res) => {
    try {
        query = await Movie.findAll({
            include: [{
                model: Genre,               //Modéle/Table à inclure.
                as: "Genres",               //Modifier le nom de l'attribut dans dataValues.
                attributes: ['libelle'],    //Champs du Modèle/Table à inclure.
                through: { attributes: []}  //Exclure les informations de la table pivot (movieGenre).
            },
            {
                model: Director, 
                as: 'Directors',
                attributes: ['name','Fname'],
                through: { attributes: []}
            }]
        });
        console.log(query);
        res.render("home", {movies : query});
    } catch (err){
        console.error("Erreur lors de l'affichage des donneés.");
        res.status(500).send("Erreur lors de l'affichage des données.");
    }
});

app.get("/moviesList", (req, res) => {
    res.render("filter");
});

app.get("/search", (req, res) => {
    res.render("search");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/create-account", (req, res) => {
    res.render("createAccount");
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
})