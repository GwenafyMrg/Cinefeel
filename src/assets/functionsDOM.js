//Pas d'autres solutions trouver que de recopier la fonction provenant de functions.js utiliser pour les imports de l'application node.js
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

function selected(element){
    element.style.backgroundColor = "green";
}

//---------------------------------------A définir :-----------------------------------------

// Gérer les boutons de retournements pour toutes les movieCards.
document.addEventListener("DOMContentLoaded", function () {
    // Sélectionne tous les conteneurs de cartes
    const cardContainers = document.querySelectorAll(".card-container");

    cardContainers.forEach(container => {
        // Sélectionne tous les boutons "Retourner" à l'intérieur du conteneur
        const buttons = container.querySelectorAll(".switchButton");

        buttons.forEach(button => {
            // Ajoute un événement de clic spécifique pour ce conteneur
            button.addEventListener("click", () => {
                container.classList.toggle("flipped"); // Bascule uniquement ce conteneur
            });
        });
    });
});

//------------------------------------Page des filtres :-----------------------------------------

//Gérer l'affichage de la valeur maximale indiquée par la jauge de durée :
document.addEventListener("DOMContentLoaded", function () {

    //----------------------Durée du film à filtrer :-------------------------
    
    //Balises de durée Min :
    const runtimeMinScale = document.getElementById("runtimeMinScale");
    const runtimeMinDisplay = document.getElementById("runtimeMinDisplay");

    //Balises de durée Max :
    const runtimeMaxScale = document.getElementById("runtimeMaxScale");
    const runtimeMaxDisplay = document.getElementById("runtimeMaxDisplay");

    //Utilisation de l'event "click" et non "input" pour ne pas surcharger les actions de recherche.
    //"input" --> pour chaque changement de valeur.
    //Gestion de l'affichage des valeurs pour le curseur runtimeMin :
    runtimeMinDisplay.textContent = convertRuntime(runtimeMinScale.value);
    runtimeMinScale.addEventListener("input", function() {

        let runtimeMinValue = runtimeMinScale.value;
        runtimeMinDisplay.textContent = convertRuntime(runtimeMinValue);
    });
    //Gestion de l'affichage des valeurs pour le curseur runtimeMax :
    runtimeMaxDisplay.textContent = convertRuntime(runtimeMaxScale.value);
    runtimeMaxScale.addEventListener("input", function() {

        let runtimeMaxValue = runtimeMaxScale.value;
        runtimeMaxDisplay.textContent = convertRuntime(runtimeMaxValue);
    });

    //----------------------Année de sortie du film à filtrer :-------------------------

    //Balise de date de sortie Min:
    dateMinScale = document.getElementById("dateMinScale");
    dateMinDisplay = document.getElementById("dateMinDisplay")

    //Balise de date de sortie Max:
    dateMaxScale = document.getElementById("dateMaxScale");
    dateMaxDisplay = document.getElementById("dateMaxDisplay")

    //Gestion de l'affichage des valeurs pour le curseur dateMin :
    dateMinDisplay.textContent = dateMinScale.value;
    dateMinScale.addEventListener("input", function() {
        dateMinValue = dateMinScale.value;
        dateMinDisplay.textContent = dateMinValue;
    });
    //Gestion de l'affichage des valeurs pour le curseur dateMax :
    dateMaxDisplay.textContent = dateMaxScale.value;
    dateMaxScale.addEventListener("input", function() {
        dateMaxValue = dateMaxScale.value;
        dateMaxDisplay.textContent = dateMaxValue;
    });

    document.getElementById("resetFilters").addEventListener("click", () => {
        window.location.href = "/moviesList";
    });
      
});