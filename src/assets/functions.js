//Modules de sécurité.
const sanitizeHtml = require('sanitize-html');              //Protéger contre les Injection SQL
const {UserOpinion, Vote, Emotion} = require('../models');
const {Op} = require('sequelize');  

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

function cleanPassword(pw){
    
    let safePassword = pw;
    safePassword = safePassword.trim();         //Retirer les espaces inutiles.
    safePassword = sanitizeHtml(safePassword, { //Supprimer les caractères suspects.
        allowedTags: [],
        allowedAttributes: []
    });
    return safePassword;
}

//--------------------------------------------------------

async function getMoviesData (movieObj){

    for (const movie of movieObj) {
        //Calculer la note moyenne pour chaque film :
        try {
            const reviewsBelongsToMovie = await UserOpinion.findAll({
                where: {
                    opinion_id_movie: { [Op.eq]: movie.movie_id_movie }
                }
            });
            // console.log("Les Avis du film:", reviewsBelongsToMovie);

            let somme = 0;
            let nbReview = 0;
            for(let review of reviewsBelongsToMovie){
                somme += review.opinion_note;
                nbReview += 1;
            }
            let avg_note = somme/nbReview;
            if(!avg_note){
                avg_note = 0;
            }
            // console.log("Note moyenne:" ,avg_note);
            movie.movie_avg_note = avg_note;

        } catch(err){
            console.error("Erreur lors du calcul de la note moyenne :", err);
            movieObj.error = err;
        }

        // Calculer les émotions les plus votées pour chaque film :
        try{
            const votesForMovie = await Vote.findAll({
                where : {
                    id_movie : {[Op.eq] : movie.movie_id_movie}
                },
                include : [
                    {
                        model: Emotion,
                        as : "Emotion",
                        attributes : ["emotion_name"],
                    }
                ]
            });
            // console.log(votesForMovie);
    
            if(votesForMovie.length != 0){
                let votesCount = []; 
        
                votesForMovie.forEach(vote => {
                    const emotionName = vote.Emotion.emotion_name;
        
                    let existingVote = votesCount.find(item => item.name === emotionName);
        
                    if (existingVote) {
                        existingVote.count++; 
                    } else {
                        votesCount.push({ name: emotionName, count: 1 });
                    }
                });
                votesCount.sort((a, b) => b.count - a.count);
                // console.log("Votes globales:", votesCount);
        
                upVotes = [votesCount[0].name, votesCount[1].name, votesCount[2].name];
                // console.log(upVotes);
                movie.popularEmotions = upVotes;

            }
        }
        catch(err){
            console.error("Erreur lors du calcul des émotions les plus votées :", err);
            movieObj.error = err;
        }
    }    
    
    return movieObj;
}

//Exportation des fonctions :
module.exports = {
    convertDateFormat,
    convertRuntime,
    normalizeString,
    cleanPassword,
    getMoviesData
};