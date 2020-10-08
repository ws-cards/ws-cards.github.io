			window.onload=function(){
			  setFun();  
			}

			var requestURLCardPrice = 'https://ws-cards.cloud/cardData.json';
			var requestURLCardTitle = 'https://ws-cards.cloud/cardTitle.json';
			var requestPrice = new XMLHttpRequest();	
			var requestTitle = new XMLHttpRequest();	

			
			function setFun(){
			  //select 設定
			  var selectPrice = document.getElementById("cardNumber"); 
			  selectPrice.length = 1;
			  selectPrice.options[0].selected = true;	
			  selectPrice.style.visibility = 'hidden';

			  var selectTitle = document.getElementById("cardTitle"); 
			  selectPrice.length = 1;
			  selectPrice.options[0].selected = true;	
			  
			  //request 設定
			  requestPrice.open('GET', requestURLCardPrice);
			  requestPrice.responseType = 'json';
			  requestPrice.send();	
			
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
				  getCardData(cards,'BD/W54-070SSP');			  
			  }

			}
			
			function changeTitle(){
			  sortOption();
			  //select 設定
			  var selectPrice = document.getElementById("cardNumber"); 
			  selectPrice.style.visibility = 'visible';
			  
			  selectPrice.length = 1;
			  selectPrice.options[0].selected = true;	
			  selectPrice.options[0].setAttribute("id","oldID");
			  selectPrice.removeChild(document.getElementById('oldID'));
			  
			  
			  var cardTitle = document.getElementById('cardTitle').value;
			  
			  requestPrice.open('GET', requestURLCardPrice);
			  requestPrice.responseType = 'json';
			  requestPrice.send();				  
			  requestPrice.onload = function() {
			  			  console.log(cardTitle);
				var cards = requestPrice.response;
				  for(var key in cards){
				  console.log();
					if(key.indexOf(cardTitle)>= 0){
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
				requestPrice.open('GET', requestURLCardPrice);
				requestPrice.responseType = 'json';
				requestPrice.send();
				requestPrice.onload = function() {
				  var cards = requestPrice.response;
				  var cardNumber = document.getElementById('cardNumber').value;
				  getCardData(cards,cardNumber)
				}
			}
			

			
			
			/*繪圖區*/
			function getCardData(jsonObj,cardNum) {
			  addPhoto(cardNum);
			  var cardInfo = jsonObj[cardNum];
						
				var cardNumber=cardNum;
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
							label: cardNumber,
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
			}

			
			/*加上圖片*/
			function addPhoto(cardNum){
				var card_first=cardNum.substr(0,1);
				var card_second=cardNum.substr(0,cardNum.indexOf('-'));
					card_second=card_second.replace('/','_')
				var card_third=cardNum.replace('/','_');
					card_third=card_third.replace('-','_');	
				const cardImg = document.getElementById('cardImg');
				var urlCard="https://s3-ap-northeast-1.amazonaws.com/static.ws-tcg.com/wordpress/wp-content/cardimages/"+card_first.toLowerCase()+"/"+card_second.toLowerCase()+"/"+card_third.toLowerCase()+".png";
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
