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
source:[{id:"WS00001", name:"アイドルマスター シンデレラガールズ",cname:"偶像大師 灰姑娘女孩 | IMC"},
{id:"WS00002", name:"アニメ プリンセスコネクト！Re:Dive",cname:"超異域公主連結☆Re:Dive | PRD"},
{id:"WS00003", name:"Angel Beats!／クドわふたー",cname:"Angel Beats! | 天使的脈動／庫特wafter | AB,KW,Kab"},
{id:"WS00004", name:"角川スニーカー文庫",cname:"角川Sneaker文庫 | Snk,Sks,Sst,Ssy,Snw,Ssw,Shh,Smi,Sls,Seo,Sky,Ssk,Ssh,Shg,Sfl,Smc,Smu,Sle,Srm"},
{id:"WS00005", name:"彼女、お借りします",cname:"出租女友 | KNK"},
{id:"WS00111", name:"神様になった日",cname:"成神之日 | DBG"},
{id:"WS00006", name:"カードキャプターさくら",cname:"庫洛魔法使 | CCS"},
{id:"WS00007", name:"カードゲームしよ子",cname:"卡片遊戲SHIYO子 | CGS"},
{id:"WS00008", name:"ガールフレンド(仮)",cname:"女友伴身邊 | GF"},
{id:"WS00009", name:"Key 20th Anniversary",cname:"Key社20周年 | Kab,Kch,Kcl,Krw,Klb"},
{id:"WS00010", name:"CLANNAD",cname:"CLANNAD/小鎮家族 | CL,Kcl"},
{id:"WS00011", name:"けものフレンズ",cname:"動物朋友 | KMN"},
{id:"WS00012", name:"幻影ヲ駆ケル太陽",cname:"穿透幻影的太陽 | GT"},
{id:"WS00013", name:"この素晴らしい世界に祝福を！",cname:"為美好的世界獻上祝福！ | KS,Sks"},
{id:"WS00014", name:"ご注文はうさぎですか？？",cname:"請問您今天要來點兔子嗎？ | GU"},
{id:"WS00015", name:"五等分の花嫁",cname:"五等分的新娘 | 5HY"},
{id:"WS00016", name:"冴えない彼女の育てかた",cname:"不起眼女主角培育法 | SHS"},
{id:"WS00017", name:"Summer Pockets",cname:"夏日口袋 | SMP"},
{id:"WS00018", name:"灼眼のシャナ",cname:"灼眼的夏娜 | SS"},
{id:"WS00019", name:"Charlotte",cname:"夏洛特 | CHA,Kch"},
{id:"WS00020", name:"涼宮ハルヒの憂鬱",cname:"涼宮春日的憂鬱 | SY,Ssy"},
{id:"WS00021", name:"青春ブタ野郎シリーズ",cname:"青春豬頭少年 | SBY"},
{id:"WS00022", name:"戦姫絶唱シンフォギア",cname:"戰姬絕唱 | SG"},
{id:"WS00023", name:"ゼロの使い魔",cname:"零之使魔 | ZM"},
{id:"WS00024", name:"宇宙をかける少女／舞-HiME＆舞-乙HiME",cname:"穿越宇宙的少女／舞-HiME＆舞-乙HiME | SK,MH"},
{id:"WS00118", name:"ゾンビランドサガ リベンジ",cname:"佐賀偶像是傳奇 捲土重來 | ZLS"},
{id:"WS00025", name:"ダ・カーポ＆Dal Segno",cname:"DC | DS | 初音島 | DC,DC3,DS"},
{id:"WS00026", name:"デート・ア・ライブ",cname:"約會大作戰 | DAL,Fdl"},
{id:"WS00027", name:"とある魔術の禁書目録／とある科学の超電磁砲",cname:"魔法禁書目錄／科學超電磁砲 | ID,RG"},
{id:"WS00028", name:"To LOVEる",cname:"出包王女 | TL"},
{id:"WS00029", name:"DOG DAYS",cname:"DOG DAYS | DD"},
{id:"WS00030", name:"ニセコイ",cname:"偽戀 | NK"},
{id:"WS00031", name:"日常",cname:"日常 | NJ"},
{id:"WS00032", name:"BanG Dream!",cname:"BanG Dream! 少女樂團派對 | BD"},
{id:"WS00033", name:"ひなろじ ～from Luck ＆ Logic～",cname:"雛邏輯～from Luck & Logic～ | HLL"},
{id:"WS00034", name:"ビジュアルアーツ",cname:"Visual Art's | VA"},
{id:"WS00035", name:"ビビッドレッド・オペレーション",cname:"Vividred Operatio | 緋色戰姬 | VR"},
{id:"WS00036", name:"ViVid Strike!",cname:"ViVid Strike! | VS"},
{id:"WS00037", name:"Phantom -Requiem for the Phantom-",cname:"Phantom -Requiem for the Phantom- | PT"},
{id:"WS00038", name:"富士見ファンタジア文庫",cname:"富士見Fantasia文庫 | Fab,Foy,Fii,Fks,Fkm,Fkz,Fsl,Fsi,F35,Fos,Fdl,Fdy,Ftr,Fdd,Fhc,Ffp,Fmr,Fra"},
{id:"WS00112", name:"ホロライブプロダクション",cname:"hololive | HOLOLIVE | Hololive | HOL"},
{id:"WS00039", name:"魔法少女まどか☆マギカ",cname:"魔法少女小圓 | MM,MR"},
{id:"WS00040", name:"魔法少女リリカルなのは",cname:"魔法少女奈葉 | NS,N1,NV,NA,N2,NR,ND"},
{id:"WS00041", name:"ゆらぎ荘の幽奈さん",cname:"搖曳莊的幽奈小姐 | YYS"},
{id:"WS00042", name:"らき☆すた",cname:"幸運☆星 | LS"},
{id:"WS00043", name:"ラブライブ！",cname:"Love Live! | LL"},
{id:"WS00044", name:"ラブライブ！サンシャイン!!",cname:"Love Live! Sunshine!! | 水團 | LSS"},
{id:"WS00116", name:"ラブライブ！スーパースター!!",cname:"Love Live! Superstar!! | Love Live! 超級明星!! | 星團 | LSP"},
{id:"WS00045", name:"ラブライブ！虹ヶ咲学園スクールアイドル同好会",cname:"Love Live! 虹咲學園學園偶像同好會 | 虹團 | LNJ"},
{id:"WS00046", name:"リトルバスターズ！",cname:"Little Busters! | 校園剋星 | LB,KW,Klb"},
{id:"WS00047", name:"Rewrite",cname:"Rewrite | RW,Krw"},
{id:"WS00048", name:"ロボティクス・ノーツ",cname:"ROBOTICS;NOTES | 機械學報告 | RN"},
{id:"WS00049", name:"アイドルマスター",cname:"偶像大師 | IM,IAS"},
{id:"WS00050", name:"アイドルマスター シャイニーカラーズ",cname:"偶像大師 閃耀色彩 | ISC"},
{id:"WS00051", name:"アイドルマスター ミリオンライブ！",cname:"偶像大師 百萬人演唱會！ | IMS,IAS"},
{id:"WS00052", name:"アクセル・ワールド",cname:"加速世界 | AW"},
{id:"WS00053", name:"アサルトリリィ",cname:"突擊莉莉 | ALL"},
{id:"WS00054", name:"アニメーション映画『GODZILLA』",cname:"哥吉拉 | GZL"},
{id:"WS00055", name:"痛いのは嫌なので防御力に極振りしたいと思います。",cname:"怕痛的我，把防禦力點滿就對了 | BFR"},
{id:"WS00056", name:"うーさーのその日暮らし",cname:"兔寶的悲慘日常 | Woo"},
{id:"WS00057", name:"ヱヴァンゲリヲン新劇場版",cname:"新·福音戰士劇場版 | EV"},
{id:"WS00058", name:"おそ松さん",cname:"阿松 | OMS"},
{id:"WS00059", name:"オーバーロード",cname:"OVERLORD | OVL"},
{id:"WS00060", name:"かぐや様は告らせたい～天才たちの恋愛頭脳戦～",cname:"輝夜姬想讓人告白~天才們的戀愛頭腦戰~ | KGL"},
{id:"WS00061", name:"刀語",cname:"刀語 | KG"},
{id:"WS00062", name:"CANAAN",cname:"CANAAN | CN"},
{id:"WS00063", name:"艦隊これくしょん -艦これ-",cname:"艦隊收藏／艦娘 | KC"},
{id:"WS00064", name:"カードゲームしよ子",cname:"卡片遊戲SHIYO子 | CGS"},
{id:"WS00065", name:"キズナイーバー",cname:"制約之絆 | KI"},
{id:"WS00066", name:"境界のRINNE",cname:"境界的輪迴 | KR"},
{id:"WS00067", name:"キルラキル",cname:"KILL la KILL | KLK"},
{id:"WS00068", name:"THE KING OF FIGHTERS",cname:"格鬥天王 | KF"},
{id:"WS00069", name:"ギルティクラウン",cname:"罪惡王冠 | GC"},
{id:"WS00070", name:"クレヨンしんちゃん",cname:"蠟筆小新 | CS"},
{id:"WS00071", name:"グリザイアの果実",cname:"灰色的果實 | GRI"},
{id:"WS00072", name:"劇場版マクロスF",cname:"劇場版 Macross F 虛空歌姬 | MF"},
{id:"WS00073", name:"ゴブリンスレイヤー",cname:"哥布林殺手 | GBS"},
{id:"WS00074", name:"PSYCHO-PASS サイコパス",cname:"心靈判官 | PP"},
{id:"WS00075", name:"シャイニングシリーズ",cname:"光明與黑暗系列 | SE,SF,SR"},
{id:"WS00076", name:"STEINS;GATE",cname:"命運石之門 | STG"},
{id:"WS00077", name:"少女☆歌劇 レヴュースタァライト",cname:"少女☆歌劇 Revue Starlight | RSL"},
{id:"WS00078", name:"進撃の巨人",cname:"進撃的巨人 | AOT"},
{id:"WS00079", name:"新サクラ大戦",cname:"新櫻花大戰 | SKR"},
{id:"WS00080", name:"ジョジョの奇妙な冒険",cname:"JoJo的奇妙冒險 | JJ"},
{id:"WS00081", name:"翠星のガルガンティア",cname:"翠星上的加爾岡緹亞 | GG"},
{id:"WS00082", name:"スクールガールストライカーズ",cname:"學園少女突襲者 | Schoolgirl Strikers | SGS"},
{id:"WS00083", name:"STAR WARS",cname:"星際大戰 | SW"},
{id:"WS00084", name:"戦国BASARA",cname:"戰國BASARA | SB"},
{id:"WS00085", name:"ソードアート・オンライン",cname:"刀劍神域 | SAO | SAO"},
{id:"WS00086", name:"ソードアート・オンライン オルタナティブ ガンゲイル・オンライン",cname:"刀劍神域外傳 Gun Gale Online | GGO | GGO"},
{id:"WS00087", name:"探偵オペラ ミルキィホームズ",cname:"偵探歌劇 少女福爾摩斯 | MK,MK2"},
{id:"WS00117", name:"ダンジョンに出会いを求めるのは間違っているだろうか",cname:"ダンまち | 在地下城尋求邂逅是否搞錯了什麼 | 地錯 | 地城邂逅 | DDM"},
{id:"WS00088", name:"ダーリン・イン・ザ・フランキス",cname:"DARLING in the FRANXX | FXX"},
{id:"WS00089", name:"チェインクロニクル ～ヘクセイタスの閃～",cname:"鎖鏈戰記 ~赫克瑟塔斯之光~ | CC"},
{id:"WS00090", name:"超爆裂異次元メンコバトル ギガントシューター つかさ",cname:"超爆裂異次元Menko Battle Gigant Shooter Tsukasa | GST"},
{id:"WS00091", name:"テラフォーマーズ",cname:"Terra Formars ~火星任務~ | TF"},
{id:"WS00092", name:"TVアニメ「デビルサバイバー2」",cname:"惡魔倖存者2 | DS2"},
{id:"WS00093", name:"天元突破グレンラガン",cname:"天元突破 紅蓮螺巖 | GL"},
{id:"WS00094", name:"転生したらスライムだった件",cname:"關於我轉生變成史萊姆這檔事 | TSK"},
{id:"WS00114", name:"D_CIDE TRAUMEREI",cname:"D_CIDE TRAUMEREI | DCT"},
{id:"WS00095", name:"ノーゲーム・ノーライフ",cname:"遊戲人生 | NGL"},
{id:"WS00096", name:"初音ミク -Project DIVA-",cname:"初音未來 -名伶計畫- | PD"},
{id:"WS00097", name:"FAIRY TAIL",cname:"魔導少年 | 妖精尾巴 | FT"},
{id:"WS00098", name:"Fate",cname:"命運停駐之夜 | FS,FU,FH,FZ"},
{id:"WS00099", name:"Fate/Apocrypha",cname:"命運/外傳 | APO"},
{id:"WS00100", name:"Fate/Grand Order（アニメ）",cname:"命運/冠位指定 | FGO"},
{id:"WS00101", name:"ブラック★ロックシューター",cname:"BLACK★ROCK SHOOTER | BR"},
{id:"WS00102", name:"ぷよぷよ",cname:"魔法氣泡 | PY"},
{id:"WS00103", name:"プリズマ☆イリヤ",cname:"Fate/kaleid liner 魔法少女☆伊莉雅 | PI"},
{id:"WS00104", name:"ペルソナ",cname:"女神異聞錄Persona | P3,P4,PQ,P5"},
{id:"WS00105", name:"魔界戦記ディスガイア",cname:"魔界戰記 | DG"},
{id:"WS00115", name:"無職転生 ～異世界行ったら本気だす～",cname:"無職転生 ～異世界行ったら本気だす～ | MTI"},
{id:"WS00106", name:"MELTY BLOOD／空の境界",cname:"逝血之戰／空之境界 | MB,KK"},
{id:"WS00107", name:"〈物語〉シリーズ",cname:"《物語》系列 | BM,NM,MG"},
{id:"WS00108", name:"Re:ゼロから始める異世界生活",cname:"Re: 從零開始的異世界生活 | RZ"},
{id:"WS00109", name:"ログ・ホライズン",cname:"記錄的地平線 | LH"},
{id:"WS00110", name:"ロストディケイド",cname:"Lost Decade | LOD"},
{id:"WS00113", name:"ワールドトリガー",cname:"境界觸發者 | WTR"},
{id:"WS00119", name:"Marvel/Card Collection",cname:"漫威 | MAR"},
{id:"WS00120", name:"プロジェクトセカイ カラフルステージ！ feat. 初音ミク",cname:"世界計畫 繽紛舞台！ feat.初音未來 | PJS"},
{id:"WS00121", name:"小林さんちのメイドラゴン",cname:"小林家的龍女僕 | KMD"},
{id:"WS00122", name:"東京リベンジャーズ",cname:"東京卍復仇者 | TRV"},
{id:"WS00123", name:"PIXAR",cname:"皮克斯 | PXR"},
{id:"WS00124", name:"D4DJ",cname:"D4DJ 電音派對 | DJ"},
{id:"WS00125", name:"ヘブンバーンズレッド",cname:"HEAVEN BURNS RED | HBR, Khb"},
{id:"WS00126", name:"アズールレーン",cname:"碧藍航線 | AZL"},
{id:"WS00127", name:"チェンソーマン",cname:"鏈鋸人 | CSM"},
{id:"WS00128", name:"ありふれた職業で世界最強",cname:"平凡職業造就世界最強 | ARI"}
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
			var requestMappingURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDisplayMapping.json'
			var requestURLCardPricebyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/';
			var requestURLCardTitle = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardTitle.json';
			var standardWURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_W.json';
			var standardSURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_S.json';
			var requestStandardW = new XMLHttpRequest();
			var requestStandardS = new XMLHttpRequest();			
			var requestPrice = new XMLHttpRequest();	
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
			  requestStandardW.open('GET', standardWURL);
			  requestStandardW.responseType = 'json';
			  requestStandardW.send();				  
			  requestStandardS.open('GET', standardSURL);
			  requestStandardS.responseType = 'json';
			  requestStandardS.send();	
			  
			  requestStandardW.onload = function(){
					var optgroupW = document.getElementById("Weiss");
			  		var cardsW = requestStandardW.response;
					for(var key in cardsW){	 
						var option = document.createElement("option");
						option.setAttribute("value",cardsW[key]);
						option.setAttribute("id",key);
						option.appendChild(document.createTextNode(key)); 
						optgroupW.appendChild(option);				
					}	
			  }
			  requestStandardS.onload = function(){
					var optgroupS = document.getElementById("Schwarz");				  
			  		var cardsS = requestStandardS.response;		
					for(var key in cardsS){	 
						var option = document.createElement("option");
						option.setAttribute("value",cardsS[key]);
						option.setAttribute("id",key);	
						option.appendChild(document.createTextNode(key)); 
						optgroupS.appendChild(option);				
					}					
			  }
			  
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
				  getCardData(cards,'BD/W54-070SSP','BD/W54-070SSP');			  
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
				var timer = setInterval(function(){
					if (document.getElementById('cardImg').complete){
					clearInterval(timer);
					console.log(document.getElementById('cardImg').complete)
					document.getElementById('overlay-1').style.display='none';	
					}
				}, 10);			
			}
			

			
			
			/*繪圖區*/
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

			
			/*加上圖片*/
			function addPhoto(cardNumberDisplay){
				var card_Num;
				if(cardNumberDisplay.indexOf(' ')>=0){
					card_Num=cardNumberDisplay.substr(0,cardNumberDisplay.indexOf(' '));
				}else{
					card_Num=cardNumberDisplay;				
				}

				var card_first=card_Num.substr(0,1);
				var card_second=card_Num.substr(0,card_Num.indexOf('-'));
					card_second=card_second.replace('/','_')
				var card_third=card_Num.replace('/','_');
					card_third=card_third.replace('-','_');	
				const cardImg = document.getElementById('cardImg');
				var urlCard="https://ws-tcg.com/wordpress/wp-content/cardimages/"+card_first.toLowerCase()+"/"+card_second.toLowerCase()+"/"+card_third.toLowerCase()+".png";
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
