
function convertDateFormat(date){

    const [year, mouth, day] = date.split('-');
    return `${day}-${mouth}-${year}`;
}

function convertRuntime(runtime){

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

    normalized = text.toLowerCase();
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normalized;
}

function test(){
    form = document.getElementsByName("filterForm");
    console.log(form);
}


module.exports = {
    convertDateFormat,
    convertRuntime,
    normalizeString,
};