let MCI = {club: "Manchester City", abr: "MCI", player: "Alejandro Contreras", nick: "Alej", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let LIV = {club: "Liverpool", abr: "LIV", player: "Luke Kimmich", nick: "Luke", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let ARS = {club: "Arsenal", abr: "ARS", player: "Nate Young", nick: "Nate", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let AVL = {club: "Aston Villa", abr: "AVL", player: "Ryan Higgs", nick: "Higgs", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let MUN = {club: "Manchester United", abr: "MUN", player: "Kale Timmons", nick: "Kale", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let BHA = {club: "Brighton", abr: "BHA", player: "Will Rybka", nick: "Will", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let NEW = {club: "Newcastle", abr: "NEW", player: "Evan Yoder", nick: "Yoder", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let BRE = {club: "Brentford", abr: "BRE", player: "Jaden Claycamp", nick: "Jaden", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let BOU = {club: "Bournemouth", abr: "BOU", player: "Camden Thomas", nick: "Cam", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let NFO = {club: "Nottingham Forest", abr: "NFO", player: "Theo Campbell", nick: "Theo", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let TOT = {club: "Tottenham Hotspur", abr: "TOT", player: "Luke Ladas", nick: "Ladas", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let CHE = {club: "Chelsea", abr: "CHE", player: "Matt Herrmann", nick: "Herm", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let FUL = {club: "Fulham", abr: "FUL", player: "John-Luc Harbour", nick: "JL", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let WHU = {club: "West Ham", abr: "WHU", player: "Ben Reaggs", nick: "Ben", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let LEI = {club: "Leicester City", abr: "LEI", player: "Aidan Eck", nick: "Aidan", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let CRY = {club: "Crystal Palace", abr: "CRY", player: "Ryan Merrick", nick: "Merrick", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let IPS = {club: "Ipswich Town", abr: "IPS", player: "Jake Kimmich", nick: "Jake", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let WOL = {club: "Wolverhampton Wanderers", abr: "WOL", player: "Owen Zimmerman", nick: "Owen", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let SOU = {club: "Southampton", abr: "SOU", player: "Colton Hudson", nick: "Colton", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};
let EVE = {club: "Everton", abr: "EVE", player: "Noah Gray", nick: "Noah", matches: [], gp: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, za: 0, points: 0};




let league = [MCI, LIV, ARS, AVL, MUN, BHA, NEW, BRE, BOU, NFO, TOT, CHE, FUL, WHU, LEI, CRY, IPS, WOL, SOU, EVE];

let gamesPlayed=0;
let zaCount=0;

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
IPS 3 BOU 6
EVE 5 BOU 1
Jake 5 Higgs 0
Noah 3 Aidan 2
Aidan 1 Cam 1
Cam 2 Herm 1
Will 1 Theo 0
Merrick 2 Jake 1
Merrick 0 Theo 3
Jake 1 Theo 0
Higgs 2 Colton 0
NFO 1 SOU 1
Nate 1 Noah 0
Aidan 1 Nate 0
Noah 3 Colton 2
Nate 3 Herm 2
Nate 0 Colton 0
Noah 2 Herm 1
Owen 3 Cam 3
Noah 5 Owen 2
Ben 2 Owen 2
Noah 4 Merrick 2
Ben 6 Merrick 2
Cam 2 Merrick 1
Ben 3 Jake 2
Ben 2 Aidan 1
Cam 1 Ben 1
Ben 1 Nate 0
Nate 3 Jake 1
Theo 0 Nate 0
Ben 2 Colton 2
Yoder 4 Ladas 2
JL 3 Merrick 0
Ben 1 JL 1
Colton 2 Will 1
Will 2 Merrick 1
Higgs 2 Will 0
Merrick 2 Higgs 1
Jake 1 Yoder 0
Yoder 1 Aidan 4
Nate 2 Yoder 1
Yoder 2 Colton 1
Higgs 4 Alej 2
Theo 4 Alej 3
JL 3 Alej 0
Colton 2 Alej 1
Aidan 4 Alej 0
Noah 4 Alej 2
Aidan 0 Colton 0
Ben 5 Alej 0
Jake 2 Alej 1
Herm 6 Alej 0
Merrick 5 Alej 2
Alej 3 Jaden 2
Will 2 Alej 1
JL 5 Will 0
Herm 3 Jaden 1
Jaden 1 Kale 1
Kale 3 Alej 1
Luke 9 Alej 0
Ben 3 Jaden 1
Ladas 5 Luke 0
Alej 5 Luke 5
Cam 2 Luke 2
Cam 3 Alej 0
Theo 5 Luke 5
Ladas 4 Theo 2
Ladas 4 Cam 1
Noah 6 Luke 1
Merrick 4 Luke 2
Ben 1 Luke 1
Owen 6 Luke 1
Cam 6 Jaden 3
Jaden 4 Aidan 2



`;


function setPoints() {
    //gets rid of white space before all the matches
    let matchesArray= matches.trim().split("\n");
    for(let i=0;i<matchesArray.length;i++){
        //gets rid of white space in each line/each match
        matchesArray[i]= matchesArray[i].trim();
    }
    
    for (let i of matchesArray) {
        let [team1Str, score1Str, team2Str, score2Str] = i.split(" ");
        let team1 = league.find(team => team.abr === team1Str || team.nick=== team1Str);
        let team2 = league.find(team => team.abr === team2Str || team.nick === team2Str);

        let score1 = parseInt(score1Str);
        let score2 = parseInt(score2Str);

        if (score1 > score2) {
            team1.wins++;
            team2.losses++;
            if (score1 - score2 >= 7) {
                team2.za++;
                zaCount++;
            }
        } else if (score2 > score1) {
            team2.wins++;
            team1.losses++;
            if (score2 - score1 >= 7) {
                team1.za++;
                zaCount++;
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
        //Adding results to result page

        team1.matches.push({selTeam: team1.abr, selScore: score1, oppTeam:team2.abr, oppScore: score2});
        team2.matches.push({selTeam: team2.abr, selScore: score2, oppTeam:team1.abr, oppScore: score1});

        gamesPlayed++;
    }

    // Derived Data
    for (const team of league) {
        // Goal differential calculation
        team.gd = team.gf - team.ga;

        // Point calculation=
        team.points = (3 * team.wins) + team.draws;
    }
    let numGames= document.querySelector(".numGames");
    let numRemaining=document.querySelector(".numRemaining");
    let zaCounter=document.querySelector(".zaCount")
    numGames.innerHTML=`Total Games Played: ${gamesPlayed}`;
    numRemaining.innerHTML=`Games Remaining: ${380 - gamesPlayed}`;
    zaCounter.innerHTML=`🍕= ${zaCount}`;

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
                <td class="club"> 
                    <img src="images/${league[i].abr}.png" class="logo">
                    <a href="clubPage/index.html?team=${league[i].abr}"> 
                        <strong>${league[i].club}</strong> (${league[i].player}) 
                    </a>
                </td>
                <td>${league[i].gp}</td>
                <td>${league[i].wins}</td>
                <td>${league[i].draws}</td>
                <td>${league[i].losses}</td>
                <td>${league[i].gf}</td>
                <td>${league[i].ga}</td>
                <td>${league[i].gd}</td>
                <td>${league[i].za}</td>
                <td class="points"><strong>${league[i].points}</strong></td>
                `;
        table.appendChild(newRow);
    
    }
}
// Function to get URL parameters
function getURLParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    let abr= urlParams.get(param);

    clubInfo(abr);
}

function clubInfo(abr) {
    let team = league.find(t => t.abr === abr);

    let addHeader = document.querySelector(".clubInfo");
    addHeader.innerHTML = `
        <img src="../images/${team.abr}.png" alt="${team.abr} Logo">
        <h1>${team.club}</h1>
    `;

    let matchesPlayed = `<ul class="matchesPlayed">`;

    for (let match of team.matches) {
        let oppTeam = league.find(t => t.abr === match.oppTeam);
        matchesPlayed += `
            <li>
                ${match.selTeam} (${team.nick})
                <img src="../images/${abr}.png" alt="${abr} Logo" class="matchLogo">
                ${match.selScore} - ${match.oppScore}
                <img src="../images/${oppTeam.abr}.png" alt="${oppTeam.abr} Logo" class="matchLogo">
                ${match.oppTeam} (${oppTeam.nick})
            </li>
        `;
    }

    matchesPlayed += `</ul>`;

    let newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td class="matches">${matchesPlayed}</td>
        <td></td>
        <td></td>
    `;
    let table = document.querySelector(".infoTable");
    table.appendChild(newRow);
}
setPoints();
setLeaderboard();