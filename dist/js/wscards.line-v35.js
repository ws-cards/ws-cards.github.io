	window.onload=function(){
		setTimeout(function(){
			window.scrollTo(0, 1);
		}, 100);		
			  setFun();  
	}
var $input = $(".typeahead");
var $dropdown = $(".dropdown-menu");

// 全域圖表變數 - 用於正確的圖表銷毀管理
var myChart = null;
var myStockChart = null;

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
{id:"WS00001", name:"アイドルマスター シンデレラガールズ",cname:"偶像大師 灰姑娘女孩 | IMC"},
{id:"WS00002", name:"アニメ プリンセスコネクト！Re:Dive",cname:"超異域公主連結☆Re:Dive | PRD"},
{id:"WS00003", name:"Angel Beats!／クドわふたー",cname:"Angel Beats! | 天使的脈動／庫特wafter | AB,KW,Kab"},
{id:"WS00004", name:"角川スニーカー文庫",cname:"角川Sneaker文庫 | Snk,Sks,Sst,Ssy,Snw,Ssw,Shh,Smi,Sls,Seo,Sky,Ssk,Ssh,Shg,Sfl,Smc,Smu,Sle,Srm,Sak,Sbm,Scn,Sde,Sdy,Shm,Sme,Soa,Soj,Srd,Ssc,Ssn,Stk,Stm"},
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
{id:"WS00040", name:"魔法少女リリカルなのは",cname:"魔法少女奈葉 | NS,N1,NV,NA,N2,NR,ND,NTA"},
{id:"WS00041", name:"ゆらぎ荘の幽奈さん",cname:"搖曳莊的幽奈小姐 | YYS"},
{id:"WS00042", name:"らき☆すた",cname:"幸運☆星 | LS"},
{id:"WS00043", name:"ラブライブ！",cname:"Love Live! | LL,SIL,LSF"},
{id:"WS00044", name:"ラブライブ！サンシャイン!!",cname:"Love Live! Sunshine!! | 水團 | LSS,SIS,LSF"},
{id:"WS00116", name:"ラブライブ！スーパースター!!",cname:"Love Live! Superstar!! | Love Live! 超級明星!! | 星團 | LSP,SIP,LSF"},
{id:"WS00045", name:"ラブライブ！虹ヶ咲学園スクールアイドル同好会",cname:"Love Live! 虹咲學園學園偶像同好會 | 虹團 | LNJ,SIN,LSF"},
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
{id:"WS00072", name:"マクロスシリーズ",cname:"超時空要塞系列 | Macross | 虛空歌姬 | MF,MDE"},
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
{id:"WS00123", name:"PIXAR",cname:"皮克斯 | PXR,Dpx,MRp"},
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
{id:"WS00139", name:"ぼっち・ざ・ろっく！",cname:"孤獨搖滾！ | BTR"},
{id:"WS00140", name:"葬送のフリーレン",cname:"葬送的芙莉蓮 | SFN"}	,
{id:"WS00141", name:"ラブライブ！スクールアイドルフェスティバル2",cname:"Love Live! 學園偶像祭2 Miracle Live! | SIL,SIS,SIN,SIP,LSF"},
{id:"WS00142", name:"リアセカイ",cname:"Rear Sekai 背面世界 | RSK"},
{id:"WS00143", name:"ブルーアーカイブ",cname:"蔚藍檔案 Blue Archive | BAV"},
{id:"WS00144", name:"『ゆるキャン△ SEASON３』",cname:"搖曳露營△ | YRC"},
{id:"WS00145", name:"『キャプテン翼』",cname:"足球小將翼 | CTB"},
{id:"WS00146", name:"るろうに剣心 －明治剣客浪漫譚－",cname:"神劍闖江湖 | RKN"},
{id:"WS00147", name:"勝利の女神：NIKKE",cname:"勝利女神：妮姬 | NIK"},
{id:"WS00148", name:"TVアニメ『ダンダダン』",cname:"膽大黨 DAN DA DAN | DDD"},
{id:"WS00149", name:"ガールズバンドクライ",cname:"Girls Band Cry 少女樂團 吶喊吧 少哭 少女樂團哭 | GCR"},
{id:"WS00150", name:"ラブライブ！蓮ノ空女学院スクールアイドルクラブ feat. Link！Like！ラブライブ！",cname:"蓮之空女學院學園偶像俱樂部 | LHS"},
{id:"WS00151", name:"甘神さんちの縁結び",cname:"結緣甘神神社 | AMG"},
{id:"WS00152", name:"学園アイドルマスター",cname:"學園偶像大師 | 學偶 | GIM"},
{id:"WS00153", name:"あおぎり高校",cname:"青桐高中 | AOH"},
{id:"WS00154", name:"負けヒロインが多すぎる！",cname:"敗北女角太多了！ | MKI"},
{id:"WS00155", name:"怪獣８号",cname:"怪獸8號 | 怪8 | KJ8"}	,
{id:"WS00156", name:"きんいろモザイク",cname:"黃金拼圖 | KMS"},
{id:"WS00157", name:"『テイルズ オブ』シリーズ",cname:"傳奇系列 | TAL"},
{id:"WS00158", name:"Disney",cname:"Disney | 迪士尼 | Dds,MRd"},
{id:"WS00159", name:"ミラー・ウォリアーズ",cname:"迪士尼鏡像宇宙 | Disney Mirrorverse | MRd,MRp"}
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
	
// 處理 typeahead 選擇和卡號直接輸入的函數
function handleInputChange() {
  var current = $input.typeahead("getActive");
  var inputValue = $input.val().trim();
  
  console.log('Input change detected(inputValue):', inputValue);
  console.log('current:',current);

  if (current) {
    // Some item from your model is active!
    if (current.name == inputValue) {
      console.log('Typeahead item selected:', current.name);
      changeStandardForSuggest(current.name);
      //when you chose item
    } else {
        console.log('Partial match detected->check number');
	    if (inputValue && isCardNumberFormat(inputValue)) {
	      console.log('檢測到卡號格式，嘗試直接搜尋:', inputValue);
	      searchByCardNumber(inputValue);
	    }		
    }
  } else {
    // Nothing is active so it is a new value (or maybe empty value)
    // 檢查是否為卡號格式 (例如: PRD/W01-001)
    if (inputValue && isCardNumberFormat(inputValue)) {
      console.log('檢測到卡號格式，嘗試直接搜尋:', inputValue);
      searchByCardNumber(inputValue);
    }
  }
}

// 監聽 change 事件 (失去焦點時觸發)
$input.change(handleInputChange);

// 監聽 input 事件 (即時輸入時觸發) - 但只處理卡號格式(此段看會不會影響操作)
// 及時輸入查詢
$input.on('input', function() {
  var inputValue = $input.val().trim();
  // 只在輸入看起來像完整卡號時才即時處理
  if (inputValue && inputValue.length >= 8 && isCardNumberFormat(inputValue)) {
    console.log('即時檢測到完整卡號格式:', inputValue);
    setTimeout(function() {
      // 延遲一點點執行，避免干擾 typeahead
      if ($input.val().trim() === inputValue) {
        searchByCardNumber(inputValue);
      }
    }, 500);
  }
});

/**
 * 檢查輸入是否符合卡號格式
 * @param {string} input - 輸入的字串
 * @returns {boolean} - 是否為卡號格式
 */
function isCardNumberFormat(input) {
  // 卡號格式通常為: XXX/XXX-XXX 或類似的組合
  // 例如: PRD/W01-001, BD/W54-070SSP, SAO/S26-001, MRd/S111-033
  var cardNumberPattern = /^[A-Za-z0-9]+(?:\/[A-Za-z0-9]+)?-[A-Za-z0-9]+[A-Za-z]*$/i;
  var result = cardNumberPattern.test(input);
  console.log('卡號格式檢查:', input, '結果:', result);
  return result;
}

/**
 * 根據卡號直接搜尋並設置選擇器
 * @param {string} cardNumber - 完整的卡號
 */
function searchByCardNumber(cardNumber) {
  try {
    console.log('開始解析卡號:', cardNumber);
    
    // 顯示搜尋提示
    showSearchNotification('正在搜尋卡號: ' + cardNumber);
    
    // 拆解卡號
    var cardParts = parseCardNumber(cardNumber);
    if (!cardParts) {
      console.warn('無法解析卡號格式:', cardNumber);
      showSearchNotification('卡號格式不正確: ' + cardNumber, 'error');
      return;
    }
    
    console.log('卡號解析結果:', cardParts);
    
    // 根據解析結果設置選擇器
    setSelectorsFromCardParts(cardParts);
    
  } catch (error) {
    console.error('搜尋卡號時發生錯誤:', error);
    showSearchNotification('搜尋失敗: ' + error.message, 'error');
  }
}

/**
 * 顯示搜尋通知
 * @param {string} message - 通知訊息
 * @param {string} type - 通知類型 ('info', 'success', 'error')
 */
function showSearchNotification(message, type = 'info') {
  console.log('[搜尋通知]', message);
  
  // 如果有 SweetAlert2，使用它來顯示通知
  if (typeof Swal !== 'undefined') {
    var icon = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
    Swal.fire({
      icon: icon,
      title: type === 'error' ? '搜尋失敗' : '搜尋中',
      text: message,
      timer: type === 'error' ? 3000 : 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }
}

/**
 * 解析卡號各部分
 * @param {string} cardNumber - 完整卡號 (例如: PRD/W01-001)
 * @returns {object|null} - 解析結果
 */
function parseCardNumber(cardNumber) {
  // 卡號格式: PREFIX/SET-NUMBER or SET-NUMBER
  // 例如: PRD/W01-001, W103-002 (由於W103一定沒在系列裡面所以會跟原本寫法拋出的結果一樣)
  var parts = cardNumber.match(/^([A-Z0-9]+)(?:\/([A-Z0-9]+))?-([A-Z0-9]+[A-Z]*)$/i);
  
  if (!parts) {
    return null;
  }else{
    const hasSlash = !!parts[2];
    return {
        prefix: parts[1],           // 例如: PRD or W103
        series: hasSlash ? parts[1] + '/' + parts[2] : parts[1], //例如:PRD/W01  or  W103
        suffix: (parts[2] || parts[1]) + '-' + parts[3], //例如:W01-001 or W103-001
        fullNumber: cardNumber      //例如: PRD/W01-001 or W103-001
    };
 }
}

/**
 * 根據卡號部分設置各個選擇器
 * @param {object} cardParts - 解析後的卡號部分
 */
async function setSelectorsFromCardParts(cardParts) {
  try {
    // 1. 首先找到並設置 cardStandard
    showSearchNotification('正在搜尋作品: ' + cardParts.prefix);
    var standardFound = await findAndSetCardStandard(cardParts.prefix);
    if (!standardFound) {
	  if(cardParts.prefix !== cardParts.series){
		//W103-001 這類的就不會進來
		console.warn('找不到對應的作品標準:', cardParts.prefix);
		showSearchNotification('找不到對應的作品: ' + cardParts.prefix, 'error');
		return;
	  }
    }
    reGenTitle();
    // 等待 cardTitle 選項載入完成
    showSearchNotification('正在載入主題選項...');
    await waitForTitleOptionsLoaded();
    
    // 2. 設置 cardTitle
    showSearchNotification('正在搜尋主題: ' + cardParts.series);
    var titleFound = await findAndSetCardTitle(cardParts.series);
    if (!titleFound) {
		if(cardParts.prefix !== cardParts.series){
			console.warn('找不到對應的主題:', cardParts.series);
			showSearchNotification('找不到對應的主題: ' + cardParts.series, 'error');
			return;
		}
    }

	if(titleFound){
	    // 等待 cardNumber 選項載入完成
		showSearchNotification('正在載入卡號選項...');
		await waitForNumberOptionsLoaded();

		// 3. 設置 cardNumber
		showSearchNotification('正在搜尋卡號: ' + cardParts.fullNumber);
		var numberFound = await findAndSetCardNumber(cardParts.fullNumber);
		if (!numberFound) {
		console.warn('找不到對應的卡號:', cardParts.fullNumber);
		showSearchNotification('找不到對應的卡號: ' + cardParts.fullNumber, 'error');
		return;
		}
	}else{
		// 2.5 設置 cardSuffix (主要工作將卡號清單找出並展出)
		showSearchNotification('正在搜尋後綴: ' + cardParts.suffix);
		var suffixFound = await findAndSetCardSuffix(cardParts.prefix,cardParts.suffix);
		if (!suffixFound) {
			console.warn('後綴找不到對應的卡號:', cardParts.suffix);
			showSearchNotification('找不到對應的卡號: ' + cardParts.suffix, 'error');
			return;
		}

		// 3. 根據設置 cardNumber (這邊的fullNumber應該是等同於suffix)
		showSearchNotification('正在搜尋卡號: ' + cardParts.fullNumber);
		var numberFound = await findAndSetCardNumberBySuffix(cardParts.fullNumber);
		if (!numberFound) {
			console.warn('找不到對應的卡號:', cardParts.fullNumber);
			showSearchNotification('找不到對應的卡號: ' + cardParts.fullNumber, 'error');
			return;
		}
	}

    console.log('✓ 卡號搜尋完成:', cardParts.fullNumber);
    showSearchNotification('搜尋成功！已找到卡號: ' + cardParts.fullNumber, 'success');
 
    // 搜尋成功後平滑滾動到結果區域
    setTimeout(() => {
        scrollToResults();
    }, 200); // 延遲一秒讓圖表載入完成	

  } catch (error) {
    console.error('設置選擇器時發生錯誤:', error);
    showSearchNotification('設置選擇器時發生錯誤: ' + error.message, 'error');
  }
}  
			var requestURLCardPrice = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/BD_W54.json';
			var requestURLCardStock = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/stockJson/BD_W54.json';
			var requestMappingURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDisplayMapping.json'
			var requestURLCardPricebyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/';
			var requestURLCardStockbyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/stockJson/';
			var requestURLCardTitle = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardTitle.json';
			var standardWURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_W.json';
			var standardSURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_S.json';
			var requestStandardW = new XMLHttpRequest();
			var requestStandardS = new XMLHttpRequest();			
			var requestPrice = new XMLHttpRequest();	
			var requestStock = new XMLHttpRequest();
			var requestTitle = new XMLHttpRequest();	
			var requestMapping = new XMLHttpRequest();
			var mappingRep;
			  requestMapping.open('GET',requestMappingURL);
			  requestMapping.responseType = 'json';
			  requestMapping.send();	
			  requestMapping.onload = function() {
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
			
			async function checkTitleOfCardNumberList(suffix){	
			  console.log("checkTitleOfCardNumberList");

				return new Promise((resolve) => {
					var cardTitle = document.getElementById('cardTitle').value;
					var cardTilteReplaceSpare = cardTitle.replace('/','_');
					console.log(cardTitle+'->'+cardTilteReplaceSpare);
					
					requestPrice.open('GET', requestURLCardPricebyPreCode + cardTilteReplaceSpare +'.json');
					requestPrice.responseType = 'json';
					requestPrice.send();				  
					
					requestPrice.onload = function() {
					var cards = requestPrice.response;
					var found = false;
					
					for(var key in cards){
						//console.log("checkTitleOfCardNumberList - key:"+key);
						
						if(key.indexOf('/')<0 && key.indexOf('S')==0){
							var cardNumberDisplay = mappingRep[key];
							if(cardNumberDisplay && cardNumberDisplay.includes(suffix)){
								found = true;
								break;
							}
						} else {
							if(key.toLowerCase().includes(suffix.toLowerCase())){
								found = true;
								break;
							}
						}					
					}
					
					console.log("checkTitleOfCardNumberList result:", found);
					resolve(found);
					};
					
					requestPrice.onerror = function() {
					console.error("checkTitleOfCardNumberList request failed");
					resolve(false);
					};
				});
			}

			function changeTitle(){				
			// 先銷毀現有圖表
			destroyAllCharts();
			
			  sortOption();
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
				
				// 先銷毀現有圖表
				destroyAllCharts();
				
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
				
				// 1. 先銷毀現有的價格圖表
				if (myChart) {
					console.log('銷毀現有的價格圖表');
					try {
						myChart.destroy();
					} catch (error) {
						console.error('銷毀價格圖表時發生錯誤:', error);
					}
					myChart = null;
				}
				
				addPhoto(cardNum);
				var cardInfo = jsonObj[internalCardNumber];
				var cardPriceUpDate=cardInfo['upddate'];
				var cardData=cardInfo['cardPrice'];
				
				// 2. 清理並重新獲取 canvas 元素
				const canvas = document.getElementById('myChart');
				if (canvas) {
					// 清理 canvas 的事件監聽器和上下文
					const newCanvas = canvas.cloneNode(true);
					canvas.parentNode.replaceChild(newCanvas, canvas);
				}
				
				// 3. 重新獲取清理後的 canvas
				const cleanCanvas = document.getElementById('myChart');
				const ctx = cleanCanvas.getContext('2d');
				
				// 4. 創建新的圖表實例
				myChart = new Chart(ctx, {
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
							backgroundColor: 'rgba(255, 99, 132, 0.1)',
							data: cardData,
							tension: 0.1
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

				console.log('價格圖表創建完成');
				document.getElementById('overlay-2').style.display='none';					
			}

			/*庫存繪圖區*/
			function getCardStockData(jsonObj,internalCardNumber,cardNum) {
				console.log("進入庫存繪圖區:"+cardNum);
				
				// 1. 先銷毀現有的庫存圖表
				if (myStockChart) {
					console.log('銷毀現有的庫存圖表');
					try {
						myStockChart.destroy();
					} catch (error) {
						console.error('銷毀庫存圖表時發生錯誤:', error);
					}
					myStockChart = null;
				}
				
				var cardInfo = jsonObj[internalCardNumber];
				var cardPriceUpDate=cardInfo['upddate'];
				var cardData=cardInfo['cardPrice'];
				
				// 2. 清理並重新獲取 canvas 元素
				const canvas = document.getElementById('myStockChart');
				if (canvas) {
					// 清理 canvas 的事件監聽器和上下文
					const newCanvas = canvas.cloneNode(true);
					canvas.parentNode.replaceChild(newCanvas, canvas);
				}
				
				// 3. 重新獲取清理後的 canvas
				const cleanCanvas = document.getElementById('myStockChart');
				const ctx = cleanCanvas.getContext('2d');
				
				// 4. 創建新的圖表實例
				myStockChart = new Chart(ctx, {
					responsive: true,
					// The type of chart we want to create
					type: 'line',

					// The data for our dataset
					data: {
						labels: cardPriceUpDate,
						datasets: [{
							label: cardNum,
							//fill:false,
							borderColor: 'rgb(54, 162, 235)',
							backgroundColor: 'rgba(54, 162, 235, 0.1)',
							data: cardData,
							tension: 0.1
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

				console.log('庫存圖表創建完成');
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
				showCardImage(urlCard);
			}
			
			// 現代化圖片載入效果
			function showCardImage(src) {
			    const img = document.getElementById('cardImg');
			    const placeholder = document.querySelector('.image-placeholder');
			    
			    if (src) {
			        // 淡入效果
			        img.style.opacity = '0';
			        img.style.display = 'block';
			        img.src = src;
			        
			        img.onload = function() {
			            placeholder.style.display = 'none';
			            img.style.transition = 'opacity 0.5s ease';
			            img.style.opacity = '1';
			        };
			    } else {
			        img.style.display = 'none';
			        placeholder.style.display = 'block';
			    }
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

		// 新增統一的圖表銷毀函數
		function destroyAllCharts() {
			console.log('開始銷毀所有圖表...');
			
			if (myChart) {
				try {
					myChart.destroy();
					console.log('價格圖表已銷毀');
				} catch (error) {
					console.error('銷毀價格圖表時發生錯誤:', error);
				}
				myChart = null;
			}
			
			if (myStockChart) {
				try {
					myStockChart.destroy();
					console.log('庫存圖表已銷毀');
				} catch (error) {
					console.error('銷毀庫存圖表時發生錯誤:', error);
				}
				myStockChart = null;
			}
		}

/**
 * 根據前綴找到並設置 cardStandard
 * @param {string} prefix - 卡號前綴 (例如: PRD)
 * @returns {Promise<boolean>} - 是否找到並設置成功
 */
async function findAndSetCardStandard(prefix) {
  return new Promise((resolve) => {
    // 等待標準資料載入完成
    var checkInterval = setInterval(() => {
      var cardStandardSelect = document.getElementById('cardStandard');
      if (!cardStandardSelect || cardStandardSelect.options.length <= 1) {
        return; // 還沒載入完成
      }
      
      clearInterval(checkInterval);
      
      // 遍歷所有選項找到匹配的
      for (var i = 0; i < cardStandardSelect.options.length; i++) {
        var option = cardStandardSelect.options[i];
        var value = option.value;
        var searchTarget = prefix.toLowerCase();
        // 檢查值是否包含我們的前綴
        if (value && value.toLowerCase().includes(searchTarget)) {
          console.log('找到匹配的作品標準:', option.text, 'value:', value);
          option.selected = true;
          
          // 觸發變更事件
          removeTitle();
          changeStandard();
          
          resolve(true);
          return;
        }
      }
      
      resolve(false);
    }, 100);
    
    // 超時處理
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 5000);
  });
}

/**
 * 根據系列找到並設置 cardTitle
 * @param {string} series - 卡號系列 (例如: PRD/W01)
 * @returns {Promise<boolean>} - 是否找到並設置成功
 */
async function findAndSetCardTitle(series) {
  return new Promise((resolve) => {
    var checkInterval = setInterval(() => {
      var cardTitleSelect = document.getElementById('cardTitle');
      if (!cardTitleSelect || cardTitleSelect.options.length <= 1) {
        return; // 還沒載入完成
      }
      
      clearInterval(checkInterval);
      
      // 遍歷所有選項找到匹配的
      for (var i = 0; i < cardTitleSelect.options.length; i++) {
        var option = cardTitleSelect.options[i];
        var value = option.value;
        var searchTarget = series.toLowerCase();

        if (value && value.toLowerCase() === searchTarget) {
          console.log('找到匹配的主題:', option.text, 'value:', value);
          option.selected = true;
          
          // 觸發變更事件
          changeTitle();
          
          resolve(true);
          return;
        }
      }
      
      resolve(false);
    }, 100);
    
    // 超時處理
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 5000);
  });
}

/**
 * 根據系列找到並設置 cardTitle
 * @param {string} suffix - 卡號系列 (例如: W01-001)
 * @returns {Promise<boolean>} - 是否找到並設置成功
 */
async function findAndSetCardSuffix(prefix,suffix) {
  return new Promise((resolve) => {
    var checkInterval = setInterval(async () => {
      var cardTitleSelect = document.getElementById('cardTitle');
     //if (!cardTitleSelect || cardTitleSelect.options.length <= 1) {
     //   return; // 還沒載入完成
     // }
      
      clearInterval(checkInterval);
      
      // 遍歷所有選項找到匹配的
      for (var i = 0; i < cardTitleSelect.options.length; i++) {
        var option = cardTitleSelect.options[i];
        var value = option.value;
        var searchTarget = prefix.toLowerCase();
		//console.log('findAndSetCardSuffix searchTarget:'+searchTarget+' value:'+value);

        if (value && value.toLowerCase().includes("/"+searchTarget)) {
          console.log('找到匹配的主題:', option.text, 'value:', value);
          option.selected = true;
          

          // 等待 checkTitleOfCardNumberList 完成
          try {
            var hasMatchingNumber = await checkTitleOfCardNumberList(suffix);
            if (hasMatchingNumber) {
			  console.log('檢測到匹配的卡號，變更主題...'+suffix.toLowerCase());
              changeTitle();
              resolve(true);
              return;
            }
          } catch (error) {
            console.error('checkTitleOfCardNumberList 執行錯誤:', error);
          }

          //resolve(true);
          //return;
        }
      }
	  //先註解
    //   console.log('findAndSetCardSuffix 第二階段...');
	//   var cardStandardSelect = document.getElementById('cardStandard');
    //   if (!cardStandardSelect || cardStandardSelect.options.length <= 1) {
    //     return; // 還沒載入完成
    //   }
      
    //   clearInterval(checkInterval);
      
    //   // 遍歷所有選項找到匹配的
	//   //重找Standard
    //   for (var i = 0; i < cardStandardSelect.options.length; i++) {
    //     var option = cardStandardSelect.options[i];
    //     var value = option.value;
    //     var searchTarget = suffix.toLowerCase();
    //     // 檢查值是否包含我們的前綴
    //     if (value && value.toLowerCase().includes(searchTarget)) {
    //       console.log('找到匹配的作品標準:', option.text, 'value:', value);
    //       option.selected = true;
          
    //       // 觸發變更事件
    //       changeStandard();
          
    //       resolve(true);
    //       return;
    //     }
    //   }

	  
    //   resolve(false);
    }, 100);
    
    // 超時處理
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 5000);
  });
}


/**
 * 根據完整卡號找到並設置 cardNumber
 * @param {string} fullNumber - 完整卡號 (例如: PRD/W01-001)
 * @returns {Promise<boolean>} - 是否找到並設置成功
 */
async function findAndSetCardNumber(fullNumber) {
  return new Promise((resolve) => {
    var checkInterval = setInterval(() => {
      var cardNumberSelect = document.getElementById('cardNumber');
      if (!cardNumberSelect || cardNumberSelect.options.length <= 1) {
        return; // 還沒載入完成
      }
      
      clearInterval(checkInterval);
      
      // 遍歷所有選項找到匹配的
      for (var i = 0; i < cardNumberSelect.options.length; i++) {
        var option = cardNumberSelect.options[i];
        var value = option.value;
        var searchTarget = fullNumber.toLowerCase();

		if (value && value.toLowerCase() === searchTarget) {
          console.log('找到匹配的卡號:', option.text, 'value:', value);
          option.selected = true;
          
          // 先銷毀現有圖表再觸發變更事件
          destroyAllCharts();
          
          // 觸發變更事件
          changeNumber();
          
          resolve(true);
          return;
		}
      }
      
      resolve(false);
    }, 100);
    
    // 超時處理
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 5000);
  });
}

/**
 * 根據後綴卡號找到並設置 cardNumber
 * @param {string} fullNumber - 後綴卡號 (例如: W01-001)
 * @returns {Promise<boolean>} - 是否找到並設置成功
 */
async function findAndSetCardNumberBySuffix(fullNumber) {
  return new Promise((resolve) => {
    var checkInterval = setInterval(() => {
      var cardNumberSelect = document.getElementById('cardNumber');
      if (!cardNumberSelect || cardNumberSelect.options.length <= 1) {
        return; // 還沒載入完成
      }
      
      clearInterval(checkInterval);
      
      // 遍歷所有選項找到匹配的
      for (var i = 0; i < cardNumberSelect.options.length; i++) {
        var option = cardNumberSelect.options[i];
        var value = option.value+"/";
        var searchTarget = fullNumber.toLowerCase()+"/";
        // console.log('findAndSetCardNumberBySuffix searchTarget:'+searchTarget);
		// console.log('findAndSetCardNumberBySuffix value.toLowerCase():'+value.toLowerCase());  
		if (value && value.toLowerCase().includes(searchTarget)) {
          console.log('找到匹配的卡號:', option.text, 'value:', value);
          option.selected = true;
          
          // 先銷毀現有圖表再觸發變更事件
          destroyAllCharts();
          
          // 觸發變更事件
          changeNumber();
          
          resolve(true);
          return;
		}
      }
      
      resolve(false);
    }, 100);
    
    // 超時處理
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 5000);
  });
}

/**
 * 等待 cardTitle 選項載入完成
 * @returns {Promise<void>}
 */
async function waitForTitleOptionsLoaded() {
  return new Promise((resolve) => {
    var checkInterval = setInterval(() => {
      var cardTitleSelect = document.getElementById('cardTitle');
      if (cardTitleSelect && cardTitleSelect.options.length > 1) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    // 超時處理
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 5000);
  });
}

/**
 * 等待 cardNumber 選項載入完成
 * @returns {Promise<void>}
 */
async function waitForNumberOptionsLoaded() {
  return new Promise((resolve) => {
    var checkInterval = setInterval(() => {
      var cardNumberSelect = document.getElementById('cardNumber');
      if (cardNumberSelect && cardNumberSelect.options.length > 1) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    // 超時處理
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 5000);
  });
}



/**
 * 平滑滾動到指定錨點
 * @param {string} anchorId - 錨點元素的 ID (不包含 #)
 * @param {string} behavior - 滾動行為 ('smooth' 或 'auto')
 * @param {string} block - 垂直對齊方式 ('start', 'center', 'end', 'nearest')
 */
function smoothScrollToAnchor(anchorId, behavior = 'smooth', block = 'start') {
    const targetElement = document.getElementById(anchorId);
    
    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: behavior,
            block: block,
            inline: 'nearest'
        });
        
        console.log(`平滑滾動到錨點: ${anchorId}`);
    } else {
        console.warn(`找不到錨點元素: ${anchorId}`);
    }
}

/**
 * 搜尋完成後滾動到結果區域
 */
function scrollToResults() {
    // 滾動到卡片預覽區域
    smoothScrollToAnchor('preview-card-tag', 'smooth', 'center');
}

/**
 * 滾動到圖表區域 (no USED)
 */
function scrollToCharts() {
    // 滾動到圖表區域
    smoothScrollToAnchor('myChart', 'smooth', 'start');
}

/**
 * 重組title
 */
function reGenTitle(){
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
}
