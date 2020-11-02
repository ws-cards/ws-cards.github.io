			var requestURLCardPrice = 'https://storage.googleapis.com/ws-cards.cloud/json/cardData.json';		
			var requestPrice = new XMLHttpRequest();	

			function setFun(times){
			  //select 設定
			  var upTable = document.getElementById("upTable"); 
			  var downTable = document.getElementById("downTable"); 
			  //request 設定
			  requestPrice.open('GET', requestURLCardPrice);
			  requestPrice.responseType = 'json';
			  requestPrice.send();	
		
			
			  requestPrice.onload = function(){
				var cardsPrice = requestPrice.response;
				var upArray=new Array();
				var downArray=new Array();
				var arraySetLength=times					
				for(var key in cardsPrice){	 
					var cardPriceInfo = cardsPrice[key];
					var cardPrice = cardPriceInfo ['cardPrice'];
					
					var firstDatePrice;
					var lastDatePrice;
					var spread;

					if(cardPrice.length>7){
						firstDatePrice = cardPrice [cardPrice.length-7];//七天第一天
						lastDatePrice = cardPrice[cardPrice.length-1];					
					}else{
						firstDatePrice = cardPrice [0];//七天第一天
						lastDatePrice = cardPrice[cardPrice.length-1];							
					}
					spread=Math.round((((lastDatePrice-firstDatePrice)/firstDatePrice)*100)*100)/100;		
					
					if(upArray.length<arraySetLength&&downArray.length<arraySetLength){				
						upArray.push({cardSpread:spread,cardNo:key,price:lastDatePrice});
						downArray.push({cardSpread:spread,cardNo:key,price:lastDatePrice});
					}else{
						if(spread>0){
							upArray.push({cardSpread:spread,cardNo:key,price:lastDatePrice});
							upArray.sort(function(a, b) {
								return a.cardSpread < b.cardSpread ? 1: -1;
							});
							upArray.pop();					
						}else{
							downArray.push({cardSpread:spread,cardNo:key,price:lastDatePrice});
							downArray.sort(function(a, b) {
								return a.cardSpread > b.cardSpread ? 1: -1;
							});
							downArray.pop();						
						}
					}
				}
				settingUpTable(upArray);
				settingDownTable(downArray);
				//取消loading
				document.getElementById('overlay1').style.display='none';	
				document.getElementById('overlay2').style.display='none';					
			  }

			}
			function settingUpTable(upArray){
				for(var key in upArray ){
					var cardNo=upArray[key].cardNo;
					var spread=upArray[key].cardSpread;
					var price=upArray[key].price;
						var tr = document.createElement("tr");
						//卡號稀有度價錢幅度
						var tdCardNo = document.createElement("td");
						var tdRare = document.createElement("td");
						var tdPrice = document.createElement("td");
						var tdRange = document.createElement("td");
						tdCardNo.innerHTML = cardNo;
						tdRare.innerHTML = "X";
						tdPrice.innerHTML = price;
						tdRange.innerHTML = "<small class='text-success mr-1' style='font-family: 'Noto Sans TC', sans-serif;font-size:10px;'><i class='fas fa-arrow-up' ></i>"+spread+"%</small>";
						tr.appendChild(tdCardNo); 
						tr.appendChild(tdRare); 
						tr.appendChild(tdPrice); 
						tr.appendChild(tdRange); 
						upTable.appendChild(tr);	
				}					
			}
			function settingDownTable(downArray){
				for(var key in downArray ){
					var cardNo=downArray[key].cardNo;
					var spread=downArray[key].cardSpread;
					var price=downArray[key].price;					
						var tr = document.createElement("tr");
						//卡號稀有度價錢幅度
						var tdCardNo = document.createElement("td");
						var tdRare = document.createElement("td");
						var tdPrice = document.createElement("td");
						var tdRange = document.createElement("td");
						tdCardNo.innerHTML = cardNo;
						tdRare.innerHTML = "X";
						tdPrice.innerHTML = price;
						tdRange.innerHTML = "<small class='text-warning mr-1' style='font-family: 'Noto Sans TC', sans-serif;font-size:10px;'><i class='fas fa-arrow-down' ></i>"+spread+"%</small>";
						tr.appendChild(tdCardNo); 
						tr.appendChild(tdRare); 
						tr.appendChild(tdPrice); 
						tr.appendChild(tdRange); 
						downTable.appendChild(tr);	
				}					
			}