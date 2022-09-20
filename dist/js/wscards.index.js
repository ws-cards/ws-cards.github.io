			var requestURLGoodsSchedule = 'https://ws-cards.cloud/json/friendlyLink.json';		
			var requestGoodsSchedule = new XMLHttpRequest();	
			
			function setFun(){
			  requestGoodsSchedule.open('GET', requestURLGoodsSchedule);
			  requestGoodsSchedule.responseType = 'json';
			  requestGoodsSchedule.send();	
			  var scheduleTable = document.getElementById("scheduleTable"); 
			  requestGoodsSchedule.onload = function(){
				 var goodsSchedule = requestGoodsSchedule.response;
				  for(var key in goodsSchedule){
					  var goods_date = goodsSchedule[key].date;
					  var goods_title = goodsSchedule[key].title;
					  var url = goodsSchedule[key].url;
						var tr = document.createElement("tr");
						var tdTitle = document.createElement("td");
						var tdDate = document.createElement("td");
						tdTitle.innerHTML="<p><a href='"+url+"'>"+goods_title+"</a></p>";
						//tdDate.innerHTML="<p>"+goods_date+"</p>";
						tr.appendChild(tdTitle);
						//tr.appendChild(tdDate);
						scheduleTable.appendChild(tr);
				  }
				  			  var table = $('#dataJS').DataTable({
								"searching" : false,
								"ordering": false,
								"pageLength": 10,
								 "lengthChange": false,
								  "info": false
							   });
							  
							   
				document.getElementById('overlay1').style.display='none';					  
			  }				
			}