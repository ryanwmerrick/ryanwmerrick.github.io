var rectangles= document.querySelector(".rectangles");
var rectArray=[];
var isRunning=false;
var delayAmount=0.01;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRectangles(){
    isRunning=false;
    
    var numElementsInput= document.getElementById("numElements");
    var numElements=numElementsInput.value;

    //empties all rectangles before adding
    rectangles.innerHTML=" ";
    rectArray=[];

    var screenWidth= window.innerWidth-10;
    var rectWidth=(screenWidth/numElements);

    for(let i=0; i<numElements; i++){
        var newRect= document.createElement("div");
        newRect.classList.add("rectangle");
        newRect.style.width=rectWidth +"px";
        newRect.style.height=Math.floor(Math.random()*501) +"px";
        rectArray.push(newRect);
        rectangles.appendChild(newRect);

    }

   
}
function startSort(){
    var typeSortInput=document.getElementById("sortSelection");
    var typeSort=typeSortInput.value;
    if(isRunning){
        return;
    }
    if(typeSort=="bubbleSort"){
        bubbleSort();
        
    }
    if(typeSort=="mergeSort"){
        mergeSort(rectArray, 0, rectArray.length-1);
    
    }
           

}


function updateRectangles(){
    rectangles.innerHTML="";
    for(let i=0;i<rectArray.length;i++){
        rectangles.appendChild(rectArray[i]);
    }
}

function swap(i, j){
    var temp=rectArray[i];
    var tempHeight= temp.style.height;
    rectArray[i]=rectArray[j];
    rectArray[i].style.height=rectArray[j].style.height;
    rectArray[j]=temp;
    rectArray[j].style.height=tempHeight;
    
}
async function bubbleSort(){

    if(!isRunning){
        isRunning=true;
        var n=rectArray.length;
        for(let i=0;i<n-1; i++){
            for(let j=0;j<n-i-1;j++){
                if(!isRunning){
                    return;
                }
                await delay(delayAmount);
            
                if(parseInt(rectArray[j].style.height)>parseInt(rectArray[j+1].style.height)){
                    swap(j,j+1);
                    updateRectangles();
                    
                }
                
            }
            rectArray[n-1-i].style.backgroundColor="green";
            
        }

    }
    
}

async function merge(A,B){
    var newArr= new Array(A.length+B.length);
    var Aidx=0;
    var Bidx=0;
    var newidx=0;
    while (Aidx < A.length && Bidx < B.length) {
        if (parseInt(A[Aidx].style.height) <= parseInt(B[Bidx].style.height)) {
            newArr[newidx++] = A[Aidx++];
        } else {
            newArr[newidx++] = B[Bidx++];
        }
    }

    // Add remaining elements from A (if any)
    while (Aidx < A.length) {
        newArr[newidx++] = A[Aidx++];
    }

    // Add remaining elements from B (if any)
    while (Bidx < B.length) {
        newArr[newidx++] = B[Bidx++];
    }

    return newArr;
}

    


async function mergeSort(a,startIdx, endIdx){
    if (startIdx >= endIdx) {
        return;  // Base case: already sorted
    }
    
    isRunning=true;
    var halfIdx= Math.floor(startIdx + ((endIdx-startIdx)/2));

    // Recursively split the array
    await mergeSort(a,startIdx, halfIdx);
    await mergeSort(a,halfIdx + 1, endIdx);

    // Merge the sorted halves
    var S1 = rectArray.slice(startIdx, halfIdx + 1);
    var S2 = rectArray.slice(halfIdx + 1, endIdx + 1);

    // Merge the sorted halves
    var newS = await merge(S1, S2);

    // Update the rectArray with the merged result
    for (let i = startIdx; i <= endIdx; i++) {
        rectArray[i] = newS[i - startIdx];
    }

    updateRectangles();  // Ensure that the rectangles are updated
    
    await delay(delayAmount);  // Add delay for animation


      
}
    
    






