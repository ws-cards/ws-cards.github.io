			//memo:如果漲幅的資料量小於設定，最後的array不會排列
			var requestURLCardPrice = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/report/yuyuPriceIncreaseReport.json';		
			var requestPrice = new XMLHttpRequest();	
			var requestMappingURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDisplayMapping.json';
			var requestMapping = new XMLHttpRequest();			
			var mappingRep;
			var requestURLCardPricebyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/';
			requestMapping.open('GET',requestMappingURL);
			requestMapping.responseType = 'json';
			requestMapping.send();	
			requestMapping.onload = function() {
			   console.log("debug:5");
			   mappingRep = requestMapping.response;
			}				
				
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
				
				let upMap = new Map();
				let downMap = new Map();
				let newUpMap = new Map();
				let newDownMap = new Map();
				var upArray=new Array();
				var downArray=new Array();
				
				let updownMap = new Map();
				var arraySetLength=times					
				for(var key in cardsPrice){	 
					var cardPriceInfo = cardsPrice[key];
					var cardPriceMax = cardPriceInfo ['today'];
					var cardPriceMin = cardPriceInfo ['prePrice'];
					var statute = cardPriceInfo ['statute'];
					var updateDate = cardPriceInfo ['updateDate'];
					var firstDatePrice;
					var lastDatePrice;
					var spread;
					//塞入日期
					
						document.getElementById("upperH5").innerHTML="漲幅最大排行 更新時間("+updateDate+")";

					
						document.getElementById("downerH5").innerHTML="跌幅最大排行 更新時間("+updateDate+")";
					
                                        //沒有特別意義的交換，但是後面的變數要改
					if("upper" === statute){
						firstDatePrice =cardPriceMin;
						lastDatePrice = cardPriceMax;					
					}else{
						firstDatePrice = cardPriceMax;
						lastDatePrice = cardPriceMin ;	
					}
					spread=Math.round((((lastDatePrice-firstDatePrice)/firstDatePrice)*100)*100)/100;		
					
					if("upper" === statute){
						upMap.set(key,spread);					
						updownMap.set(key,lastDatePrice);
					}else if("downer" === statute){//console.log("連續進入:"+key+":"+firstDatePrice+":"+spread);
						downMap.set(key,spread);
						updownMap.set(key,lastDatePrice);
					}
					
					newUpMap = Array.from(upMap).sort((a, b) => b[1] - a[1]);
					newDownMap = Array.from(downMap).sort((c, d) => d[1] - c[1]);
								
					
				}
				
				for (let [key, value] of newUpMap) {
					var cardNo=key;
					var spread=value;
					var price=updownMap.get(key);		
					settingUpTable(cardNo,spread,price);
				}
				
				for (let [key, value] of newDownMap) {
					var cardNo=key;
					var spread=value;
					var price=updownMap.get(key);					
					settingDownTable(cardNo,spread,price);
				}
				
				
				//取消loading
				document.getElementById('overlay1').style.display='none';	
				document.getElementById('overlay2').style.display='none';					
			  }

			}

			function settingUpTable(cardNo,spread,price){
						var tr = document.createElement("tr");
						//卡號稀有度價錢幅度
						var tdCardNo = document.createElement("td");
						var tdPrice = document.createElement("td");
						var tdRange = document.createElement("td");
						if(cardNo.indexOf('/')<0&&cardNo.indexOf('S')==0){
							cardNo = mappingRep[cardNo];
						}
						tdCardNo.innerHTML = cardNo;
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
						tdRange.innerHTML = "<small class='text-success mr-1' style='font-family: 'Noto Sans TC', sans-serif;font-size:10px;'><i class='fas fa-arrow-up' ></i>"+spread+"%</small>";

						tr.appendChild(tdCardNo);  
						tr.appendChild(tdPrice); 
						tr.appendChild(tdRange); 
						upTable.appendChild(tr);									
			}

			function settingDownTable(cardNo,spread,price){
						var tr = document.createElement("tr");
						//卡號稀有度價錢幅度
						var tdCardNo = document.createElement("td");
						var tdPrice = document.createElement("td");
						var tdRange = document.createElement("td");
						if(cardNo.indexOf('/')<0&&cardNo.indexOf('S')==0){
							cardNo = mappingRep[cardNo];
						}
						tdCardNo.innerHTML = cardNo;
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
						tdRange.innerHTML = "<small class='text-warning mr-1' style='font-family: 'Noto Sans TC', sans-serif;font-size:10px;'><i class='fas fa-arrow-down' ></i>"+spread+"%</small>";
						tr.appendChild(tdCardNo); 
						tr.appendChild(tdPrice); 
						tr.appendChild(tdRange); 
						downTable.appendChild(tr);				
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
				$('#exampleModalCenter').on('hidden.bs.modal', function (e) {
				 	chart.destroy();
				})
			}
