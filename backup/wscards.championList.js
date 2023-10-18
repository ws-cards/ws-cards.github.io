window.onload=function(){
    setTimeout(function(){
        window.scrollTo(0, 1);
    }, 100);
}
setFunOnload();  
/*自動化
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
  $.get('https://script.google.com/macros/s/AKfycbzrq2i1PslWdneSEqB3CLtGm8yA1DRzb9vIcdxLgVuYuVbvbECxVRByU6F35Zu329Ov5Q/exec',a, function(data){ //專案連結，檔案-->共用
    var d = data.split(',');
	var arr = [];
	var jsonstr='[';
    for(var i=1; i<(a.endRow-a.row+1); i++){
      arr[i] = d.splice(0, (a.endCol-a.col));
	  var cname=arr[i][0];
	  var jname=arr[i][1];
	  if (cname==undefined||jname==undefined){continue;}
		jsonstr=jsonstr+'{"name":"'+jname+'","cname":"'+cname+'"},';
    }
	
	jsonstr=jsonstr.substring(0,jsonstr.length-1);
	jsonstr=jsonstr+"]";
	console.log(jsonstr);
	var jsonO=JSON.parse(jsonstr);
	 $(".typeahead").typeahead({ 
	 source:jsonO ,
  minLength:1,
  showHintOnFocus:true,
  scrollHeight:0,
  items:'all',
        matcher: function (item) {
            var it = this.displayText(item);
			var cname=item.cname+"";
			if(cname.indexOf(this.query)>=0){
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
  });		
*/	
function setFunOnload(){
				//處理中
				/*listener*/				
				//var cardNumberListener = document.getElementById("select_time");
				var xxxx = document.getElementById("xxxx");
				//
				//cardNumberListener.addEventListener("change", function(){
				//	if (xxxx.value!=''){
				//		search(xxxx.value,'decktime');
				//	}
				//});		
				var cardTitleListener = document.getElementById("select_area");	
				cardTitleListener.addEventListener("change", function(){
					if (xxxx.value!=''){
						var cardAreaValue = cardTitleListener.value;
						var cardTitle = xxxx.value;
						if(cardAreaValue==='所有地區'){
							cardAreaValue='ALL';
						}
						search(cardTitle+"|"+"|"+cardAreaValue,'deckarea');
					}
				});	
}
var $input = $(".typeahead");
var $dropdown = $(".dropdown-menu");
$input.typeahead({
  source: [
{id:"WS00001", name:"アイドルマスター シンデレラガールズ",cname:"偶像大師 灰姑娘女孩 | IMC"},
{id:"WS00002", name:"アニメ プリンセスコネクト！Re:Dive",cname:"超異域公主連結☆Re:Dive | PRD"},
{id:"WS00003", name:"Angel Beats!／クドわふたー",cname:"Angel Beats! | 天使的脈動／庫特wafter | AB,KW,Kab"},
{id:"WS00004", name:"角川スニーカー文庫",cname:"角川Sneaker文庫 | Snk,Sks,Sst,Ssy,Snw,Ssw,Shh,Smi,Sls,Seo,Sky,Ssk,Ssh,Shg,Sfl,Smc,Smu,Sle,Srm"},
{id:"WS00005", name:"彼女、お借りします",cname:"出租女友 | KNK"},
{id:"WS00111", name:"神様になった日",cname:"成神之日 | DBG,Kdb"},
{id:"WS00006", name:"カードキャプターさくら",cname:"庫洛魔法使 | CCS"},
{id:"WS00007", name:"カードゲームしよ子",cname:"卡片遊戲SHIYO子 | CGS"},
{id:"WS00008", name:"ガールフレンド(仮)",cname:"女友伴身邊 | GF"},
{id:"WS00009", name:"Key",cname:"Key | Key社20周年 | Kab, Kai, Kch, Kcl, Kdb, Key, Khb, Kka, Klb, Krw, Ksm"},
{id:"WS00010", name:"CLANNAD",cname:"CLANNAD/小鎮家族 | CL,Kcl"},
{id:"WS00011", name:"けものフレンズ",cname:"動物朋友 | KMN"},
{id:"WS00012", name:"幻影ヲ駆ケル太陽",cname:"穿透幻影的太陽 | GT"},
{id:"WS00013", name:"この素晴らしい世界に祝福を！",cname:"為美好的世界獻上祝福！ | KS,Sks"},
{id:"WS00014", name:"ご注文はうさぎですか？？",cname:"請問您今天要來點兔子嗎？ | GU"},
{id:"WS00015", name:"五等分の花嫁",cname:"五等分的新娘 | 5HY"},
{id:"WS00016", name:"冴えない彼女の育てかた",cname:"不起眼女主角培育法 | SHS"},
{id:"WS00017", name:"Summer Pockets",cname:"夏日口袋 | SMP,Ksm"},
{id:"WS00018", name:"灼眼のシャナ",cname:"灼眼的夏娜 | SS,Gss"},
{id:"WS00019", name:"Charlotte",cname:"夏洛特 | CHA,Kch"},
{id:"WS00020", name:"涼宮ハルヒの憂鬱",cname:"涼宮春日的憂鬱 | SY,Ssy"},
{id:"WS00021", name:"青春ブタ野郎シリーズ",cname:"青春豬頭少年 | SBY,Gby"},
{id:"WS00022", name:"戦姫絶唱シンフォギア",cname:"戰姬絕唱 | SG"},
{id:"WS00023", name:"ゼロの使い魔",cname:"零之使魔 | ZM"},
{id:"WS00024", name:"宇宙をかける少女／舞-HiME＆舞-乙HiME",cname:"穿越宇宙的少女／舞-HiME＆舞-乙HiME | SK,MH"},
{id:"WS00118", name:"ゾンビランドサガ リベンジ",cname:"佐賀偶像是傳奇 捲土重來 | ZLS"},
{id:"WS00025", name:"ダ・カーポ＆Dal Segno",cname:"DC | DS | 初音島 | DC,DC3,DC4,DS,DC5"},
{id:"WS00026", name:"デート・ア・ライブ",cname:"約會大作戰 | DAL,Fdl"},
{id:"WS00027", name:"とある魔術の禁書目録／とある科学の超電磁砲",cname:"魔法禁書目錄／科學超電磁砲 | ID,RG,Gid"},
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
{id:"WS00043", name:"ラブライブ！",cname:"Love Live! | LL,LSF"},
{id:"WS00044", name:"ラブライブ！サンシャイン!!",cname:"Love Live! Sunshine!! | 水團 | LSS,LSF"},
{id:"WS00116", name:"ラブライブ！スーパースター!!",cname:"Love Live! Superstar!! | Love Live! 超級明星!! | 星團 | LSP,LSF"},
{id:"WS00045", name:"ラブライブ！虹ヶ咲学園スクールアイドル同好会",cname:"Love Live! 虹咲學園學園偶像同好會 | 虹團 | LNJ"},
{id:"WS00046", name:"リトルバスターズ！",cname:"Little Busters! | 校園剋星 | LB,KW,Klb"},
{id:"WS00047", name:"Rewrite",cname:"Rewrite | RW,Krw"},
{id:"WS00048", name:"ロボティクス・ノーツ",cname:"ROBOTICS;NOTES | 機械學報告 | RN"},
{id:"WS00049", name:"アイドルマスター",cname:"偶像大師 | IM,IAS"},
{id:"WS00050", name:"アイドルマスター シャイニーカラーズ",cname:"偶像大師 閃耀色彩 | ISC"},
{id:"WS00051", name:"アイドルマスター ミリオンライブ！",cname:"偶像大師 百萬人演唱會！ | IMS,IAS"},
{id:"WS00052", name:"アクセル・ワールド",cname:"加速世界 | AW,Gaw"},
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
{id:"WS00083", name:"STAR WARS",cname:"星際大戰 | SW,Dsw"},
{id:"WS00084", name:"戦国BASARA",cname:"戰國BASARA | SB"},
{id:"WS00085", name:"ソードアート・オンライン",cname:"刀劍神域 | SAO | SAO,Gso"},
{id:"WS00086", name:"ソードアート・オンライン オルタナティブ ガンゲイル・オンライン",cname:"刀劍神域外傳 Gun Gale Online | GGO | GGO,Ggg"},
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
{id:"WS00119", name:"Marvel/Card Collection",cname:"漫威 | MAR,Dmv"},
{id:"WS00120", name:"プロジェクトセカイ カラフルステージ！ feat. 初音ミク",cname:"世界計畫 繽紛舞台！ feat.初音未來 | PJS"},
{id:"WS00121", name:"小林さんちのメイドラゴン",cname:"小林家的龍女僕 | KMD"},
{id:"WS00122", name:"東京リベンジャーズ",cname:"東京卍復仇者 | TRV"},
{id:"WS00123", name:"PIXAR",cname:"皮克斯 | PXR,Dpx"},
{id:"WS00124", name:"D4DJ",cname:"D4DJ 電音派對 | DJ"},
{id:"WS00125", name:"ヘブンバーンズレッド",cname:"HEAVEN BURNS RED | HBR,Khb"},
{id:"WS00126", name:"アズールレーン",cname:"碧藍航線 | AZL"},
{id:"WS00127", name:"チェンソーマン",cname:"鏈鋸人 | CSM"},
{id:"WS00128", name:"ありふれた職業で世界最強",cname:"平凡職業造就世界最強 | ARI"},
{id:"WS00129", name:"Disney100",cname:"迪士尼100 | Dds,Dpx,Dmv,Dsw"},
{id:"WS00130", name:"パズル＆ドラゴンズ",cname:"龍族拼圖 | 龍拼 | PAD"},
{id:"WS00131", name:"リコリス・リコイル",cname:"Lycoris Recoil 莉可麗絲 | LRC"},
{id:"WS00132", name:"ウマ娘 プリティーダービー",cname:"賽馬娘Pretty Derby | UMA"},
{id:"WS00133", name:"SPY×FAMILY",cname:"間諜家家酒 | SPY"},
{id:"WS00134", name:"電撃文庫",cname:"電擊文庫 | G86,Gas,Gaw,Gbb,Gbc,Gbd,Gbl,Gby,Gc3,Gdc,Gdr,Gds,Gdy,Gem,Gfq,Gga,Ggh,Ggg,Ggu,Ghh,Ghm,Gid,Giy,Gkb,Gkl,Gkm,Glt,Gmf,Gmm,Gmr,Gms,Gnh,Gnm,Gns,Gny,Goi,Gok,Gom,Gos,Grk,Gsb,Gsc,Gsd,Gsk,Gso,Gsp,Gsr,Gss,Gtd,Gyf"},
{id:"WS00135", name:"幻日のヨハネ -SUNSHINE in the MIRROR-",cname:"幻日夜羽 -鏡中暉光- | YHN"},
{id:"WS00136", name:"アリス・ギア・アイギス Expansion",cname:"機戰少女Alice | AGS"},
{id:"WS00137", name:"あやかしトライアングル",cname:"妖幻三重奏 | AYT"},
{id:"WS00138", name:"【推しの子】",cname:"【我推的孩子】 | OSK"},
{id:"WS00139", name:"ぼっち・ざ・ろっく！",cname:"孤獨搖滾！ | BTR"}
  ],
  minLength:1,
  showHintOnFocus:true,
  scrollHeight:0,
  items:'all',
        matcher: function (item) {
            var it = this.displayText(item);
			var cname=item.cname+"";
			if(cname.indexOf(this.query)>=0){
				return item.name;
			}else if(cname.toLowerCase().indexOf(this.query.toLowerCase())>=0){
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
	    search();
		var buttontool=document.getElementById("button-tool");
		buttontool.style='display';
		document.getElementById("defaultArea").selected=true;
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


function appendTreeArea(){
	var deckListCard=document.getElementById('deckListCard');
	var deckListCard_div_0 = document.createElement('div');
	var deckListCard_div_1 = document.createElement('div');
	var deckListCard_i = document.createElement('i');
	var deckListCard_div_2 = document.createElement('div');
	
	deckListCard_div_0.setAttribute('class','overlay-wrapper');
	deckListCard_div_0.setAttribute('id','overlay-3');
	
	deckListCard_div_1.setAttribute('class','overlay');
	
	deckListCard_i.setAttribute('class','fas fa-3x fa-sync-alt fa-spin');
	deckListCard_div_2.setAttribute('class','text-bold pt-2');
	deckListCard_div_2.innerHTML='Loading...';
	
	
	deckListCard_div_1.appendChild(deckListCard_i);
	deckListCard_div_1.appendChild(deckListCard_div_2);	
	deckListCard_div_0.appendChild(deckListCard_div_1);
	deckListCard.appendChild(deckListCard_div_0);
}

function search(e,attri){
	var param=e;
	
	if(e===undefined){
		param='ALL';
		attri='ALL';
	}
				document.getElementById('overlay-1').style='display';
				document.getElementById('overlay-2').style='display';	

	actionKeyImage();
	removeTable();
	appendTreeArea();
  var a = {
      sheetUrl : 'https://docs.google.com/spreadsheets/d/1Nq5spFj7s6rU3CHhCfLWfk6fq__aQm_5f1hXNo7gBEk/edit?usp=sharing', //試算表連結，檔案-->共用
      sheetTag : '牌組清單',
      row: 1, //起始位置
      col: 1,
      endRow : 4000, //切段資料
      endCol : 10,//9欄
	  par : param,
	  attri: attri
  };
	  $.get('https://script.google.com/macros/s/AKfycbyqizulAuA9FgW511rrnhXUc3ImcLxlqYqvE7Wo1tYsTpNuDDIacX0iymfTsC4larv3Wg/exec',a, function(data){ //專案連結，檔案-->共用
		var d = data.split(',');
		var arr = [];
	////////
	//data attri
	////////	
		var title=document.getElementById('xxxx').value;
		var isEmpty = true;
		for(var i=1; i<(a.endRow-a.row+1); i++){
		  arr[i] = d.splice(0, (a.endCol-a.col));
		  if(arr[i].length===0){break;}
		  //if(i===1){continue;}
		  var gameTitle=arr[i][1];
		  var coreCard=arr[i][6];
		  var deckInfo=arr[i][8];

		  if(title === gameTitle){
			if(isEmpty){isEmpty=false;}
			//以下有跟沒有一樣
			if(param!='ALL'){
				//if(coreCard.indexOf(param)>=0){
				  console.log("coreCard:"+deckInfo+" + "+coreCard);
				  appendEle(arr[i]);
				//}
			}else{
				appendEle(arr[i]);
			}
		  }
		}
			if(isEmpty){		
				addEmptyImageState('deckListCard');
			}
			document.getElementById('overlay-3').style='display:none';	
	  });
	//重新load twitter widgets
	//twttr.widgets.load();	
}

function searchCard(e){
	var param=e;
	
	document.getElementById('overlay-1').style='display';
	document.getElementById('overlay-2').style='display';	

	actionKeyImage();
	removeTable();
	appendTreeArea();
  var a = {
      sheetUrl : 'https://docs.google.com/spreadsheets/d/1Nq5spFj7s6rU3CHhCfLWfk6fq__aQm_5f1hXNo7gBEk/edit?usp=sharing', //試算表連結，檔案-->共用
      sheetTag : '牌組清單',
      row: 1, //起始位置
      col: 1,
      endRow : 2000, //切段資料
      endCol : 10,//9欄
	  cardNumber : param
  };
	  $.get('https://script.google.com/macros/s/AKfycbzAaTaIHBNXOt9L2OVcr3frWkYq66YhKcD1sUSjwLIEDDFaCKJKMHs6rf-TIu6HrN_PsQ/exec',a, function(data){ //專案連結，檔案-->共用
		var d = data.split(',');
		var arr = [];
	////////
	//data attri
	////////	
		var title=document.getElementById('xxxx').value;
		var isEmpty = true;
		for(var i=1; i<(a.endRow-a.row+1); i++){
		  arr[i] = d.splice(0, (a.endCol-a.col));
		  if(arr[i].length===0){break;}
		  //if(i===1){continue;}
		  var gameTitle=arr[i][1];
		  var coreCard=arr[i][6];
		  var deckInfo=arr[i][8];

		  if(title === gameTitle){
			if(isEmpty){isEmpty=false;}
			//以下有跟沒有一樣
			if(param!='ALL'){
				//if(coreCard.indexOf(param)>=0){
				  console.log("coreCard:"+deckInfo+" + "+coreCard);
				  appendEle(arr[i]);
				//}
			}else{
				appendEle(arr[i]);
			}
		  }
		}
			if(isEmpty){		
				addEmptyImageState('deckListCard');
			}
			document.getElementById('overlay-3').style='display:none';	
	  });
	//重新load twitter widgets
	//twttr.widgets.load();	
}

function appendEle(arr){
		var deckName = arr[0];
		var deckGame = arr[1];
		var deckGameType = arr[2];
		var deckArea = arr[3];
		var deckDate = arr[4];
		var deckCore = arr[5];
		var deckKeyCard = arr[6];
		var deckDeckCode = arr[7];
		var deckInfo = arr[8];

		var deckListCard=document.getElementById('deckListCard');
		
		var div_top;
		var div0_titleH5;
		if(document.getElementById(deckCore)==null){		
			 div_top = document.createElement("div");
			 div_top.setAttribute("class","card card-outline collapsed-card");
			 div_top.setAttribute("id",deckCore);
				var div0_header = document.createElement("div");
				div0_header.setAttribute("class","card-header btn");
				div0_header.setAttribute("data-card-widget","collapse");
				div0_header.setAttribute("data-animation-speed","550");
					div0_titleH5 = document.createElement("h5");
					div0_titleH5.setAttribute("style","font-family: 'Noto Sans TC', sans-serif;");
					div0_titleH5.setAttribute("class","card-title");
					div0_titleH5.innerHTML=deckCore;
					
					var div0_header_tool = document.createElement("div");
					div0_header_tool.setAttribute("class","card-tools");
						var div0_tool_button = document.createElement("button");
						div0_tool_button.setAttribute("type","button");
						div0_tool_button.setAttribute("class","btn btn-tool");
						//div0_tool_button.setAttribute("data-card-widget","collapse");
						//div0_tool_button.setAttribute("data-animation-speed","500");
							//var div0_tool_button_i = document.createElement("i");
							//div0_tool_button_i.setAttribute("class","fas fa-plus");
							//div0_tool_button.appendChild(div0_tool_button_i);
							div0_header_tool.appendChild(div0_tool_button);
					var div0_body = document.createElement("div");
					div0_body.setAttribute("class","card-body");
					div0_body.setAttribute("id",deckCore+"_body");

		div0_header.appendChild(div0_titleH5);	
		/*trigger icon*/	
		if (deckCore.indexOf('二爆') >= 0) {
			var divtigger1 = document.createElement("img");
			divtigger1.setAttribute("src","https://images.plurk.com/Zuvv5B2cDJwwgxiJG3Kxc.png");
			divtigger1.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger1);
		}		
		if (deckCore.indexOf('開機') >= 0) { 
			var divtigger3 = document.createElement("img");
			divtigger3.setAttribute("src","https://images.plurk.com/580LLKK7yOL7Vh1VdXIK0Y.png");
			divtigger3.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger3);
		}		
		if (deckCore.indexOf('金磚') >= 0) { 
			var divtigger4 = document.createElement("img");
			divtigger4.setAttribute("src","https://images.plurk.com/1OnWi3WQVsI4gk9aWalKAz.png");
			divtigger4.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger4);
		}
		if (deckCore.indexOf('寶袋') >= 0) { 
			var divtigger9 = document.createElement("img");
			divtigger9.setAttribute("src","https://images.plurk.com/6dsBLGlLImzjpKHyTVXmvx.png");
			divtigger9.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger9);
		}		
		if (deckCore.indexOf('木門') >= 0) { 
			var divtigger5 = document.createElement("img");
			divtigger5.setAttribute("src","https://images.plurk.com/4ky8yKNphHW1BuPgXgajBr.png");
			divtigger5.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger5);
		}
		if (deckCore.indexOf('凱旋門') >= 0) { 
			var divtigger2 = document.createElement("img");
			divtigger2.setAttribute("src","https://images.plurk.com/5zMK79voAU3FmXYjO6446C.png");
			divtigger2.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger2);
		}		
		if (deckCore.indexOf('箭頭') >= 0) { 
			var divtigger6 = document.createElement("img");
			divtigger6.setAttribute("src","https://images.plurk.com/58Fd738M76mMp51WnkWtHS.png");
			divtigger6.setAttribute("class","trigger-Icon card-title"); 
			div0_header.appendChild(divtigger6);
		}
		if (deckCore.indexOf('風吹') >= 0) { 
			var divtigger7 = document.createElement("img");
			divtigger7.setAttribute("src","https://images.plurk.com/5mDSRHVLYehGOBXX2DPcMV.png");
			divtigger7.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger7);
		}
		if (deckCore.indexOf('火燒') >= 0) { 
			var divtigger8 = document.createElement("img");
			divtigger8.setAttribute("src","https://images.plurk.com/3ps1uXh7MdLBVCUejDLyYp.png");
			divtigger8.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger8);
		}
		if (deckCore.indexOf('書') >= 0) { 
			var divtigger10 = document.createElement("img");
			divtigger10.setAttribute("src","https://images.plurk.com/3i1wDS4OvGMFB5TylHH4kk.png");
			divtigger10.setAttribute("class","trigger-Icon card-title");
			div0_header.appendChild(divtigger10);
		}			
			
		//div0_header.appendChild(div0_header_tool);
		div_top.appendChild(div0_header);
		div_top.appendChild(div0_body);				
		}else{
			 div_top = document.getElementById(deckCore);
		}

			if(deckDeckCode!=''){
				deckDeckCode='https://decklog.bushiroad.com/view/'+deckDeckCode;
				deckDeckCode="<a href="+deckDeckCode+">click</a>";
			}
			/*SNS Content*/
			var deckInfoEmbed;
			if(deckInfo.indexOf('twitter')!==-1){
				deckInfoEmbed = document.createElement("div");
				deckInfoEmbed.setAttribute("id","likebox-wrapper");
				
				var deckInfoEmbediframe = document.createElement("blockquote");
				//deckInfoEmbediframe.setAttribute("id","likebox-wrapper");
				deckInfoEmbediframe.setAttribute("class","twitter-tweet");
				deckInfoEmbediframe.setAttribute("data-lang","ja");
				deckInfoEmbediframe.setAttribute("data-theme","light");
				var hrefForEmbed = document.createElement("a");
				hrefForEmbed.setAttribute("href",deckInfo);
					deckInfoEmbediframe.appendChild(hrefForEmbed);
					deckInfoEmbed.appendChild(deckInfoEmbediframe);
			}else if(deckInfo.indexOf('facebook')!==-1){
				deckInfoEmbed = document.createElement("div");
				deckInfoEmbed.setAttribute("id","likebox-wrapper");
				var deckInfoEmbediframe = document.createElement("iframe");
				var url = "https://www.facebook.com/plugins/post.php?href="+deckInfo+"&width=450&show_text=true&height=694&appId";
				deckInfoEmbediframe.setAttribute("src",url);
				deckInfoEmbediframe.setAttribute("height","694");
				deckInfoEmbediframe.setAttribute("style","border:none;overflow:hidden");
				deckInfoEmbediframe.setAttribute("scrolling","no");
				deckInfoEmbediframe.setAttribute("frameborder","0");
				deckInfoEmbediframe.setAttribute("allowfullscreen","true");
				deckInfoEmbediframe.setAttribute("allow","autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share");
				
				deckInfoEmbed.appendChild(deckInfoEmbediframe);
			}else if(deckInfo.indexOf('decklog')!==-1){
				deckInfoEmbed = document.createElement("div");
				deckInfoEmbed.setAttribute("id","likebox-wrapper");	
				var deckInfoEmbediframe = document.createElement("a");				
				var deckInfoEmbediframe_img = document.createElement("img");
				deckInfoEmbediframe.setAttribute("href",deckInfo);  //現在
				var deckCode = deckInfo.substr(35);
				deckInfoEmbediframe_img.setAttribute("src","https://decklog.bushiroad.com/deckimages/"+deckCode+".png");
				deckInfoEmbediframe_img.setAttribute("style","display: flex; max-width: 550px; width: 100%; margin-top: 10px; margin-bottom: 10px;");
				deckInfoEmbediframe.appendChild(deckInfoEmbediframe_img);
				deckInfoEmbed.appendChild(deckInfoEmbediframe);
			}
			
		var div_1 = document.createElement("div");
		div_1.setAttribute("class","card card-outline collapsed-card");
		div_1.addEventListener("click", function(){
							var snsContent=document.getElementById('snsContent');
							var modalbodybottom=document.getElementById("modal-body-bottom");
							var exampleModalLongTitle=document.getElementById("exampleModalLongTitle");
							snsContent.innerHTML="";
							modalbodybottom.innerHTML="";
							exampleModalLongTitle.innerHTML="";
							twttr.widgets.load();	
							//var snsContent=document.getElementById('snsContent');
							snsContent.appendChild(deckInfoEmbed);	
														
							$('#exampleModalCenter').modal('show');							
							
							var snsdownbutton=document.createElement('button');
							snsdownbutton.setAttribute("type","button");
							snsdownbutton.setAttribute("class","btn btn-secondary");
							snsdownbutton.setAttribute("data-dismiss","modal");
							snsdownbutton.innerHTML="Close";
							
							//var modalbodybottom=document.getElementById("modal-body-bottom");
							modalbodybottom.appendChild(snsdownbutton);
							exampleModalLongTitle.innerHTML=deckGameType;
		});			

		var div_header = document.createElement("div");
		div_header.setAttribute("class","card-header");
			var titleH5 = document.createElement("h5");
			titleH5.setAttribute("style","font-family: 'Noto Sans TC', sans-serif;");
			titleH5.setAttribute("class","card-title");
			titleH5.innerHTML=deckName+" ♕ "+deckDate+" "+deckArea+" "+deckGameType;
			var div_header_tool = document.createElement("div");
			div_header_tool.setAttribute("class","card-tools");		
				var tool_button = document.createElement("button");
				tool_button.setAttribute("data-card-widget","collapse");
				tool_button.setAttribute("data-animation-speed","500");
					
					div_header_tool.appendChild(tool_button);

			
		var div_body = document.createElement("div");
		div_body.setAttribute("class","card-body"); 		
		

		div_header.appendChild(titleH5);		
		//div_header.appendChild(div_header_tool);
		div_1.appendChild(div_header);
		div_1.appendChild(div_body);
				
		
		if(document.getElementById(deckCore)!=null){
		var d=document.getElementById(deckCore+"_body");
		d.appendChild(div_1);
		}else{
		//由於Create element時div0_body有被宣告
			div0_body.appendChild(div_1);
		}
		
		deckListCard.appendChild(div_top);
//重新load twitter widgets		
twttr.widgets.load();		
}

function removeTable(){
	var tabletree = document.getElementById('deckListCard');
	if(tabletree !=null){
		tabletree.innerHTML="";
	}
}

function actionKeyImage(){
  var coreCardImgListEle=document.getElementById('coreCardImgList');
  coreCardImgListEle.innerHTML="";



  var a = {
      sheetUrl : 'https://docs.google.com/spreadsheets/d/1Nq5spFj7s6rU3CHhCfLWfk6fq__aQm_5f1hXNo7gBEk/edit?usp=sharing', //試算表連結，檔案-->共用
      sheetTag : '核心卡片清單',
      row: 1, //起始位置
      col: 1,
      endRow : 200, //切段資料
      endCol : 3,//2欄
	  par : 'ALL',
	  attri: 'ALL'
  };
  $.get('https://script.google.com/macros/s/AKfycbxETxBnCxjVD7XKEcsKYCmNc41DRpr1Rr_FXhnzpjIuVwVWl8qGChLgkulCmDOyP4KPYg/exec',a, function(data){ //專案連結，檔案-->共用
    var d = data.split(',');
	var arr = [];
	
    var title=document.getElementById('xxxx').value;
	var isEmpty = true;
    for(var i=1; i<(a.endRow-a.row+1); i++){
      arr[i] = d.splice(0, (a.endCol-a.col));
	  if(arr[i].length===0){break;}

	  var gameTitle=arr[i][0];
	  if(title === gameTitle){
		if(arr[i][1]!=''){
			isEmpty=false;
			addImage(arr[i][1]);
		}
	  }
    }
	if(isEmpty){
		addEmptyImageState('coreCardImgList');
	}
	document.getElementById('overlay-1').style.display='none';	
	document.getElementById('overlay-2').style.display='none';	
  });
}

function reflashTwttr(){
	//重新load twitter widgets
	twttr.widgets.load();	
}
function addEmptyImageState(action){
		if(action==='coreCardImgList'){
				var coreCardImgListEle=document.getElementById('coreCardImgList');	
				var img=document.createElement("img");	
				img.setAttribute("id","cardImg");
				img.setAttribute("name","cardName_nonename");
				img.setAttribute("src","https://1.bp.blogspot.com/-0LJSR56tXL8/VVGVS2PQRsI/AAAAAAAAtkA/9EI2ZHrT5w8/s550/text_sankasya_bosyu.png");
				coreCardImgListEle.appendChild(img);
		}else if(action==='deckListCard'){
				var deckListCard=document.getElementById('deckListCard');
				var imgDiv=document.createElement("img");	
				imgDiv.setAttribute("id","cardImg");
				imgDiv.setAttribute("name","imgDivcardName_nonename");
				imgDiv.setAttribute("src","https://1.bp.blogspot.com/-0LJSR56tXL8/VVGVS2PQRsI/AAAAAAAAtkA/9EI2ZHrT5w8/s550/text_sankasya_bosyu.png");
				deckListCard.appendChild(imgDiv);	
		}
	
}

function addImage(cardNumber){
			var cardcorelist=cardNumber.split("|");
			for(var imgInit=0;imgInit<cardcorelist.length;imgInit++){
				var card_Num=cardcorelist[imgInit];
					
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
				//for 電擊文庫
				if((card_Num.toLowerCase()).indexOf('ws02')>=0){
					urlCard="https://ws-tcg.com/wordpress/wp-content/images/cardlist/g/g_ws02/"+card_third.toLowerCase()+".png";
				}
				var coreCardImgListEle=document.getElementById('coreCardImgList');	
				var img=document.createElement("img");	
				img.setAttribute("id","cardImg");		
				img.setAttribute("name","cardName_"+card_Num);
				img.setAttribute("src",urlCard);
				img.setAttribute("onclick","click_image('"+card_Num+"')");
				img.setAttribute("onmouseover","mouse_over('"+card_Num+"')");
				img.setAttribute("class","pointer");
				coreCardImgListEle.appendChild(img);				
			}
}

function click_image(e){
				//var cardNumberListener = document.getElementById("select_time");
				var xxxx = document.getElementById("xxxx");			
				var cardTitleListener = document.getElementById("select_area");	
				var cardArea = cardTitleListener.value;
				var cardTitle = xxxx.value;	
				if(cardArea==='所有地區'){
							cardArea='ALL';
				}				
	//search(cardTitle+"|"+"|"+cardArea+"|"+e,'corenumber');
	searchCard(e);
}
function mouse_over(e){
}
