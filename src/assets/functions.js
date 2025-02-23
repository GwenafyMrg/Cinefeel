//---------- Importations des modules node : ----------//

const sanitizeHtml = require('sanitize-html');                          // Module de sécurité contre les injections SQL.
const {Movie, UserOpinion, UserBadge, Vote, Emotion} = require('../models');   // Importations des modèles de BDD nécessaires.
const {Op} = require('sequelize');                                      // Objet opération pour les Requêtes SQL.

//---------- Fonctions Helpers pour HandleBars (utiliser côté client) : ----------//

function convertDateFormat(date){
    // Convertir du format AAAA-MM-DD au format DD-MM-AAAA.
    // parameters : 
        // date : string
    // return : string

    const [year, mouth, day] = date.split('-'); // Séparer la chaine de caractères.
    return `${day}-${mouth}-${year}`;
}

function convertRuntime(runtime){
    // Convertir un temps en minutes à un temps en heures et en minutes.
    // parameters : 
        // runtime : integer
    // return : string

    hour = 0, min = 0;          // Initialiser les valeurs.
    min = runtime%60;           // Calculer les minutes.
    hour = (runtime - min)/60;  // Calculer les heures.
    if(min < 10){   // Si le nombre de minute est inférieur strictement à 10 :
        return `${hour}h0${min}`;
    }
    else{   // Sinon :
        return `${hour}h${min}`;
    }
}

function normalizeString(text){
    // Normaliser une chaine de caractère, c'est-à-dire passer ses caractères en minuscules et retirer les accents.
    // parameters : 
        // text : string
    // return : string

    normalizedText = text.toLowerCase();    // Convertir en minuscule.
    normalizedText = normalizedText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");   // Supprimer les accents.
    return normalizedText;
}

//---------- Fonctions Utilitaires pour l'application Web (côté serveur) : ----------//

function cleanPassword(pw){
    // Nettoyer une chaine de caractères destiné à devenir un mot de passe haché par la suite.
    // parameters : 
        // pw : string
    // return : string
    
    let safePassword = pw;                      // Copier le paramètre.
    safePassword = safePassword.trim();         // Retirer les espaces inutiles.
    safePassword = sanitizeHtml(safePassword, { // Supprimer les caractères suspects.
        allowedTags: [],
        allowedAttributes: []
    });
    return safePassword;
}

async function getMoviesData (movieObj){
    // Fonction asynchrone permettant de mettre à jour les notes moyennes et d'afficher les émotions les plus votées
    // d'une série de film stockée dans un objet JavaScript.
    // parameters : 
        // movieObj : JSObject
    // return : JSObject

    for (const movie of movieObj) { // Pour chaques films dans la liste des films transmis : 
        try {   // Essayer de calculer la note moyenne pour chaques films :
            const reviewsBelongsToMovie = await UserOpinion.findAll({   // Récupérer tous les avis du film concerné :
                where: {
                    opinion_id_movie: { [Op.eq]: movie.movie_id_movie } // Restriction sur l'identifiant du film.
                },
                attributes : ["opinion_note"]   // Projection sur la note de l'avis.
            });
            // console.log("Les Avis du film:", reviewsBelongsToMovie);

            //----- Initialisation des variables : -----//
            let sum = 0;
            let nbReview = 0;
            let updated_avg_note = 0;

            //----- Calcul de la moyenne : -----//
            for(let review of reviewsBelongsToMovie){   // Pour chaque avis dans la liste d'avis :
                sum += review.opinion_note;             // Additionner la note avec les autres.
                nbReview += 1;                          // Augmenter le compteur d'avis de 1.
            }
            updated_avg_note = sum/nbReview;    // Calculer la note moyenne.

            if(!updated_avg_note){      //Si la note est NaN :
                updated_avg_note = 0;   //Remplacé la valeur NaN par 0.
            }
            // console.log("Note moyenne mise à jour :" ,updated_avg_note);

            //----- Actualisation de la note moyenne en Base : -----//
            current_avg_note = movie.movie_avg_note;
            // console.log("Note moyenne actuelle :" ,current_avg_note);

            if(updated_avg_note != current_avg_note){   // Si la note calculée est différente de la note actuelle :
                try{    // Essayer de mettre à jour la base de données :
                    await Movie.update(     // Mettre à jour la table Movie.
                        {movie_avg_note : updated_avg_note},    // Champ a actualisé.
                        {
                            where : {movie_id_movie : movie.movie_id_movie} // Restriction sur l'identifiant du film.
                        }
                    )
                }
                catch(err){ // En cas d'erreur lors de l'actualisation en Base :
                    console.error("Erreur lors de la modification de la note moyenne dans la Base de Données :", err);
                    movieObj.error = err;   // Retourner l'erreur depuis l'objet movieObj.
                }
            }
            movie.movie_avg_note = updated_avg_note;    // Ajouter la nouvelle note moyenne à l'objet movie.

        } catch(err){   // En cas d'erreur lors du calcul :
            console.error("Erreur lors du calcul de la note moyenne :", err);
            movieObj.error = err;       // Retourner l'erreur depuis l'objet movieObj.
        }

        try{    // Essayer de calculer les émotions les plus votées pour chaques films :
            const votesForMovie = await Vote.findAll({  // Récupérer tous les votes du film concerné : 
                where : {
                    id_movie : {[Op.eq] : movie.movie_id_movie}     // Restriction sur l'identifiant du film.
                },
                include : [                                 // Jointure sur la table Emotion.
                    {
                        model: Emotion,
                        as : "Emotion",
                        attributes : ["emotion_name"],      // Projection sur le nom de l'émotion.
                    }
                ],
                attributes : ["id_emotion"]     // Projection sur l'identifiant de l'émotion.
            });
            // console.log(votesForMovie);
    
            if(votesForMovie.length != 0){  // S'il existe au moins 1 vote :
                let votesCount = [];    // Définir un tableau pour stocker les émotions et leur nombre de votes.
        
                votesForMovie.forEach(vote => {     // Pour chaques votes du film :
                    const emotionName = vote.Emotion.emotion_name;  // Récupérer l'émotion votée.
        
                    // Récupérer un boolean indiquant si l'émotion existe dans le structure de comptage.
                    let existingVote = votesCount.find(item => item.name === emotionName);
        
                    if (existingVote) {         // Si l'émotion existe déjà :
                        existingVote.count++;   // Incrémenter son nombre de votes.
                    } else {                    // Sinon : 
                        votesCount.push({ name: emotionName, count: 1 });   // Ajouter l'émotion et initialiser le compteur à 1 vote.
                    }
                });
                votesCount.sort((a, b) => b.count - a.count);   // Trier les émotions dans l'ordre décroissant du nombre de votes.
                //.sort() --> trie le tableau à l'aide d'une fonction de comparaison
                // Pour (a,b) des valeurs de votesCount :
                // Si b.count - a.count > 0 --> b est plus grand que a donc b est placé avant.
                // Si b.count - a.count < 0 --> a est plus grand que b donc a est placé avant.

                // console.log("Votes globales:", votesCount);
        
                // Récupérer les 3 premières valeurs (les émotions les plus votées).
                upVotes = [votesCount[0].name, votesCount[1].name, votesCount[2].name];
                // console.log(upVotes);

                // Insérer les 3 émotions les plus upVote dans la structure du film concerné toujours.
                movie.popularEmotions = upVotes;

            }
            // S'il n'y a pas de vote, ne rien faire de plus.
        }
        catch(err){ // En cas d'erreur lors du calcul :
            console.error("Erreur lors du calcul des émotions les plus votées :", err);
            movieObj.error = err;   // Retourner l'erreur depuis l'objet movieObj.
        }
    }     
    return movieObj;    // Retourner l'objet disposant des données de notes et des votes des films.
}

async function insertObtainedBadge(user_id, badgeObj){
    // Fonction permettant de créer les relations qui définissent les badges obtenus pour chaque utilisateur
    // et retourne un boolean pour savoir si un enregistrement est crée ou non.
    // parameters : 
        // user_id : integer
        // badgeObj : JSObject
    // return : boolean

    const [element , created] = await UserBadge.findOrCreate({  // Créer ou chercher un badge obtenue :
        // element --> contient l'enregistrement trouvé en fonction des clauses where ou créé en fonction de defaults.
        // created --> contient un boolean selon si l'enregistrement est créé ou non.
        where : {   // Ce que l'on cherche :
            id_user : user_id,                  // Restriction sur l'identifiant utilisateur.
            id_badge : badgeObj.badge_id_badge  // Restriction sur l'identifiant du bagde.
        },
        defaults :{ // Ce que l'on crée si rien n'est trouvé.
            id_user : user_id,
            id_badge : badgeObj.badge_id_badge
        }
    });
    return created;
}

//---------- Exportations des fonctions : ----------//
module.exports = {
    //----- Fonction helpers : -----//
    convertDateFormat,
    convertRuntime,
    normalizeString,
    cleanPassword,
    //----- Fonctions utilitaires à l'app web : -----//
    getMoviesData,
    insertObtainedBadge
};