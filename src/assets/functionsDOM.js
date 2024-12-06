
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

function selected(element){
    element.style.backgroundColor = "green";
}
