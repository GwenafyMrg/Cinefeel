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

//------------------------------Concernant la page des filtres :-----------------------------------

//Au chargement de la page :
document.addEventListener("DOMContentLoaded", function () {

    //----------------------Redirection lors de la suppression des filtres :-------------------------
    document.getElementById("resetFilters").addEventListener("click", () => {
        window.location.href = "/moviesList";
    });

    //----------------------Gestion de l'affichage pour la durée du film :-------------------------
    
    //Balises de durée Min :
    const runtimeMinScale = document.getElementById("runtimeMinScale");     //Récupération de l'objet de valeur
    const runtimeMinDisplay = document.getElementById("runtimeMinDisplay"); //Récupération de l'objet d'affichage
    //Balises de durée Max :
    const runtimeMaxScale = document.getElementById("runtimeMaxScale");
    const runtimeMaxDisplay = document.getElementById("runtimeMaxDisplay");

    //---------------
    //Utilisation de l'event "input" et non "click" pour ne pas surcharger les actions de recherche.
    //"input" --> agit pour chaque changement de valeur.
    //---------------

    //Gestion pour la durée minimale :
    runtimeMinDisplay.textContent = convertRuntime(runtimeMinScale.value);  //Initialisation de l'affichage.
    runtimeMinScale.addEventListener("input", function() {                  //Pour chaque changement.                //Récupération de la valeur actuelle
        runtimeMinDisplay.textContent = convertRuntime(runtimeMinScale.value);    //Actualisation de l'affchage
    });

    //Gestion pour la durée maximale.
    runtimeMaxDisplay.textContent = convertRuntime(runtimeMaxScale.value);
    runtimeMaxScale.addEventListener("input", function() {
        runtimeMaxDisplay.textContent = convertRuntime(runtimeMaxScale.value);
    });

    //----------------------Année de sortie du film à filtrer :-------------------------

    //Balise de date de sortie Min:
    dateMinScale = document.getElementById("dateMinScale");
    dateMinDisplay = document.getElementById("dateMinDisplay");
    //Balise de date de sortie Max:
    dateMaxScale = document.getElementById("dateMaxScale");
    dateMaxDisplay = document.getElementById("dateMaxDisplay");

    //Gestion pour la date de sortie minimale :
    dateMinDisplay.textContent = dateMinScale.value;
    dateMinScale.addEventListener("input", function() {
        dateMinDisplay.textContent = dateMinScale.value;
    });
    //Gestion pour la date de sortie maximale :
    dateMaxDisplay.textContent = dateMaxScale.value;
    dateMaxScale.addEventListener("input", function() {
        dateMaxDisplay.textContent = dateMaxScale.value;
    });   
});

//------------------------------Concernant la page des avis :-----------------------------------

document.addEventListener("DOMContentLoaded", function() {

    const noteDisplay = document.getElementById("noteDisplay");
    const noteInput = document.getElementById("noteInput");
    noteDisplay.textContent = noteInput.value;

    noteInput.addEventListener("input", function() {
        noteDisplay.textContent = noteInput.value;
    });
});