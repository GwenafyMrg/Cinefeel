const sanitizeHtml = require('sanitize-html');                          //Module de sécurité contre les Injection SQL
const {UserOpinion, Vote, Emotion, UserBadge} = require('../models');   //Importations des modèles nécessaires
const {Op} = require('sequelize');                                      //Objet opération pour les Requêtes SQL.

//-------------------------- Fonctions Helpers pour HandleBars (côté client) : ---------------------

function convertDateFormat(date){
    //Convertit le format AAAA-MM-DD au format DD-MM-AAAA.
    // parameters : string
    // return : string

    const [year, mouth, day] = date.split('-');
    return `${day}-${mouth}-${year}`;
}

function convertRuntime(runtime){
    //Convertit un temps en minutes exclusivement à un temps en heures et en minutes.
    //parameters: integer
    //return : string

    hour = 0, min = 0;
    min = runtime%60;
    hour = (runtime - min)/60;
    if(min < 10){
        return `${hour}h0${min}`;
    }
    else{
        return `${hour}h${min}`;
    }
}

function normalizeString(text){
    //Normalise une chaine de caractère, passant ses caractères en minuscules et retirant les accents.

    normalized = text.toLowerCase();    //Passage minuscule
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");   //Suppression des accents.
    return normalized;
}

//--------------------------Fonctions Utilitaires pour l'application Web : (côté serveur) ---------------------

function cleanPassword(pw){
    //Nettoye une chaine de caractère destiné à être un mot de passe haché par la suite.
    
    let safePassword = pw;
    safePassword = safePassword.trim();         //Retirer les espaces inutiles.
    safePassword = sanitizeHtml(safePassword, { //Supprimer les caractères suspects.
        allowedTags: [],
        allowedAttributes: []
    });
    return safePassword;
}

async function getMoviesData (movieObj){
    //Fonction asynchrone permettant de calculer la note moyenne et les émotions les plus votées
    //d'une série de film stockée dans un objet JavaScript.

    //Pour chaque film dans la liste de films transmis : 
    for (const movie of movieObj) {
        //Essayer de calculer la note moyenne pour chaque film :
        try {
            //Récupérer tous les avis du film concerné :
            const reviewsBelongsToMovie = await UserOpinion.findAll({
                where: {
                    opinion_id_movie: { [Op.eq]: movie.movie_id_movie } //Restriction sur l'identifiant du film.
                }
            });
            // console.log("Les Avis du film:", reviewsBelongsToMovie);

            let somme = 0;
            let nbReview = 0;
            for(let review of reviewsBelongsToMovie){   //Pour chaque avis dans la liste d'avis :
                somme += review.opinion_note;           //Additionner la note avec les autres
                nbReview += 1;                          //Augmenter le compteur d'avis de 1
            }

            let avg_note = somme/nbReview;              //Calculer de la moyenne
            if(!avg_note){                          //Si la note est NaN :
                avg_note = 0;                       //Remplacé la valeur NaN par 0
            }
            // console.log("Note moyenne:" ,avg_note);
            movie.movie_avg_note = avg_note;        //Ajouter la valeur à l'objet

        } catch(err){
            console.error("Erreur lors du calcul de la note moyenne :", err);
            movieObj.error = err;       //Retourner l'erreur depuis l'objet.
        }

        // Calculer les émotions les plus votées pour chaque film :
        try{
            //Récupérer tous les votes du film concerné : 
            const votesForMovie = await Vote.findAll({
                where : {
                    id_movie : {[Op.eq] : movie.movie_id_movie}     //Restriction sur l'identifiant du film.
                },
                include : [                                 //Jointure avec le modèle Emotion
                    {
                        model: Emotion,
                        as : "Emotion",
                        attributes : ["emotion_name"],      //Récupérer le nom de l'émotion
                    }
                ]
            });
            // console.log(votesForMovie);
    
            if(votesForMovie.length != 0){  //S'il existe au moins 1 vote
                let votesCount = [];    //Tableau pour stocker les émotions et leur nombre de votes.
        
                votesForMovie.forEach(vote => {     //Pour chaque vote :
                    const emotionName = vote.Emotion.emotion_name;  //Récupérer du nom
        
                    //Récupérer un boolean indiquant si l'émotion existe dans le structure de compte
                    let existingVote = votesCount.find(item => item.name === emotionName);
        
                    if (existingVote) {         //Si l'émotion existe déjà
                        existingVote.count++;   //Incrémenter son nombre de votes
                    } else {                    //Si l'émotion n'existe pas déjà
                        votesCount.push({ name: emotionName, count: 1 });   //Ajouter l'émotion et initialiser le compteur
                    }
                });
                votesCount.sort((a, b) => b.count - a.count);   //Trier les émotions dans l'ordre décroissant du nombre de votes.
                //.sort() --> trie le tableau à l'aide d'une fonction de comparaison
                //pour (a,b) des valeurs de votesCount :
                //Si b.count - a.count > 0 --> b est plus grand que a donc b est placé avant.
                //Si b.count - a.count < 0 --> a est plus grand que b donc a est placé avant.

                // console.log("Votes globales:", votesCount);
        
                //Récupération des 3 premières valeurs (les plus votées)
                upVotes = [votesCount[0].name, votesCount[1].name, votesCount[2].name];
                // console.log(upVotes);

                //Insertion des 3 émotions les plus upVote dans la structure du film concerné toujours.
                movie.popularEmotions = upVotes;

            }
            //S'il n'y a pas de vote, ne rien faire de plus.
        }
        catch(err){
            console.error("Erreur lors du calcul des émotions les plus votées :", err);
            movieObj.error = err;   //Retourner l'erreur depuis l'objet.
        }
    }    
    return movieObj;    //Retourner l'objet disposant des données de notes et des votes des films.
}

async function insertObtainedBadge(user_id, badgeObj){
    //Fonction permettant de créer au besoin les relations qui définissent les badges obtenus pour chaque utilisateur.
    //Et retoure un boolean pour savoir si un enregistrement est crée ou non.

    const [element , created] = await UserBadge.findOrCreate({
        where : {   //Ce que l'on cherche :
            id_user : user_id,
            id_badge : badgeObj.badge_id_badge
        },
        defaults :{ //Ce que l'on crée si rien n'est trouvé.
            id_user : user_id,
            id_badge : badgeObj.badge_id_badge
        }
        //element --> contient l'enregistrement trouvé en fonction des clauses where ou créé en fonction de defaults.
        //created --> contient un boolean selon si l'enregistrement est créé ou non.
    });
    return created;
}

//Exportation des fonctions :
module.exports = {
    //Fonction helpers :
    convertDateFormat,
    convertRuntime,
    normalizeString,
    cleanPassword,
    //Fonction utilitaires à l'app web :
    getMoviesData,
    insertObtainedBadge
};