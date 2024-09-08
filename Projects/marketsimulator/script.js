let portfolio= []


function addToPortfolio(){
  let stock=document.getElementById('stock').value;
  let price=`0.00`;
  let shares=document.getElementById('shares').value;
  let date=document.getElementById('date').value;

  if(stock!='' && shares!='' && date!=''){
    //Input values in text boxes
    
    
    //Adds to the portfolio array for easy access later
    let newStock={
        stock: stock,
        price: price,
        shares: shares,
        date: date
    };

    portfolio.push(newStock);

    //Current state of lists
    let stockList=document.getElementById('stockList');
    let priceList=document.getElementById('priceList');
    let sharesList=document.getElementById('sharesList');
    let datesList=document.getElementById('datesList');
    
    
    //Adds Stock Symbol to List
    let addToStockList= document.createElement('li');
    addToStockList.id=stock
    addToStockList.textContent=`${stock}`;
    stockList.appendChild(addToStockList);

    //Adds Stock Price to List
    let addToPriceList= document.createElement('li');

    addToPriceList.textContent=`${price}`;
    priceList.appendChild(addToPriceList);
    
    //Adds Number of Shares to List
    let addToSharesList= document.createElement('li');
   
    addToSharesList.textContent=`${shares}`;
    sharesList.appendChild(addToSharesList);
    //Adds Date Purchased to List
    let addToDatesList= document.createElement('li');
    
    addToDatesList.textContent=`${date}`;
    datesList.appendChild(addToDatesList);
  }
}

    


function updatePortfolio(){
    //Current state of lists
    let stockList=document.getElementById('newStockList');
    let priceList=document.getElementById('newPriceList');
    let sharesList=document.getElementById('newSharesList');
    let datesList=document.getElementById('newDatesList');

    
    //Reset Lists
    stockList.innerHTML=`<li><u>Stock</u></li>`;
    priceList.innerHTML=`<li><u>Current Price</u></li>`;
    sharesList.innerHTML=`<li><u>Shares</u></li>`;
    datesList.innerHTML=`<li><u>Date Purchased</u></li>`;

    for(let i=0; i<portfolio.length;i++){
    

        //New list item
        let addToStockList= document.createElement('li');
        let addToPriceList= document.createElement('li');
        let addToSharesList= document.createElement('li');
        let addToDatesList= document.createElement('li');

        // //Gets stock price and adds to price list

        // fetchCurrentPrice(portfolio[i].stock).then(function(stockPrice){
        //   addToPriceList.textContent=stockPrice;
        //   priceList.appendChild(addToPriceList);

        // });

        //list item values
        addToPriceList.textContent='$0.00';
        addToStockList.textContent=portfolio[i].stock;
        addToSharesList.textContent=portfolio[i].shares;
        addToDatesList.textContent=portfolio[i].date;

        
        //Adds the values to the list 
        stockList.appendChild(addToStockList);
        priceList.appendChild(addToPriceList);
        sharesList.appendChild(addToSharesList);
        datesList.appendChild(addToDatesList);
    }


    
}
async function fetchCurrentPrice(stock) {
  let apiKey = 'WLSHYNTZ6O30W309';
  let api = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${stock}&apikey=${apiKey}`;

  try {
      let fullResponse = await fetch(api);
      let parsedResponse = await fullResponse.json();

      // Extract the most recent date's closing price
      let timeSeries = parsedResponse['Time Series (Daily)'];
      let latestDate = Object.keys(timeSeries)[0];
      let stockPrice = timeSeries[latestDate]['4. close'];

      // Update the content on the page
      let hello = document.getElementById('money');
      hello.textContent = `Current Price of ${stock}: $${stockPrice}`;

      // Return the price so it can be used elsewhere
      return stockPrice;
  } catch (error) {
      console.error("Error fetching stock price:", error);
      return null;
  }
}
