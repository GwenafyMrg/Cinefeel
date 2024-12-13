
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

//Exportation des fonctions :
module.exports = {
    convertDateFormat,
    convertRuntime,
    normalizeString,
};