//Modules de sécurité.
const sanitizeHtml = require('sanitize-html');              //Protéger contre les Injection SQL

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

function arrayContains(array, value){
    let rep = false;
    if(array){
        rep = array.includes(value);
    }
    return rep;
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

//Exportation des fonctions :
module.exports = {
    convertDateFormat,
    convertRuntime,
    normalizeString,
    cleanPassword,
    arrayContains,
};