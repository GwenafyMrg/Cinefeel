//---------- Définition des fonctions utiles au DOM : ----------//

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

//--------------- Gestion des éléments dynamiques du côté client : ---------------//

//---------- Concernant l'affichage des films : ----------//

//----- Gérer les boutons de retournements pour toutes les cartes de films : -----//
document.addEventListener("DOMContentLoaded", function () { // Au chargement de la boite.
    // Sélectionner tous les conteneurs de cartes.
    const cardContainers = document.querySelectorAll(".card-container");

    cardContainers.forEach(container => {   // Pour chaques conteneurs de carte :
        // Sélectionner tous les boutons "Retourner" à l'intérieur du conteneur.
        const buttons = container.querySelectorAll(".switchButton");

        buttons.forEach(button => { // Pour chaques boutons :
            button.addEventListener("click", () => {    // Ajouter un événement de clic spécifique.
                container.classList.toggle("flipped");  // Donner la classe "flipped" au conteneur. 
            });
        });
    });
});

//---------- Concernant la page des filtres : ----------//

document.addEventListener("DOMContentLoaded", function () { // Au chargement de la page :

    //----- Redirection lors de la suppression des filtres : -----//
    document.getElementById("resetFilters").addEventListener("click", () => {   // Ajouter un évènement de filtre.
        window.location.href = "/explore-movies";   // Rediriger vers la page de filtre.
    });

    //----- Gestion de l'affichage pour le filtre sur la durée du film : -----//
    
    // Les balises de durée Min :
    const runtimeMinScale = document.getElementById("runtimeMinScale");     // Récupérer la balise de valeur.
    const runtimeMinDisplay = document.getElementById("runtimeMinDisplay"); // Récupérer la balise d'affichage.
    // Les balises de durée Max :
    const runtimeMaxScale = document.getElementById("runtimeMaxScale");
    const runtimeMaxDisplay = document.getElementById("runtimeMaxDisplay");

    // Gérer la durée minimale :
    runtimeMinDisplay.textContent = convertRuntime(runtimeMinScale.value);  // Initialiser l'affichage.
    runtimeMinScale.addEventListener("input", function() {                  // Ajouter un évènement de modification.
        runtimeMinDisplay.textContent = convertRuntime(runtimeMinScale.value);    // Actualiser l'affichage.
    });

    // Gérer la durée maximale :
    runtimeMaxDisplay.textContent = convertRuntime(runtimeMaxScale.value);  // Initialiser l'affichage.
    runtimeMaxScale.addEventListener("input", function() {                  // Ajouter un évènement de modification.
        runtimeMaxDisplay.textContent = convertRuntime(runtimeMaxScale.value);  // Actualiser l'affichage.
    });

    //----- Gestion de l'affichage pour le filtre sur l'année de sortie du film : -----//

    // Les balises de date de sortie minimale :
    dateMinScale = document.getElementById("dateMinScale");
    dateMinDisplay = document.getElementById("dateMinDisplay");
    // Les balises de date de sortie maximale :
    dateMaxScale = document.getElementById("dateMaxScale");
    dateMaxDisplay = document.getElementById("dateMaxDisplay");

    // Gérer la date de sortie minimale :
    dateMinDisplay.textContent = dateMinScale.value;
    dateMinScale.addEventListener("input", function() {
        dateMinDisplay.textContent = dateMinScale.value;
    });
    // Gérer la date de sortie maximale :
    dateMaxDisplay.textContent = dateMaxScale.value;
    dateMaxScale.addEventListener("input", function() {
        dateMaxDisplay.textContent = dateMaxScale.value;
    });   

    //----- Gestion de l'affichage pour le filtre de la note du film : -----//

    // Les balises de note minimale :
    noteMinScale = document.getElementById("noteMinScale");
    noteMinDisplay = document.getElementById("noteMinDisplay");
    // Les balises de note maximale :
    noteMaxScale = document.getElementById("noteMaxScale");
    noteMaxDisplay = document.getElementById("noteMaxDisplay");

    // Gérer la note minimale :
    noteMinDisplay.textContent = noteMinScale.value;
    noteMinScale.addEventListener("input", function() {
        noteMinDisplay.textContent = noteMinScale.value;
    });
    // Gérer la note maximale :
    noteMaxDisplay.textContent = noteMaxScale.value;
    noteMaxScale.addEventListener("input", function() {
        noteMaxDisplay.textContent = noteMaxScale.value;
    });
});

//---------- Concernant la page des avis : ----------//

document.addEventListener("DOMContentLoaded", function() {      // Au chargement de la page :

    //----- Gestion de l'affichage de la note choisie pour le film : -----//
    const noteDisplay = document.getElementById("noteDisplay");
    const noteInput = document.getElementById("noteInput");
    noteDisplay.textContent = noteInput.value;      // Initialiser la valeur par défaut du input :

    noteInput.addEventListener("input", function() {
        noteDisplay.textContent = noteInput.value;  // Actualiser à chaque changement.
    });

    //----- Gestion de l'affichage des émotions pour le film : -----//
    // Séléctionner le container contenant les checkboxes.
    const emotionsContainer = document.getElementById('emotions-container');

    // Ajout d'un gestionnaire d'événements pour surveiller les changements sur les checkboxes :
    emotionsContainer.addEventListener('change', (event) => {
        // Récupérer toutes les cases pouvant être cochées pour les émotions.
        const emotionsCheckboxes = emotionsContainer.querySelectorAll('input[type="checkbox"]');
        // Récupérer uniquement les cases cochées.
        const checkedCheckboxes = Array.from(emotionsCheckboxes).filter(checkbox => checkbox.checked);

        // Si il y a plus de 3 checkboxes cochées : 
        if (checkedCheckboxes.length > 3) {
            event.target.checked = false;   // Décocher la case qui vient d'être cochée.
            Swal.fire({                     // Afficher un pop-up.
                title: "Attention !",
                text: "Vous ne pouvez voter que pour 3 émotions au maximum.",
                icon : "error",
                confirmButtonText: "D'ACCORD",
            });
        }
    });

    //----- Gestion du nombre de caractère maximale pour le commentaire du film : -----//
    const commentInput = document.getElementById("commentInput");   // Récupérer la balise de texte.
    // console.log(commentInput);

    if(commentInput){   // Si la balise de texte a bien été récupéré :
        commentInput.addEventListener('input', function() { // Ajouter un écouteur d'évènement :
            // console.log(commentInput.value.length);
            if(commentInput.value.length > 500){    // Si le texte fait plus de 500 caractères :
                commentInput.value = commentInput.value.substring(0,500);   // Conserver uniquement les 500 premiers caractères.
                Swal.fire({     // Afficher un pop-up pour informer l'utilisateur du dépassement.
                    title: "Attention !",
                    text: "Vous ne pouvez rédiger un commentaire de plus de 500 caractères.",
                    icon : "error",
                    confirmButtonText: "D'ACCORD",
                });
            }
        });
    }
});