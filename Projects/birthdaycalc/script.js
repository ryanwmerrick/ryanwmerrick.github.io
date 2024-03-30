function rounder(value,places){
    return Math.round((value + Number.EPSILON)* (10**places))/(10**places);
} 
function myFunction() {
    let people= document.getElementById("textBox").value;
    if(isNaN(people)) {
        document.getElementById("percentage").innerHTML="Input a Number";
    }
    else if (people<0) {
        document.getElementById("percentage").innerHTML="Input a Positive Number"
    }
    else if (people<1) {
        document.getElementById("percentage").innerHTML="0%"
    }
    else {
        let result= ((1-((364/365)**((people*(people-1))/2)))*100);
        document.getElementById("percentage").innerHTML=rounder(result,6) + '%';
    }
    }
