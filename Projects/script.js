function toggleDropdown(){
    console.log("Hamburger clicked!");
    let dropdown = document.getElementById("tabsDropdown");
    
    if (dropdown.style.display === "flex") {
        dropdown.style.display = "none";
        
    } else {
        dropdown.style.display = "flex";
        
    }
}