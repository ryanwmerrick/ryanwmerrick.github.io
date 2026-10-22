// Mobile navigation menu
function toggleDropdown(){
    let dropdown = document.getElementById("tabsDropdown");
    let hamburger = document.querySelector(".hamburger");
    let isOpen = dropdown.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", isOpen);
}

function closeDropdown(){
    let dropdown = document.getElementById("tabsDropdown");
    let hamburger = document.querySelector(".hamburger");
    dropdown.classList.remove("open");
    hamburger.setAttribute("aria-expanded", false);
}

document.addEventListener("click", function(event){
    if (!event.target.closest(".navigationBar")) {
        closeDropdown();
    }
});

document.addEventListener("keydown", function(event){
    if (event.key === "Escape") {
        closeDropdown();
    }
});
