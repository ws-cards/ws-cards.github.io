	window.onload=function(){
		setTimeout(function(){
			window.scrollTo(0, 1);
		}, 100);		
			  setFun();  
	}
var $input = $(".typeahead");
var $dropdown = $(".dropdown-menu");
var a = {
      sheetUrl : 'https://docs.google.com/spreadsheets/d/1Nq5spFj7s6rU3CHhCfLWfk6fq__aQm_5f1hXNo7gBEk/edit?usp=sharing', //試算表連結，檔案-->共用
      sheetTag : '中日對照',
      row: 1, //起始位置
      col: 1,
      endRow : 200, //切段資料
      endCol : 3,//2欄
	  par : 'ALL',
	  attri: 'ALL'
  };

$(".typeahead").typeahead({ 
source:[
{id:"R000001", name:"ゆずソフト",cname:"柚子社 YUZUSOFT | OS01"},
{id:"R000002", name:"魔法少女にあこがれて",cname:"夢想成為魔法少女 | OS02"}
]
,
  minLength:1,
  showHintOnFocus:true,
  scrollHeight:0,
  items:'all',
        matcher: function (item) {
            var it = this.displayText(item);
			var cname=item.cname+"";
			if(cname.indexOf(this.query)>=0){
				return item.name;
			}else if(cname.toLowerCase().indexOf(this.query)>=0){
				return item.name;
			}else if(cname.toLowerCase().indexOf(this.query.toLowerCase())>=0){
				return item.name;
			}
            return ~it.toLowerCase().indexOf(this.query.toLowerCase());
        },
//  displayText: function(item) {
//	return item.name
//  },
  fitToElement:true,
  selectOnBlur:false
	 
	 });
	
$input.change(function() {
  var current = $input.typeahead("getActive");
  if (current) {
    // Some item from your model is active!
    if (current.name == $input.val()) {
	    changeStandardForSuggest(current.name);
	  //when you chose item
    } else {
		//alert($dropdown.val);
      // This means it is only a partial match, you can either add a new item
      // or take the active if you don't want new items
    }
  } else {
    // Nothing is active so it is a new value (or maybe empty value)
  }
});  
			var requestURLCardPrice = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/BD_W54.json';
			var requestURLCardStock = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/stockJson/BD_W54.json';
			var requestMappingURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDisplayMapping.json'
			var requestURLCardPricebyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/';
			var requestURLCardStockbyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/stockJson/';
			var requestURLCardTitle = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardTitle.json';
			var standardRURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_R.json';
			var requestStandardR = new XMLHttpRequest();		
			var requestPrice = new XMLHttpRequest();	
			var requestStock = new XMLHttpRequest();
			var requestTitle = new XMLHttpRequest();	
			var requestMapping = new XMLHttpRequest();
			var mappingRep;
			  requestMapping.open('GET',requestMappingURL);
			  requestMapping.responseType = 'json';
			  requestMapping.send();	
			  requestMapping.onload = function() {console.log("debug:5");
			  mappingRep = requestMapping.response;
			  
			  }			  
			
			function setFun(){
			  //select 設定
			  var selectStandard = document.getElementById("cardStandard");
			  selectStandard.length = 1;
			  selectStandard.options[0].selected = true;	
			  
			  var selectPrice = document.getElementById("cardNumber"); 
			  selectPrice.length = 1;
			  selectPrice.options[0].selected = true;	
			  selectPrice.style.visibility = 'hidden';

			  var selectTitle = document.getElementById("cardTitle"); 
			  selectTitle.length = 1;
			  selectTitle.options[0].selected = true;	
			  
			  //request 設定
			  requestStandardR.open('GET', standardRURL);
			  requestStandardR.responseType = 'json';
			  requestStandardR.send();				  

			  
			  requestStandardR.onload = function(){
					var optgroupR = document.getElementById("Weiss");
			  		var cardsR = requestStandardR.response;
					for(var key in cardsR){	 
						var option = document.createElement("option");
						option.setAttribute("value",cardsR[key]);
						option.setAttribute("id",key);
						option.appendChild(document.createTextNode(key)); 
						optgroupR.appendChild(option);				
					}	
			  }
			  
			  requestPrice.open('GET', requestURLCardPrice);
			  requestPrice.responseType = 'json';
			  requestPrice.send();	

			  requestStock.open('GET', requestURLCardStock);
			  requestStock.responseType = 'json';
			  requestStock.send();
			  
			  requestTitle.open('GET', requestURLCardTitle);
			  requestTitle.responseType = 'json';
			  requestTitle.send();
			
			  requestTitle.onload = function(){
				var cardsTitle = requestTitle.response;
				for(var key in cardsTitle){	 
					var option = document.createElement("option");
					option.setAttribute("value",key);
					option.appendChild(document.createTextNode(cardsTitle[key])); 
					selectTitle.appendChild(option);				
				}
			
			  }
			  
			  requestPrice.onload = function(){
				  var cards = requestPrice.response;
				  getCardData(cards,'BD/W54-070SSP','BD/W54-070SSP');			  
			  }
			  requestStock.onload = function(){
				  var cards = requestStock.response;
				  getCardStockData(cards,'BD/W54-070SSP','BD/W54-070SSP');			  
			  }			  
			  
				var timer = setInterval(function(){
					if (document.getElementById('cardImg').complete){
					clearInterval(timer);
					console.log(document.getElementById('cardImg').complete)
					document.getElementById('overlay-1').style.display='none';	
					}
				}, 10);	
			}
			
			function changeStandard(){
			  var cardStandard=document.getElementById('cardStandard').value;
			  var cardStandardEle=document.getElementById('cardStandard');
			  var selectTitle = document.getElementById("cardTitle"); 
			  while (selectTitle.firstChild) {
				selectTitle.removeChild(selectTitle.firstChild);
			  }			  
			  
    		  requestTitle.open('GET', requestURLCardTitle);
			  requestTitle.responseType = 'json';
			  requestTitle.send();					
			  requestTitle.onload = function(){
				var cardsTitle = requestTitle.response;
				var cardStandardArray = cardStandard.split(",");
				for(var key in cardsTitle){	 

					var keyStr=key.substr(0,key.indexOf('/'));//2~3
					var keyStrLength=keyStr.length;

					var filtered = cardStandardArray.filter(function(value) {
						  return value === keyStr;
					});						
				    if(filtered==0){
						//double check
						continue;
					}

					var option = document.createElement("option");
					option.setAttribute("value",key);
					option.appendChild(document.createTextNode(cardsTitle[key])); 
					selectTitle.appendChild(option);				
				}
			  }		
				changeStandardAfterChangeNumber();			  
			}
			function changeStandardForSuggest(productName){
				document.getElementById(productName).selected=true
				changeStandard();		  
			}							
			function removeTitle(){			
					document.getElementById('notuse').style.display='none';
			}				
			
			function changeStandardAfterChangeNumber(){
			  var selectPrice = document.getElementById("cardNumber"); 
			  selectPrice.style.visibility = 'visible';		
			  while (selectPrice.firstChild) {
				selectPrice.removeChild(selectPrice.firstChild);
			  }				
			  var cardTitle = document.getElementById('cardTitle').value;
			  var selectTitle = document.getElementById("cardTitle"); 			  
			  var option = document.createElement("option"); 
				  option.setAttribute("value",0);
				  option.appendChild(document.createTextNode("--選擇主題--")); 				  
				  selectTitle.appendChild(option);	
				  selectTitle.insertBefore(option,selectTitle.childNodes[0]);			 
			}
			
			function changeTitle(){	
			console.log("debug:1");
			  sortOption();console.log("debug:2");
			  //select 設定
			  var selectPrice = document.getElementById("cardNumber"); 
			  selectPrice.style.visibility = 'visible';
			  
			  selectPrice.length = 1;
			  selectPrice.options[0].selected = true;	
			  while (selectPrice.firstChild) {
				selectPrice.removeChild(selectPrice.firstChild);
			  }					  
			  
			  var cardTitle = document.getElementById('cardTitle').value;
			  			  
			  var cardTilteReplaceSpare = cardTitle.replace('/','_');
			  console.log(cardTitle+'->'+cardTilteReplaceSpare);
			  requestPrice.open('GET', requestURLCardPricebyPreCode + cardTilteReplaceSpare +'.json');
			  requestPrice.responseType = 'json';
			  requestPrice.send();				  
			  console.log("debug:3");
					  
			  console.log("debug:4");
				  requestPrice.onload = function() {

					var cards = requestPrice.response;
					  for(var key in cards){console.log("debug:6");
							if(key.indexOf('/')<0&&key.indexOf('S')==0){
										
												var option = document.createElement("option"); 
												option.setAttribute("value",key);
												option.appendChild(document.createTextNode(mappingRep[key])); 							
												selectPrice.appendChild(option);	
										console.log("debug:7");					
								}else{
									var option = document.createElement("option"); 
									option.setAttribute("value",key);
									option.appendChild(document.createTextNode(key)); 							
									selectPrice.appendChild(option);
								}					
						  }			
						 //重新排列option

						 sortOption();
						 selectPrice.options[0].selected=true;
						 changeNumber();
				}
			}
					
			
			function changeNumber(){	
				 var cardTitle = document.getElementById('cardTitle').value;
				 var cardTilteReplaceSpare = cardTitle.replace('/','_');
				console.log(cardTitle+'->'+cardTilteReplaceSpare);			 
			  document.getElementById('overlay-1').style.display='block';					
			  document.getElementById('overlay-2').style.display='block';				
			  document.getElementById('overlay-3').style.display='block';		
				requestPrice.open('GET', requestURLCardPricebyPreCode + cardTilteReplaceSpare +'.json');
				requestPrice.responseType = 'json';
				requestPrice.send();
				requestPrice.onload = function() {
				  var cards = requestPrice.response;
				  var cardNumberSelect=document.getElementById('cardNumber');
				  var selectedIndex=cardNumberSelect.selectedIndex;
				  var cardNumberDisplay=cardNumberSelect.options[selectedIndex].text;				  
				  var internalCardNumber=cardNumberSelect.options[selectedIndex].value;		
				  getCardData(cards,internalCardNumber,cardNumberDisplay);
				}
				requestStock.open('GET', requestURLCardStockbyPreCode + cardTilteReplaceSpare +'.json');
				requestStock.responseType = 'json';
				requestStock.send();
				requestStock.onload = function() {
				  var cards = requestStock.response;
				  var cardNumberSelect=document.getElementById('cardNumber');
				  var selectedIndex=cardNumberSelect.selectedIndex;
				  var cardNumberDisplay=cardNumberSelect.options[selectedIndex].text;				  
				  var internalCardNumber=cardNumberSelect.options[selectedIndex].value;		
				  getCardStockData(cards,internalCardNumber,cardNumberDisplay);
				}				
				
				
				
				
				var timer = setInterval(function(){
					if (document.getElementById('cardImg').complete){
					clearInterval(timer);
					console.log(document.getElementById('cardImg').complete)
					document.getElementById('overlay-1').style.display='none';	
					}
				}, 10);			
			}
			

			
			
			/*價格繪圖區*/
			function getCardData(jsonObj,internalCardNumber,cardNum) {
				console.log("進入繪圖區:"+cardNum);
			  addPhoto(cardNum);
			  var cardInfo = jsonObj[internalCardNumber];
				/*		
				var cardNumber;
				if(internalCardNumber.indexOf(' ')>=0){
					cardNumber=internalCardNumber.substr(0,card_Num.indexOf(' '));
				}else{
					cardNumber=internalCardNumber;
				}*/
				var cardPriceUpDate=cardInfo['upddate'];
				var cardData=cardInfo['cardPrice'];
				 console.log("cardData:"+cardData); 
				const canvas = document.getElementById('myChart');
				const ctx = canvas.getContext('2d');
				const chart = new Chart(ctx, {
					responsive: true,
					// The type of chart we want to create
					type: 'line',

					// The data for our dataset
					data: {
						labels: cardPriceUpDate,
						datasets: [{
							label: cardNum,
							//fill:false,
							borderColor: 'rgb(255, 99, 132)',
							data: cardData
						}],
					},
					// Configuration options go here
					options: {
					tooltips: {
						mode: 'index',
						intersect: false,
					},
					hover: {
						mode: 'nearest',
						intersect: true
					},						
						scales:{
							xAxes: [{
								display: true,
								scaleLabel: {
									display: true,
									labelString: '日期'
								}
							}],
							yAxes: [{
								display: true,
								scaleLabel: {
									display: true,
									labelString: '價格(日幣)'
								}
							}]
						}
					
					}
				});		

				/*listener*/				
				var cardNumberListener = document.getElementById("cardNumber");
				cardNumberListener.addEventListener("change", function(){
					chart.destroy();
				});		
				var cardTitleListener = document.getElementById("cardTitle");	
				cardTitleListener.addEventListener("change", function(){
					chart.destroy();
				});		
				document.getElementById('overlay-2').style.display='none';					
			}

			/*庫存繪圖區*/
			function getCardStockData(jsonObj,internalCardNumber,cardNum) {
			  console.log("進入庫存繪圖區:"+cardNum);
			  var cardInfo = jsonObj[internalCardNumber];
			  var cardPriceUpDate=cardInfo['upddate'];
			  var cardData=cardInfo['cardPrice'];
			  console.log("cardData:"+cardData); 
			  const canvas = document.getElementById('myStockChart');
			  const ctx = canvas.getContext('2d');
			  const stockChart = new Chart(ctx, {
					responsive: true,
					// The type of chart we want to create
					type: 'line',

					// The data for our dataset
					data: {
						labels: cardPriceUpDate,
						datasets: [{
							label: cardNum,
							//fill:false,
							borderColor: 'rgb(255, 99, 132)',
							data: cardData
						}],
					},
					// Configuration options go here
					options: {
					tooltips: {
						mode: 'index',
						intersect: false,
					},
					hover: {
						mode: 'nearest',
						intersect: true
					},						
						scales:{
							xAxes: [{
								display: true,
								scaleLabel: {
									display: true,
									labelString: '日期'
								}
							}],
							yAxes: [{
								display: true,
								scaleLabel: {
									display: true,
									labelString: '庫存'
								}
							}]
						}
					
					}
				});		

				/*listener*/				
				var cardNumberListener = document.getElementById("cardNumber");
				cardNumberListener.addEventListener("change", function(){
					stockChart.destroy();
				});		
				var cardTitleListener = document.getElementById("cardTitle");	
				cardTitleListener.addEventListener("change", function(){
					stockChart.destroy();
				});		
				document.getElementById('overlay-3').style.display='none';					
			}
			
			/*加上圖片*/
			function addPhoto(cardNumberDisplay){
				var card_Num;
				if(cardNumberDisplay.indexOf(' ')>=0){
					card_Num=cardNumberDisplay.substr(0,cardNumberDisplay.indexOf(' '));
				}else{
					card_Num=cardNumberDisplay;				
				}

				var	card_first=card_Num.replace('/','_')
				var card_second=card_Num.replace('/','_');					
				card_first=card_first.split("_")[0];
				card_second=card_second.split("_")[1]

				const cardImg = document.getElementById('cardImg');
				var urlCard="https://ws-rose.com/wordpress/wp-content/images/"+card_first.toLowerCase()+"/"+card_second.toLowerCase()+"/"+card_Num.toLowerCase()+".png";
				//var urlCard="https://i.imgur.com/DKvx5hw.png";
				console.log(urlCard);
				cardImg.setAttribute("src",urlCard);
			}
			
		/*	
		Sort Option			
		*/
        function addOption(object, object2) { 
            each(object2, function(o, index) { 
                object.options[index] = o; 
            }) 
        } 
        function sortlist(sortName,isDesc) { 
            var what = document.getElementById(sortName); 
            this._options = map(what.options, function(o) { 
                return o; 
            }); 
            this._options.sort( function(a, b) { 
                if (a.text > b.text) { 
                    return isDesc == true ? 1 : -1; 
                } else { 
                    return isDesc == true ? -1 : 1; 
                } 
            }); 
            what.options.length = 0;// clear current options 
            addOption(what, this._options); 
        } 
        function map(object, callback, thisp) { 
            var ret = []; 
            each.call(thisp, object, function() { 
                ret.push(callback.apply(thisp, arguments)); 
            }); 
            return ret; 
        } 
        function each(object, callback) { 
            if (undefined === object.length) { 
                for ( var name in object) { 
                    if (false === callback(object[name], name, object)) 
                        break; 
                } 
            } else { 
                for ( var i = 0, len = object.length; i < len; i++) { 
                    if (i in object) { 
                        if (false === callback(object[i], i, object)) 
                            break; 
                    } 
                } 
            } 
        } 
        var sOrder = true; 
        function sortOption(){         
            if(sOrder){ 
                sOrder    = false; 
            }else{ 
                sOrder    = true; 
            } 
            sortlist("cardNumber",sOrder); 
        } 	