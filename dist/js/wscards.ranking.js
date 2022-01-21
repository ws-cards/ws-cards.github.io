			var requestURLCardPrice = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDataAllDataAtLasted.json';		
			var requestPrice = new XMLHttpRequest();	
			var requestMappingURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDisplayMapping.json';
			var requestMapping = new XMLHttpRequest();			
			var mappingRep;
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
					var cardPrice = cardPriceInfo ['cardPrice'];
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
			    	  console.log(upArray)
				  settingUpTable(upArray);

				//取消loading
				document.getElementById('overlay1').style.display='none';	
				
			  }

			}
			function settingUpTable(upArray){
				for(var key in upArray ){
					var cardNo=upArray[key].cardNo;
					var price=upArray[key].price;
						var tr = document.createElement("tr");
						//卡號稀有度價錢幅度
						var tdCardNo = document.createElement("td");
						var tdPrice = document.createElement("td");

						if(cardNo.indexOf('/')<0&&cardNo.indexOf('S')==0){
							cardNo = mappingRep[cardNo];
						}
						tdCardNo.innerHTML = cardNo;
						tdPrice.innerHTML = price;
						
						tr.appendChild(tdCardNo);  
						tr.appendChild(tdPrice);
						upTable.appendChild(tr);	
				}					
			}
