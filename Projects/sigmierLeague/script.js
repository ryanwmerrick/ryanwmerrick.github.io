let MCI = {club: "Manchester City", abr: "MCI", player: "Alejandro Contreras", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let LIV = {club: "Liverpool", abr: "LIV", player: "Luke Kimmich", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let ARS = {club: "Arsenal", abr: "ARS", player: "Nate Young", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let AVL = {club: "Aston Villa", abr: "AVL", player: "Ryan Higgs", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let MUN = {club: "Manchester United", abr: "MUN", player: "Evan Ensminger", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let BHA = {club: "Brighton", abr: "BHA", player: "Will Rybka", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let NEW = {club: "Newcastle", abr: "NEW", player: "Evan Yoder", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let BRE = {club: "Brentford", abr: "BRE", player: "Jed Hart", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let BOU = {club: "Bournemouth", abr: "BOU", player: "Camden Thomas", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let NFO = {club: "Nottingham Forest", abr: "NFO", player: "Theo Campbell", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let TOT = {club: "Tottenham Hotspur", abr: "TOT", player: "Luke Ladas", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let CHE = {club: "Chelsea", abr: "CHE", player: "", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let FUL = {club: "Fulham", abr: "FUL", player: "John-Luc Harbour", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let WHU = {club: "West Ham", abr: "WHU", player: "Ben Reaggs", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let LEI = {club: "Leicester City", abr: "LEI", player: "Aidan Eck", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let CRY = {club: "Crystal Palace", abr: "CRY", player: "Ryan Merrick", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let IPS = {club: "Ipswich Town", abr: "IPS", player: "Jake Kimmich", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let WOL = {club: "Wolverhampton Wanderers", abr: "WOL", player: "", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let SOU = {club: "Southampton", abr: "SOU", player: "Colton Hudson", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let EVE = {club: "Everton", abr: "EVE", player: "Noah Gray", gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};



let league = [MCI, LIV, ARS, AVL, MUN, BHA, NEW, BRE, BOU, NFO, TOT, CHE, FUL, WHU, LEI, CRY, IPS, WOL, SOU, EVE];

let matches=`

LIV 2 IPS 1
LIV 3 SOU 2
LIV 2 LEI 2
IPS 4 SOU 2
NFO 1 LEI 1
WHU 4 NFO 0
SOU 4 CRY 0
NFO 3 BOU 1
IPS 3 EVE 6
EVE 5 BOU 1


`


    function setPoints() {
        //gets rid of white space before all the matches
        let matchesArray= matches.trim().split("\n");
        for(let i=0;i<matchesArray.length;i++){
            //gets rid of white space in each line/each match
            matchesArray[i]= matchesArray[i].trim();

        }
        

        
    
        for (let i of matchesArray) {
            let [team1Str, score1Str, team2Str, score2Str] = i.split(" ");
            let team1 = league.find(team => team.abr === team1Str);
            let team2 = league.find(team => team.abr === team2Str);
    
            let score1 = parseInt(score1Str);
            let score2 = parseInt(score2Str);
    
            if (score1 > score2) {
                team1.wins++;
                team2.losses++;
                if (score1 - score2 >= 7) {
                    team2.za++;
                }
            } else if (score2 > score1) {
                team2.wins++;
                team1.losses++;
                if (score2 - score1 >= 7) {
                    team1.za++;
                }
            } else {
                team1.draws++;
                team2.draws++;
            }
    
            // Goals for, goals against, games played
            team1.gf += score1;
            team1.ga += score2;
            team2.gf += score2;
            team2.ga += score1;
    
            team1.gp++;
            team2.gp++;
        }
    
        // Derived Data
        for (const team of league) {
            // Goal differential calculation
            team.gd = team.gf - team.ga;
    
            // Point calculation
            team.points = (3 * team.wins) + team.draws;
        }
    
        console.log(league); // Debugging line
    }
    

function setLeaderboard(){
    let table= document.querySelector(".leaderboard");
    

    league.sort((a, b) => {
        //Sort by points first
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        // Sort by goal differential
        if ((b.gd !== a.gd) && !(b.gp==0 || a.gp==0)) {
            return b.gd - a.gd;
        }
        // Sort by goals for
        if (b.gf !== a.gf) {
            return b.gf - a.gf;
        }
        // Sort by games played; more games played means higher rank
        if (b.gp !== a.gp) {
            return b.gp - a.gp;
        }
        // If everything else is the same, the order stays the same
        return 0;
    });
    

    for(const i in league){

        let newRow= document.createElement("tr");
        newRow.className="row";

        newRow.innerHTML=`
                <td>${parseInt(i)+1}</td>
                <td class="club"> <img src="images/${league[i].abr}.png" class="logo"> <strong> ${league[i].club}</strong> (${league[i].player})</td>
                <td>${league[i].gp}</td>
                <td>${league[i].wins}</td>
                <td>${league[i].draws}</td>
                <td>${league[i].losses}</td>
                <td>${league[i].gf}</td>
                <td>${league[i].ga}</td>
                <td>${league[i].gd}</td>
                <td>${league[i].za}</td>
                <td><strong>${league[i].points}</strong></td>
                `;
        table.appendChild(newRow);
        

    }


}

setPoints();
setLeaderboard();
