			var requestURLCardPrice = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDataAllDataAtLasted.json';		
			var requestPrice = new XMLHttpRequest();	
			var requestMappingURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDisplayMapping.json';
			var requestMapping = new XMLHttpRequest();			
			var mappingRep;
			var requestURLCardPricebyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/';
			requestMapping.open('GET',requestMappingURL);
			requestMapping.responseType = 'json';
			requestMapping.send();	
			requestMapping.onload = function() {
			   console.log("debug:carddata");
			   mappingRep = requestMapping.response;
			}				
				
			function setFun(times){

			  //request 設定
			  requestPrice.open('GET', requestURLCardPrice);
			  requestPrice.responseType = 'json';
			  requestPrice.send();	
		
			
			  requestPrice.onload = function(){
				var cardsPrice = requestPrice.response;
				var upArray=new Array();
				var arraySetLength=times					
				for(var key in cardsPrice){	 
					var cardPriceInfo = cardsPrice[key];
					var upddate = cardPriceInfo ['upddate'];
					var cardPrice = cardPriceInfo ['cardPrice'][0];
					var displayCardNumber = cardPriceInfo ['displayCardNumber'];
					if(upArray.length<arraySetLength){
						upArray.push({cardNo:key,price:cardPrice});
					}else{
						upArray.push({cardNo:key,price:cardPrice});
						upArray.sort(function(a, b) {
						return a.price < b.price ? 1: -1;
						});
						upArray.pop();
					}
				}
				  console.log("41 line")
				  for(var key in upArray ){
				        var cardNo=upArray[key].cardNo;
				        var price=upArray[key].price;
					settingUpTable(cardNo,price);
				  }
				  

				//取消loading
				document.getElementById('overlay1').style.display='none';	
				
			  }

			}
			function settingUpTable(cardNo,price){
						var tr = document.createElement("tr");
						//卡號稀有度價錢幅度
						var tdCardNo = document.createElement("td");
						var tdPrice = document.createElement("td");

						if(cardNo.indexOf('/')<0&&cardNo.indexOf('S')==0){
							cardNo = mappingRep[cardNo];
						}
						tdCardNo.innerHTML = cardNo;
						tdCardNo.setAttribute('id',cardNo);
						console.log('setCardNo:'+cardNo);
						tdCardNo.addEventListener("click", function(){
							console.log('cardNo:'+cardNo);
							
							var card_Num=cardNo;
							if(card_Num.indexOf(' ')>=0){
								card_Num=card_Num.substr(0,card_Num.indexOf(' '));
							}else{
								card_Num=card_Num;				
							}

							var card_first=card_Num.substr(0,1);
							var card_second=card_Num.substr(0,card_Num.indexOf('-'));
								card_second=card_second.replace('/','_')
							var card_third=card_Num.replace('/','_');
								card_third=card_third.replace('-','_');								
							var urlCard="https://ws-tcg.com/wordpress/wp-content/cardimages/"+card_first.toLowerCase()+"/"+card_second.toLowerCase()+"/"+card_third.toLowerCase()+".png";				
						
							var cardImg=document.getElementById('cardImg');
							cardImg.setAttribute("src",urlCard);
							var cardShowNumber=document.getElementById('exampleModalLongTitle');
							cardShowNumber.innerHTML=card_Num;
							 changeNumber(card_second,card_Num,card_Num);
							$('#exampleModalCenter').modal('show');								
						  });						
						tdPrice.innerHTML = price;
						
						tr.appendChild(tdCardNo);  
						tr.appendChild(tdPrice);
						upTable.appendChild(tr);	
				}	
			/*step1.實體區 */			
			function changeNumber(card_second,internalCardNumber,cardNumberDisplay){	
				 var cardTilteReplaceSpare =card_second.toUpperCase();
			  console.log('pre ->'+cardTilteReplaceSpare);			 				
				requestPrice.open('GET', requestURLCardPricebyPreCode + cardTilteReplaceSpare +'.json');
				requestPrice.responseType = 'json';
				requestPrice.send();
				requestPrice.onload = function() {
				  var cards = requestPrice.response;	
				  getCardData(cards,internalCardNumber,cardNumberDisplay);
				}		
			}
			/*step2.繪圖區*/
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
