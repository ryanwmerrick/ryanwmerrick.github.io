function toggleDropdown(){
    console.log("Hamburger clicked!");
    let dropdown = document.getElementById("tabsDropdown");
    let square= document.getElementById("square")
    if (dropdown.style.display === "flex") {
        dropdown.style.display = "none";
        square.style.display = "flex";
    } else {
        dropdown.style.display = "flex";
        square.style.display = "none";
    }
}