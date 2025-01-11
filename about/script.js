function toggleDropdown(){
    console.log("Hamburger clicked!");
    let dropdown = document.getElementById("tabsDropdown");
    let circle=document.getElementById("circle");
    
    if (dropdown.style.display === "flex") {
        dropdown.style.display = "none";
        circle.style.display = "flex";
        
    } else {
        dropdown.style.display = "flex";
        circle.style.display = "none";
      
    }
}