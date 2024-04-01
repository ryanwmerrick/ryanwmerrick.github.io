document.addEventListener('keydown', function (event) {
    if(gameStarted) {
        pressKey(event.key)
    }
});

gameStarted = false
currentWord = 0;
words=[]
correct = 0
results = ''

function hideElement(id){
    document.getElementById(id).hidden = true
}

function showElement(id){
    document.getElementById(id).hidden = false
}




function getWords(){
    words = document.getElementById('toMemorize').value;
    return words;
    
}



function genGame(){
    words = getWords();
    hideElement("startScreen");
    hideElement('retry');
    hideElement('goBack');
    showElement('checkButton');
    showElement("gameArea");
}

function retry(){
   
    hideElement("solutionBox");
    hideElement('retry');
    hideElement('goBack');
    showElement('checkButton')
    document.getElementById('guessBox').value="";
}



function restart(){
    words=[];
    hideElement('gameArea');
    hideElement('solutionBox');
    showElement("startScreen");
    
    
}

function finishGame(){
    gameStarted = false
    console.log('done!')
    hideElement("gameArea")
    showElement("results")
    results += "<div>("+correct+"/"+(currentWord-1)+" correct) <button onclick='retry()'>Retry</button> <button onclick='restart()'>Go Back</button></div>"
    document.getElementById("currentWord").style.color = "black"
    document.getElementById("results").innerHTML = results
}


function readTextFile(file)
{
    fetch(file)
    .then(response => response.text())
    .then(text => {
        console.log(text)
        return text.toString()
    })
}

function replaceText(input){
    newText = ''
    switch(input){
        case 'CTPrologue.txt':
            newText = `Whan that Aprille with his shoures soote,
The droghte of March hath perced to the roote,
And bathed every veyne in swich licóur
Of which vertú engendred is the flour;
Whan Zephirus eek with his swete breeth
Inspired hath in every holt and heeth
The tendre croppes, and the yonge sonne
Hath in the Ram his halfe cours y-ronne,
And smale foweles maken melodye,
That slepen al the nyght with open eye,
So priketh hem Natúre in hir corages,
Thanne longen folk to goon on pilgrimages,
And palmeres for to seken straunge strondes,
To ferne halwes, kowthe in sondry londes;
And specially, from every shires ende
Of Engelond, to Caunterbury they wende,
The hooly blisful martir for to seke,
That hem hath holpen whan that they were seeke.

Bifel that in that sesoun on a day
In Southwerk at the Tabard, as I lay
Redy to wenden on my pilgrymage
To Caunterbury with ful devout corage,
At nyght was come into that hostelrye
Wel nyne- and- twenty in a compaignye
Of sondry folk by aventure y-falle
In felaweshipe, and pilgrymages were they alle
That toward Caunterbury wolden ryde.
The chambres and the stables weren wyde,
And wel we weren esed atte beste;
And shortly, whan the sonne was to reste,
So hadde I spoken with hem evrichon
That I was of hir felaweshipe anon;
And made forward erly for to ryse
To take oure wey ther as I yow devyse.

But, nathelees, whil I have tyme and space,
Er that I ferther in this tale pace,
Me thynketh it acordant to resoun
To telle yow al the condicioun
Of ech of hem so as it semed me,
And whiche they weren, and of what degree,
And eek in what array they were inne;
And at a kynght than wol I first bigynne.`
        break
        case 'OCOCE1-2.txt':
            newText = `O come, O come, Emmanuel,
And ransom captive Israel;
That mourns in lonely exile here,
Until the Son of God appear.
Rejoice! Rejoice! Emmanuel
Shall come to thee, O Israel.

O come, Thou Rod of Jesse, free
Thine own from Satan's tyranny;
From depths of hell Thy people save,
And give them victory o'er the grave.
Rejoice! Rejoice! Emmanuel
Shall come to thee, O Israel.`
        break

        case 'James1ESV.txt':
            newText = `James, a servant of God and of the Lord Jesus Christ,
To the twelve tribes in the Dispersion:
            
Greetings.
            
Count it all joy, my brothers, when you meet trials of various kinds, for you know that the testing of your faith produces steadfastness. And let steadfastness have its full effect, that you may be perfect and complete, lacking in nothing.
            
If any of you lacks wisdom, let him ask God, who gives generously to all without reproach, and it will be given him. But let him ask in faith, with no doubting, for the one who doubts is like a wave of the sea that is driven and tossed by the wind. For that person must not suppose that he will receive anything from the Lord; he is a double-minded man, unstable in all his ways.
            
Let the lowly brother boast in his exaltation, and the rich in his humiliation, because like a flower of the grass he will pass away. For the sun rises with its scorching heat and withers the grass; its flower falls, and its beauty perishes. So also will the rich man fade away in the midst of his pursuits.
            
Blessed is the man who remains steadfast under trial, for when he has stood the test he will receive the crown of life, which God has promised to those who love him. Let no one say when he is tempted, i"I am being tempted by God,” for God cannot be tempted with evil, and he himself tempts no one. But each person is tempted when he is lured and enticed by his own desire. Then desire when it has conceived gives birth to sin, and sin when it is fully grown brings forth death.
            
Do not be deceived, my beloved brothers. Every good gift and every perfect gift is from above, coming down from the Father of lights, with whom there is no variation or shadow due to change. Of his own will he brought us forth by the word of truth, that we should be a kind of firstfruits of his creatures.
            
Know this, my beloved brothers: let every person be quick to hear, slow to speak, slow to anger; for the anger of man does not produce the righteousness of God. Therefore put away all filthiness and rampant wickedness and receive with meekness the implanted word, which is able to save your souls.
            
But be doers of the word, and not hearers only, deceiving yourselves. For if anyone is a hearer of the word and not a doer, he is like a man who looks intently at his natural face in a mirror. For he looks at himself and goes away and at once forgets what he was like. But the one who looks into the perfect law, the law of liberty, and perseveres, being no hearer who forgets but a doer who acts, he will be blessed in his doing.
            
If anyone thinks he is religious and does not bridle his tongue but deceives his heart, this person's religion is worthless. Religion that is pure and undefiled before God the Father is this: to visit orphans and widows in their affliction, and to keep oneself unstained from the world.`
        case "Romans8.txt":
            newText = `There is therefore now no condemnation for those who are in Christ Jesus. For the law of the Spirit of life has set you free in Christ Jesus from the law of sin and death. For God has done what the law, weakened by the flesh, could not do. By sending his own Son in the likeness of sinful flesh and for sin, he condemned sin in the flesh, in order that the righteous requirement of the law might be fulfilled in us, who walk not according to the flesh but according to the Spirit. For those who live according to the flesh set their minds on the things of the flesh, but those who live according to the Spirit set their minds on the things of the Spirit. For to set the mind on the flesh is death, but to set the mind on the Spirit is life and peace. For the mind that is set on the flesh is hostile to God, for it does not submit to God's law; indeed, it cannot. Those who are in the flesh cannot please God.

You, however, are not in the flesh but in the Spirit, if in fact the Spirit of God dwells in you. Anyone who does not have the Spirit of Christ does not belong to him. But if Christ is in you, although the body is dead because of sin, the Spirit is life because of righteousness. If the Spirit of him who raised Jesus from the dead dwells in you, he who raised Christ Jesus from the dead will also give life to your mortal bodies through his Spirit who dwells in you.

So then, brothers, we are debtors, not to the flesh, to live according to the flesh. For if you live according to the flesh you will die, but if by the Spirit you put to death the deeds of the body, you will live. 14 For all who are led by the Spirit of God are sons of God. For you did not receive the spirit of slavery to fall back into fear, but you have received the Spirit of adoption as sons, by whom we cry, “Abba! Father!” The Spirit himself bears witness with our spirit that we are children of God, and if children, then heirs—heirs of God and fellow heirs with Christ, provided we suffer with him in order that we may also be glorified with him.

For I consider that the sufferings of this present time are not worth comparing with the glory that is to be revealed to us. For the creation waits with eager longing for the revealing of the sons of God. For the creation was subjected to futility, not willingly, but because of him who subjected it, in hope that the creation itself will be set free from its bondage to corruption and obtain the freedom of the glory of the children of God. For we know that the whole creation has been groaning together in the pains of childbirth until now. And not only the creation, but we ourselves, who have the firstfruits of the Spirit, groan inwardly as we wait eagerly for adoption as sons, the redemption of our bodies. For in this hope we were saved. Now hope that is seen is not hope. For who hopes for what he sees? But if we hope for what we do not see, we wait for it with patience.

Likewise the Spirit helps us in our weakness. For we do not know what to pray for as we ought, but the Spirit himself intercedes for us with groanings too deep for words. And he who searches hearts knows what is the mind of the Spirit, because the Spirit intercedes for the saints according to the will of God. And we know that for those who love God all things work together for good, for those who are called according to his purpose. For those whom he foreknew he also predestined to be conformed to the image of his Son, in order that he might be the firstborn among many brothers. And those whom he predestined he also called, and those whom he called he also justified, and those whom he justified he also glorified.

What then shall we say to these things? If God is for us, who can be against us? He who did not spare his own Son but gave him up for us all, how will he not also with him graciously give us all things? Who shall bring any charge against God's elect? It is God who justifies. 34 Who is to condemn? Christ Jesus is the one who died—more than that, who was raised—who is at the right hand of God, who indeed is interceding for us. Who shall separate us from the love of Christ? Shall tribulation, or distress, or persecution, or famine, or nakedness, or danger, or sword? As it is written,

“For your sake we are being killed all the day long; we are regarded as sheep to be slaughtered.”

No, in all these things we are more than conquerors through him who loved us. For I am sure that neither death nor life, nor angels nor rulers, nor things present nor things to come, nor powers, nor height nor depth, nor anything else in all creation, will be able to separate us from the love of God in Christ Jesus our Lord.`
    }
    
    document.getElementById("toMemorize").value = newText

}



function showSolution(){
    
    document.getElementById('solutionBox').value=words;
    showElement('solutionBox');
    hideElement('checkButton');
    showElement('retry');
    showElement('goBack');

}