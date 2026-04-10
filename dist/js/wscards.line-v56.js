/**
 * 頁面載入完成後執行
 * - 滾動到頂部
 * - 初始化基本設定
 */
window.onload=function(){
    setTimeout(function(){
        window.scrollTo(0, 1);
    }, 100);		
    setFun();  
}

// Typeahead 輸入框和下拉選單元素
var $input = $(".typeahead");
var $dropdown = $(".dropdown-menu");


// 全域圖表變數 - 用於正確的圖表銷毀管理
var myChart = null;
var myStockChart = null;

// ====================================================
// 搜尋防抖與鎖定機制
// - _searchDebounceTimer: input 事件的 debounce timer
// - _isSearching: 搜尋進行中的鎖定旗標
// - _lastSearchedValue: 上次成功觸發搜尋的卡號值（防重複）
// ====================================================
var _searchDebounceTimer = null;
var _isSearching = false;
var _lastSearchedValue = '';

/**
* 初始化 Typeahead 自動完成功能
* - 設定資料來源（作品列表）
* - 配置搜尋行為和顯示選項
*/
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
{id:"WS00078", name:"進撃の巨人",cname:"進擊的巨人 | AOT"},
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
minLength:1,          // 最少輸入字數
showHintOnFocus:true, // 焦點時顯示提示
scrollHeight:0,       // 滾動高度
items:'all',          // 顯示所有項目
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
fitToElement:true,     // 適應元素寬度
selectOnBlur:false     // 失去焦點時不自動選擇
});

/**
* 處理 Typeahead 選擇和卡號直接輸入
* - 檢測是從下拉選單選擇還是直接輸入卡號
* - 根據不同情況執行對應的搜尋邏輯
*/
function handleInputChange() {
var current = $input.typeahead("getActive");
var inputValue = $input.val().trim();

console.log('Input change detected(inputValue):', inputValue);
console.log('current:',current);

// 清除任何待執行的 debounce timer（change 事件優先處理）
if (_searchDebounceTimer) {
clearTimeout(_searchDebounceTimer);
_searchDebounceTimer = null;
}

// 如果正在搜尋中，跳過
if (_isSearching) {
console.log('搜尋進行中，跳過 change 事件');
return;
}

if (current) {
// Some item from your model is active!
if (current.name == inputValue) {
  console.log('Typeahead item selected:', current.name);
  changeStandardForSuggest(current.name);
  scrollToFilters();
  //when you chose item
} else {
    console.log('Partial match detected->check number');
    if (inputValue && isCardNumberFormat(inputValue) && inputValue !== _lastSearchedValue) {
      console.log('檢測到卡號格式，嘗試直接搜尋:', inputValue);
      searchByCardNumber(inputValue);
    }		
}
} else {
// Nothing is active so it is a new value (or maybe empty value)
// 檢查是否為卡號格式 (例如: PRD/W01-001)
if (inputValue && isCardNumberFormat(inputValue) && inputValue !== _lastSearchedValue) {
  console.log('檢測到卡號格式，嘗試直接搜尋:', inputValue);
  searchByCardNumber(inputValue);
}
}
}


// 監聽 change 事件 (失去焦點時觸發)
$input.change(handleInputChange);

/**
* 監聽 input 事件 (即時輸入時觸發)
* - 使用 debounce 機制，避免輸入過程中頻繁觸發搜尋
* - 每次新的輸入會清除前一次的 timer，只有停頓超過 1200ms 才觸發
* - 搜尋進行中或已搜尋過同一值時不重複觸發
*/
$input.on('input', function() {
// 每次輸入都清除上一次的 debounce timer
if (_searchDebounceTimer) {
clearTimeout(_searchDebounceTimer);
_searchDebounceTimer = null;
}

var inputValue = $input.val().trim();
// 只在輸入看起來像完整卡號時才啟動 debounce
if (inputValue && inputValue.length >= 8 && isCardNumberFormat(inputValue)) {
console.log('即時檢測到完整卡號格式，啟動 debounce:', inputValue);
_searchDebounceTimer = setTimeout(function() {
  _searchDebounceTimer = null;
  // 再次確認輸入值沒有改變、沒有正在搜尋、且不是重複搜尋
  var currentValue = $input.val().trim();
  if (currentValue === inputValue && !_isSearching && inputValue !== _lastSearchedValue) {
    searchByCardNumber(inputValue);
  }
}, 1200);
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
// 防止重複搜尋：正在搜尋中 或 與上次搜尋值相同
if (_isSearching) {
  console.log('搜尋進行中，忽略重複請求:', cardNumber);
  return;
}
if (cardNumber === _lastSearchedValue) {
  console.log('與上次搜尋值相同，忽略重複請求:', cardNumber);
  return;
}

console.log('開始解析卡號:', cardNumber);

// 鎖定搜尋狀態
_isSearching = true;
_lastSearchedValue = cardNumber;

// 顯示搜尋提示
showSearchNotification('正在搜尋卡號: ' + cardNumber);

// 拆解卡號
var cardParts = parseCardNumber(cardNumber);
if (!cardParts) {
  console.warn('無法解析卡號格式:', cardNumber);
  showSearchNotification('卡號格式不正確: ' + cardNumber, 'error');
  _isSearching = false;
  return;
}

console.log('卡號解析結果:', cardParts);

// 根據解析結果設置選擇器
setSelectorsFromCardParts(cardParts);

} catch (error) {
console.error('搜尋卡號時發生錯誤:', error);
showSearchNotification('搜尋失敗: ' + error.message, 'error');
_isSearching = false;
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
    _isSearching = false;
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
        _isSearching = false;
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
    _isSearching = false;
    return;
    }
}else{
    // 2.5 設置 cardSuffix (主要工作將卡號清單找出並展出)
    showSearchNotification('正在搜尋後綴: ' + cardParts.suffix);
    var suffixFound = await findAndSetCardSuffix(cardParts.prefix,cardParts.suffix);
    if (!suffixFound) {
        console.warn('後綴找不到對應的卡號:', cardParts.suffix);
        showSearchNotification('找不到對應的卡號: ' + cardParts.suffix, 'error');
        _isSearching = false;
        return;
    }

    // 3. 根據設置 cardNumber (這邊的fullNumber應該是等同於suffix)
    showSearchNotification('正在搜尋卡號: ' + cardParts.fullNumber);
    var numberFound = await findAndSetCardNumberBySuffix(cardParts.fullNumber);
    if (!numberFound) {
        console.warn('找不到對應的卡號:', cardParts.fullNumber);
        showSearchNotification('找不到對應的卡號: ' + cardParts.fullNumber, 'error');
        _isSearching = false;
        return;
    }
}

console.log('✓ 卡號搜尋完成:', cardParts.fullNumber);
showSearchNotification('搜尋成功！已找到卡號: ' + cardParts.fullNumber, 'success');

// 搜尋完成，釋放鎖定
_isSearching = false;

// 搜尋成功後平滑滾動到結果區域
setTimeout(() => {
    scrollToResults();
}, 200); // 延遲一秒讓圖表載入完成	

} catch (error) {
console.error('設置選擇器時發生錯誤:', error);
showSearchNotification('設置選擇器時發生錯誤: ' + error.message, 'error');
_isSearching = false;
}
}  

// API 端點 URL 設定
var requestURLCardPrice = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/BD_W54.json';
var requestURLCardStock = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/stockJson/BD_W54.json';
var requestMappingURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDisplayMapping.json'
var requestURLCardPricebyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/';
var requestURLCardStockbyPreCode = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/stockJson/';
var requestURLCardTitle = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardTitle.json';
var standardWURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_W.json';
var standardSURL = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_S.json';

// XMLHttpRequest 物件
var requestStandardW = new XMLHttpRequest();
var requestStandardS = new XMLHttpRequest();			
var requestPrice = new XMLHttpRequest();	
var requestStock = new XMLHttpRequest();
var requestTitle = new XMLHttpRequest();	
var requestMapping = new XMLHttpRequest();
var mappingRep;

/**
* 載入卡號顯示對應表
* - 用於處理特殊格式的卡號顯示
*/
requestMapping.open('GET',requestMappingURL);
requestMapping.responseType = 'json';
requestMapping.send();	
requestMapping.onload = function() {
mappingRep = requestMapping.response;		
}			  

/**
* 初始化設定函數
* - 載入作品標準資料 (Weiss 和 Schwarz)
* - 載入主題資料
* - 載入預設卡片資料
* - 設置選擇器初始狀態
*/
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
          
// 載入 Weiss 作品標準
requestStandardW.open('GET', standardWURL);
requestStandardW.responseType = 'json';
requestStandardW.send();

// 載入 Schwarz 作品標準		  
requestStandardS.open('GET', standardSURL);
requestStandardS.responseType = 'json';
requestStandardS.send();

/**
 * Weiss 作品標準載入完成後
 * - 填充 Weiss 選項群組
 */			  
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

/**
 * Schwarz 作品標準載入完成後
 * - 填充 Schwarz 選項群組
 */	
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

// 載入預設價格資料			  
requestPrice.open('GET', requestURLCardPrice);
requestPrice.responseType = 'json';
requestPrice.send();	

requestStock.open('GET', requestURLCardStock);
requestStock.responseType = 'json';
requestStock.send();
          
requestTitle.open('GET', requestURLCardTitle);
requestTitle.responseType = 'json';
requestTitle.send();

/**
 * 主題資料載入完成後
 * - 填充主題選擇器
 */	
requestTitle.onload = function(){
    var cardsTitle = requestTitle.response;
    for(var key in cardsTitle){	 
        var option = document.createElement("option");
        option.setAttribute("value",key);
        option.appendChild(document.createTextNode(cardsTitle[key])); 
        selectTitle.appendChild(option);				
    }
}

/**
 * 預設價格資料載入完成後
 * - 顯示預設卡片 (BD/W54-070SSP)
 */	
requestPrice.onload = function(){
    var cards = requestPrice.response;
    getCardData(cards,'BD/W54-070SSP','BD/W54-070SSP');			
    //loadCardData 預設
    loadCardData('BD/W54-070SSP');
    // 載入預設鑑定卡資料
    if (typeof GradingModule !== 'undefined') {
        GradingModule.loadGradingData('BD_W54', 'BD/W54-070SSP');
    }
}

/**
 * 預設庫存資料載入完成後
 * - 顯示預設卡片庫存
 */		  
requestStock.onload = function(){
    var cards = requestStock.response;
    getCardStockData(cards,'BD/W54-070SSP','BD/W54-070SSP');			  
}			

/**
 * 等待卡片圖片載入完成
 * - 載入完成後隱藏 overlay
 */			  
var timer = setInterval(function(){
    if (document.getElementById('cardImg').complete){
        clearInterval(timer);
        document.getElementById('overlay-1').style.display='none';	
    }
}, 10);	
}

/**
* 作品標準變更處理函數
* - 根據選擇的作品標準篩選可用的主題
* - 重新載入主題選項
*/			
function changeStandard(){
var cardStandard=document.getElementById('cardStandard').value;
var cardStandardEle=document.getElementById('cardStandard');
var selectTitle = document.getElementById("cardTitle"); 

// 清空主題選擇器	
while (selectTitle.firstChild) {
    selectTitle.removeChild(selectTitle.firstChild);
}			  

// 重新載入主題資料
requestTitle.open('GET', requestURLCardTitle);
requestTitle.responseType = 'json';
requestTitle.send();	

/**
 * 主題資料載入完成後
 * - 根據作品標準篩選主題
 */			
requestTitle.onload = function(){
    var cardsTitle = requestTitle.response;
    var cardStandardArray = cardStandard.split(",");
    
    for(var key in cardsTitle){	 
        // 提取主題前綴
        var keyStr=key.substr(0,key.indexOf('/'));//2~3
        var keyStrLength=keyStr.length;

        // 檢查是否符合選擇的作品標準
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

/**
* 根據建議的作品名稱變更作品標準
* @param {string} productName - 作品名稱
* 
* 用於 Typeahead 選擇後自動設置
*/
function changeStandardForSuggest(productName){
document.getElementById(productName).selected=true
changeStandard();		  
}	

/**
* 移除標題提示
* - 隱藏 "notuse" 元素
*/
function removeTitle(){			
document.getElementById('notuse').style.display='none';
}				

/**
* 作品標準變更後更新卡號選擇器
* - 清空卡號選擇器
* - 顯示卡號選擇器
* - 添加預設選項
*/
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
option.appendChild(document.createTextNode("選擇產品")); 				  
selectTitle.appendChild(option);	
selectTitle.insertBefore(option,selectTitle.childNodes[0]);

removeTitle();			
}


/**
* 檢查主題中是否包含指定後綴的卡號
* @param {string} suffix - 卡號後綴 (例如: W01-001)
* @returns {Promise<boolean>} - 是否找到匹配的卡號
* 
* 用於判斷是否需要使用後綴方式搜尋
*/
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

/**
* 主題變更處理函數
* - 銷毀現有圖表
* - 載入新主題的卡號列表
* - 排序卡號選項
* - 顯示第一個卡號的資料
*/
function changeTitle(){	
window._hasUserModified = true;			
// 先銷毀現有圖表
destroyAllCharts();
        
sortOption();

// 設定卡號選擇器
var selectPrice = document.getElementById("cardNumber"); 
selectPrice.style.visibility = 'visible';
selectPrice.length = 1;
selectPrice.options[0].selected = true;	

// 清空卡號選擇器
while (selectPrice.firstChild) {
    selectPrice.removeChild(selectPrice.firstChild);
}					  
          
var cardTitle = document.getElementById('cardTitle').value;	  	
var cardTilteReplaceSpare = cardTitle.replace('/','_');
console.log(cardTitle+'->'+cardTilteReplaceSpare);
  
// 載入對應主題的價格資料			  
requestPrice.open('GET', requestURLCardPricebyPreCode + cardTilteReplaceSpare +'.json');
requestPrice.responseType = 'json';
requestPrice.send();				  

/**
 * 價格資料載入完成後
 * - 填充卡號選項
 * - 處理特殊格式卡號的顯示
 */
requestPrice.onload = function() {
    var cards = requestPrice.response;

    for(var key in cards){
        if(key.indexOf('/')<0&&key.indexOf('S')==0){
            // 特殊格式卡號，使用對應表顯示					
            var option = document.createElement("option"); 
            option.setAttribute("value",key);
            option.appendChild(document.createTextNode(mappingRep[key])); 							
            selectPrice.appendChild(option);					
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
                
/**
* 卡號變更處理函數
* - 銷毀現有圖表
* - 顯示載入動畫
* - 載入新卡號的價格和庫存資料
* - 更新卡片資訊
* - 等待圖片載入完成
*/			
function changeNumber(){	
var cardTitle = document.getElementById('cardTitle').value;
var cardTilteReplaceSpare = cardTitle.replace('/','_');
console.log(cardTitle+'->'+cardTilteReplaceSpare);
            
// 先銷毀現有圖表
destroyAllCharts();

// 顯示載入動畫
document.getElementById('overlay-1').style.display='block';					
document.getElementById('overlay-2').style.display='block';				
document.getElementById('overlay-3').style.display='block';		

var downloadCardTag = document.getElementById('download-card-tag');
if (downloadCardTag) {
    downloadCardTag.style.display = 'none';
}

// 載入價格資料
requestPrice.open('GET', requestURLCardPricebyPreCode + cardTilteReplaceSpare +'.json');
requestPrice.responseType = 'json';
requestPrice.send();

/**
 * 價格資料載入完成後
 * - 繪製價格圖表
 */	
requestPrice.onload = function() {
    var cards = requestPrice.response;
    var cardNumberSelect=document.getElementById('cardNumber');
    var selectedIndex=cardNumberSelect.selectedIndex;
    var cardNumberDisplay=cardNumberSelect.options[selectedIndex].text;				  
    var internalCardNumber=cardNumberSelect.options[selectedIndex].value;		
    getCardData(cards,internalCardNumber,cardNumberDisplay);
}

// 載入庫存資料
requestStock.open('GET', requestURLCardStockbyPreCode + cardTilteReplaceSpare +'.json');
requestStock.responseType = 'json';
requestStock.send();

/**
 * 庫存資料載入完成後
 * - 繪製庫存圖表
 */

requestStock.onload = function() {
  var cards = requestStock.response;
  var cardNumberSelect=document.getElementById('cardNumber');
  var selectedIndex=cardNumberSelect.selectedIndex;
  var cardNumberDisplay=cardNumberSelect.options[selectedIndex].text;				  
  var internalCardNumber=cardNumberSelect.options[selectedIndex].value;		
  getCardStockData(cards,internalCardNumber,cardNumberDisplay);
}				

/**
 * update 卡片資訊 & 鑑定卡資料
*/
var cardNumberSelect_info = document.getElementById('cardNumber');
var cardNumberValue = cardNumberSelect_info.value;
var cardNumberDisplayText = cardNumberValue;
if (cardNumberSelect_info.selectedIndex >= 0) {
    cardNumberDisplayText = cardNumberSelect_info.options[cardNumberSelect_info.selectedIndex].text || cardNumberValue;
}

if (cardNumberValue && cardNumberValue !== '000/000-000') {
    loadCardData(cardNumberValue);

    if (typeof GradingModule !== 'undefined') {
        GradingModule.loadGradingData(cardTilteReplaceSpare, cardNumberDisplayText);
    }
}

/**
 * 等待卡片圖片載入完成
 * - 載入完成後隱藏 overlay
 */
var timer = setInterval(function(){
    if (document.getElementById('cardImg').complete){
        clearInterval(timer);
        console.log(document.getElementById('cardImg').complete)
        document.getElementById('overlay-1').style.display='none';	
    }
}, 10);			
}
        

/**
* 繪製價格走勢圖
* @param {object} jsonObj - 包含所有卡片資料的 JSON 物件
* @param {string} internalCardNumber - 內部卡號 (用於索引)
* @param {string} cardNum - 顯示用卡號
* 
* 使用 Chart.js 繪製折線圖
*/			
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
                    callbacks: {
                        title: function(tooltipItem, data) {
                            var title = data.labels[tooltipItem[0].index] || '';
                            if (typeof title === 'string') {
                                if (title.length === 8 && !title.includes('-') && !title.includes('/')) {
                                    return title.substring(0, 4) + '年' + parseInt(title.substring(4, 6), 10) + '月' + parseInt(title.substring(6, 8), 10) + '日';
                                } else if (title.includes('-')) {
                                    var parts = title.split('-');
                                    if (parts.length === 3) return parts[0] + '年' + parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
                                } else if (title.includes('/')) {
                                    var parts = title.split('/');
                                    if (parts.length === 3) return parts[0] + '年' + parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
                                }
                            }
                            return title;
                        },
                        label: function(tooltipItem, data) {
                            var datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
                            if (datasetLabel) datasetLabel += ': ';
                            var value = Number(tooltipItem.yLabel);
                            if (isNaN(value)) return datasetLabel + '¥' + tooltipItem.yLabel;
                            return '¥' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
                        }
                    }
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
                            },
                            ticks: {
                                autoSkip: true,
                                maxTicksLimit: 7,
                                callback: function(value, index, values) {
                                    if (typeof value === 'string') {
                                        if (value.length === 8 && !value.includes('-') && !value.includes('/')) {
                                            return value.substring(4, 6) + '/' + value.substring(6, 8);
                                        } else if (value.includes('-')) {
                                            var parts = value.split('-');
                                            if (parts.length === 3) return parts[1] + '/' + parts[2];
                                        } else if (value.includes('/')) {
                                            var parts = value.split('/');
                                            if (parts.length === 3) return parts[1] + '/' + parts[2];
                                        }
                                    }
                                    return value;
                                }
                            }
                        }],
                        yAxes: [{
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: '價格(日幣)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
                                }
                            }
                        }]
                    }

                }
            });		

            console.log('價格圖表創建完成');
            document.getElementById('overlay-2').style.display='none';

            // 5. 更新價格摘要統計卡片
            updatePriceSummary(cardData);

            // 6. 記錄到搜尋歷史 (有變動才寫入)
            if (window._hasUserModified && typeof SearchHistory !== 'undefined' && cardNum && cardNum !== '000/000-000') {
                // 嘗試從卡號解析稀有度 (例如 BD/W54-070SSP -> SSP)
                var rareMatch = cardNum.match(/[0-9]+([A-Z+]+)$/i);
                var parsedRare = rareMatch ? rareMatch[1] : '';
                
                var cardTitleSelect = document.getElementById('cardTitle');
                var titleText = (cardTitleSelect && cardTitleSelect.selectedIndex >= 0) 
                    ? cardTitleSelect.options[cardTitleSelect.selectedIndex].text 
                    : '';

                // 嘗試獲取目前畫面上的卡名 (如果已經載入的話)
                var cardNameEl = document.getElementById('cardname');
                var currentName = (cardNameEl && cardNameEl.textContent !== '-') ? cardNameEl.textContent : '';

                SearchHistory.addItem({
                    cardNumber: cardNum,
                    cardName: currentName,
                    cardRare: parsedRare,
                    cardTitle: titleText
                });
                
                var downloadCardTag = document.getElementById('download-card-tag');
                if (downloadCardTag) {
                    downloadCardTag.style.display = 'block';
                }
            }
}

/**
* 更新價格摘要統計卡片
* @param {Array} priceData - 價格資料陣列
* 
* 計算並顯示：目前價格、最高價、最低價、漲跌幅%
*/
function updatePriceSummary(priceData) {
var summaryCard = document.getElementById('priceSummaryCard');
if (!summaryCard) return;

var elCurrent = document.getElementById('summaryCurrentPrice');
var elHigh = document.getElementById('summaryHighPrice');
var elLow = document.getElementById('summaryLowPrice');
var elChange = document.getElementById('summaryChangePercent');
var changeItem = summaryCard.querySelector('.price-summary-item.change');

// 重置為預設狀態（無資料）
function forceDefault() {
    summaryCard.style.display = 'block'; // 確保佔位存在，避免佈局抖動
    if (elCurrent) elCurrent.textContent = '--';
    if (elHigh) elHigh.textContent = '--';
    if (elLow) elLow.textContent = '--';
    if (elChange) {
        elChange.textContent = '--';
        elChange.className = 'price-summary-value price-flat';
    }
    if (changeItem) {
        changeItem.classList.remove('is-up', 'is-down');
        var changeIcon = changeItem.querySelector('.price-summary-icon i');
        if (changeIcon) changeIcon.className = 'fas fa-minus';
    }
}

if (!priceData || priceData.length === 0) {
    forceDefault();
    return;
}

// 過濾有效數值（排除 null、undefined、0）
var validPrices = priceData.filter(function(p) {
    return p !== null && p !== undefined && p !== 0 && !isNaN(p);
});

if (validPrices.length === 0) {
    forceDefault();
    return;
}

// 計算統計數據
var currentPrice = validPrices[validPrices.length - 1];

// 最高價/最低價只看近一個月（30天）
var recent30 = validPrices.slice(-30);
var highPrice = Math.max.apply(null, recent30);
var lowPrice = Math.min.apply(null, recent30);

// 漲跌幅只看最近 7 天
var recent7 = validPrices.slice(-7);
var basePrice7 = recent7[0]; // 7天前（或資料不足7天時的第一筆）
var changePercent = basePrice7 !== 0 
    ? ((currentPrice - basePrice7) / basePrice7 * 100).toFixed(1) 
    : 0;

// 更新 DOM
var elCurrent = document.getElementById('summaryCurrentPrice');
var elHigh = document.getElementById('summaryHighPrice');
var elLow = document.getElementById('summaryLowPrice');
var elChange = document.getElementById('summaryChangePercent');

// 重新啟動動畫的輔助函數
function triggerAnimate(el, baseClass) {
    if (!el) return;
    el.className = baseClass; // 先移除 animate
    void el.offsetWidth; // 觸發重繪
    el.className = baseClass + ' animate';
}

if (elCurrent) {
    elCurrent.textContent = '¥' + currentPrice.toLocaleString();
    triggerAnimate(elCurrent, 'price-summary-value');
}
if (elHigh) {
    elHigh.textContent = '¥' + highPrice.toLocaleString();
    triggerAnimate(elHigh, 'price-summary-value');
}
if (elLow) {
    elLow.textContent = '¥' + lowPrice.toLocaleString();
    triggerAnimate(elLow, 'price-summary-value');
}
if (elChange) {
    var sign = changePercent > 0 ? '+' : '';
    elChange.textContent = sign + changePercent + '%';
    // 漲跌顏色
    var colorClass = 'price-flat';
    if (changePercent > 0) colorClass = 'price-up';
    else if (changePercent < 0) colorClass = 'price-down';
    
    triggerAnimate(elChange, 'price-summary-value ' + colorClass);
}

// 更新漲跌圖標方向
if (changeItem) {
    changeItem.classList.remove('is-up', 'is-down');
    var changeIcon = changeItem.querySelector('.price-summary-icon i');
    if (changePercent > 0) {
        changeItem.classList.add('is-up');
        if (changeIcon) changeIcon.className = 'fas fa-arrow-up';
    } else if (changePercent < 0) {
        changeItem.classList.add('is-down');
        if (changeIcon) changeIcon.className = 'fas fa-arrow-down';
    } else {
        if (changeIcon) changeIcon.className = 'fas fa-minus';
    }
}

// 顯示卡片
summaryCard.style.display = 'block';
}

/**
* 繪製庫存走勢圖
* @param {object} jsonObj - 包含所有卡片資料的 JSON 物件
* @param {string} internalCardNumber - 內部卡號 (用於索引)
* @param {string} cardNum - 顯示用卡號
* 
* 使用 Chart.js 繪製折線圖
*/
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
                    callbacks: {
                        title: function(tooltipItem, data) {
                            var title = data.labels[tooltipItem[0].index] || '';
                            if (typeof title === 'string') {
                                if (title.length === 8 && !title.includes('-') && !title.includes('/')) {
                                    return title.substring(0, 4) + '年' + parseInt(title.substring(4, 6), 10) + '月' + parseInt(title.substring(6, 8), 10) + '日';
                                } else if (title.includes('-')) {
                                    var parts = title.split('-');
                                    if (parts.length === 3) return parts[0] + '年' + parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
                                } else if (title.includes('/')) {
                                    var parts = title.split('/');
                                    if (parts.length === 3) return parts[0] + '年' + parseInt(parts[1], 10) + '月' + parseInt(parts[2], 10) + '日';
                                }
                            }
                            return title;
                        },
                        label: function(tooltipItem, data) {
                            var datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
                            if (datasetLabel) datasetLabel += ': ';
                            var value = Number(tooltipItem.yLabel);
                            if (isNaN(value)) return datasetLabel + tooltipItem.yLabel;
                            return datasetLabel + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
                        }
                    }
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
                            },
                            ticks: {
                                autoSkip: true,
                                maxTicksLimit: 7,
                                callback: function(value, index, values) {
                                    if (typeof value === 'string') {
                                        if (value.length === 8 && !value.includes('-') && !value.includes('/')) {
                                            return value.substring(4, 6) + '/' + value.substring(6, 8);
                                        } else if (value.includes('-')) {
                                            var parts = value.split('-');
                                            if (parts.length === 3) return parts[1] + '/' + parts[2];
                                        } else if (value.includes('/')) {
                                            var parts = value.split('/');
                                            if (parts.length === 3) return parts[1] + '/' + parts[2];
                                        }
                                    }
                                    return value;
                                }
                            }
                        }],
                        yAxes: [{
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: '庫存'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
                                }
                            }
                        }]
                    }

                }
            });		

            console.log('庫存圖表創建完成');
            document.getElementById('overlay-3').style.display='none';					
}

/**
* 添加卡片圖片
* @param {string} cardNumberDisplay - 顯示用卡號
* 
* 根據卡號構建圖片 URL 並顯示
* URL 格式: https://ws-tcg.com/wordpress/wp-content/cardimages/{first}/{second}/{third}.png
*/
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
            console.log("url card:"+urlCard);
            cardImg.setAttribute("src",urlCard);
            showCardImage(urlCard);
}
        
/**
* 顯示卡片圖片（現代化效果）
* @param {string} src - 圖片 URL
* 
* 提供淡入效果和載入狀態管理
*/
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
                    
/**
* 添加選項到 select 元素
* @param {HTMLSelectElement} object - select 元素
* @param {Array} object2 - 選項陣列
*/
function addOption(object, object2) { 
        each(object2, function(o, index) { 
            object.options[index] = o; 
        }) 
}

/**
* 排序選項列表
* @param {string} sortName - select 元素的 ID
* @param {boolean} isDesc - 是否降序排列
* 
* 按照選項文字進行排序
*/
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
/**
* 映射函數
* @param {object} object - 要映射的物件或陣列
* @param {function} callback - 回調函數
* @param {object} thisp - this 指向
* @returns {Array} - 映射後的陣列
*/
function map(object, callback, thisp) { 
        var ret = []; 
        each.call(thisp, object, function() { 
            ret.push(callback.apply(thisp, arguments)); 
        }); 
        return ret; 
} 

/**
* 遍歷函數
* @param {object} object - 要遍歷的物件或陣列
* @param {function} callback - 回調函數
* 
* 支援物件和陣列的遍歷
*/
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
// 排序順序標記
var sOrder = true; 
/**
* 切換排序順序並排序
* 
* 用於卡號選項的排序
*/
function sortOption(){         
        if(sOrder){ 
            sOrder    = false; 
        }else{ 
            sOrder    = true; 
        } 
        sortlist("cardNumber",sOrder); 
} 	

/**
* 銷毀所有圖表
* 
* 在變更卡號或主題時調用，避免圖表重疊
*/
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
      // return;
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
      
      window._hasUserModified = true;

      // 先銷毀現有圖表再觸发變更事件
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
      
      window._hasUserModified = true;

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
* 搜尋完成後滾動到結果區域:卡片預覽區域
*/
function scrollToResults() {
// 滾動到卡片預覽區域
smoothScrollToAnchor('preview-card-tag', 'smooth', 'center');
}

/**
* 搜尋完成後滾動到結果區域:篩選條件區域
*/
function scrollToFilters() {
// 滾動到篩選條件區域
smoothScrollToAnchor('filter-card-tag', 'smooth', 'center');
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

            for(var key in cardsTitle){	 

                var keyStr=key.substr(0,key.indexOf('/'));//2~3
                var keyStrLength=keyStr.length;

                var option = document.createElement("option");
                option.setAttribute("value",key);
                option.appendChild(document.createTextNode(cardsTitle[key])); 
                selectTitle.appendChild(option);				
            }
          }	
}
var elementCardNumber = document.getElementById('cardNumber');
if (elementCardNumber) {
elementCardNumber.addEventListener('change', function() {
     window._hasUserModified = true;
     // 搜尋成功後平滑滾動到結果區域
    setTimeout(() => {
        scrollToResults();
    }, 200); // 延遲一秒讓圖表載入完成	
});
}

/**
* 更新卡片資訊函數
* @param {object} cardData - 卡片資料物件
* 
* 更新所有卡片資訊欄位，包括:
* - 卡號、卡名、稀有度
* - 顏色（帶背景色）
* - 種類、等級、魂
* - Cost、Power、サイド
* - 觸發、特徵、效果
*/
function updateCardInfo(cardData) {
// 更新卡號
document.getElementById('cardno').textContent = cardData.cardno || '-';

// 更新卡名
document.getElementById('cardname').textContent = cardData.cardname || '-';

// 更新稀有度
document.getElementById('cardrare').textContent = cardData.cardrare || '-';

// 更新顏色（帶背景色）
// 中文/日文皆強制對應到統一顯示文字
const colorElement = document.getElementById('cardcolor');
const colorMap = {
    '青': { bg: '#0437F2', text: '藍' },
    '藍': { bg: '#0437F2', text: '藍' },
    '赤': { bg: '#F20404', text: '紅' },
    '紅': { bg: '#F20404', text: '紅' },
    '黄': { bg: '#F2E205', text: '黃' },
    '黃': { bg: '#F2E205', text: '黃' },
    '緑': { bg: '#04F240', text: '綠' },
    '綠': { bg: '#04F240', text: '綠' },
    '無': { bg: '#CCCCCC', text: '無' }
};

const color = cardData.cardcolor || '無';
const colorStyle = colorMap[color] || colorMap['無'];

colorElement.textContent = colorStyle.text;
colorElement.style.background = colorStyle.bg;
colorElement.style.color = '#fff';
colorElement.style.padding = '2px 16px';
colorElement.style.borderRadius = '2px';
colorElement.style.display = 'inline-block';

// 更新種類
document.getElementById('cardkind').textContent = cardData.cardkind || '-';

// 更新等級
document.getElementById('cardlevel').textContent = cardData.cardlevel || '-';

// 更新魂
document.getElementById('cardsoul').textContent = cardData.cardsoul || '-';

// 更新Cost
document.getElementById('cardcost').textContent = cardData.cardcost || '-';

// 更新Power
document.getElementById('cardpower').textContent = cardData.cardpower || '-';

// 更新サイド
document.getElementById('cardside').textContent = cardData.cardside || '-';

// 更新觸發
document.getElementById('cardtrigger').textContent = cardData.cardtrigger || '-';

// 更新特徵
document.getElementById('cardfeatures').textContent = cardData.cardfeatures || '-';

// 更新效果（支援HTML換行）
const cardText = cardData.cardtext || '-';
document.getElementById('cardtext').innerHTML = cardText.replace(/\n/g, '<br>');

console.log('卡片資訊已更新:', cardData.cardno);

// 6. 如果有載入詳細資訊，更新歷史紀錄補上真實卡名與稀有度 (有變動才寫入)
if (window._hasUserModified && typeof SearchHistory !== 'undefined' && cardData.cardno && cardData.cardno !== '-') {
    SearchHistory.addItem({
        cardNumber: cardData.cardno,
        cardName: cardData.cardname || '',
        cardRare: cardData.cardrare || '',
        cardTitle: (document.getElementById('cardTitle') && document.getElementById('cardTitle').selectedIndex >= 0)
            ? document.getElementById('cardTitle').options[document.getElementById('cardTitle').selectedIndex].text
            : ''
    });
}
}

// 載入並解析JSON資料:卡片資料 (帶入display number)
function loadCardData(cardNumber) {
// 從卡號提取作品代碼（例如：BD/W54-070SSP -> BAV_W129）
let standard = cardNumber.split('-')[0]; // 取得 BD/W54

// 判斷是 w (Weiss) 還是 s (Schwarz) 還是r (Rose)
let side = 'w'; // 預設
if (standard.includes('/')) {
  let parts = standard.split('/');
  if (parts.length > 1 && parts[1].length > 0) {
      side = parts[1].charAt(0).toLowerCase();
  }
}

standard = standard.replace('/','_');
const titleCode = standard; // 需要根據您的對應規則實現

// 構建JSON URL
let jsonUrl = `https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/content/ws/${titleCode}.json`;

if (cardNumber === 'BD/W54-070SSP') {
jsonUrl = `https://ws-cards.cloud/json/${titleCode}.json`;
}

// 顯示載入動畫
showOverlay('overlay-1');

// 使用 fetch 載入JSON
fetch(jsonUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error('JSON載入失敗');
        }
        return response.json();
    })
    .then(data => {
        // 在JSON資料中找到對應的卡片
        let rawCardData = null;
        if (data.cards && Array.isArray(data.cards)) {
            // 參照 BAV_W129.json 的格式
            rawCardData = data.cards.find(c => c.id === cardNumber);
        } else {
            // 相容舊格式
            rawCardData = data[cardNumber];
        }

        if (rawCardData) {
            // 將新格式轉換為 updateCardInfo 需要的格式
            const cardData = {
                cardno: rawCardData.id || rawCardData.cardno || cardNumber,
                cardname: rawCardData.name || rawCardData.cardname,
                cardrare: rawCardData.rarity || rawCardData.cardrare,
                cardcolor: rawCardData.color || rawCardData.cardcolor,
                cardkind: rawCardData.kind !== undefined ? String(rawCardData.kind) : rawCardData.cardkind,
                cardlevel: rawCardData.level !== undefined ? String(rawCardData.level) : rawCardData.cardlevel,
                cardsoul: rawCardData.soul !== undefined ? String(rawCardData.soul) : rawCardData.cardsoul,
                cardcost: rawCardData.cost !== undefined ? String(rawCardData.cost) : rawCardData.cardcost,
                cardpower: rawCardData.power !== undefined ? String(rawCardData.power) : rawCardData.cardpower,
                cardside: rawCardData.side || rawCardData.cardside,
                cardtrigger: rawCardData.trigger !== undefined ? String(rawCardData.trigger) : rawCardData.cardtrigger,
                cardfeatures: Array.isArray(rawCardData.features) ? rawCardData.features.join('・') : rawCardData.cardfeatures,
                cardtext: Array.isArray(rawCardData.text) ? rawCardData.text.join('\n') : rawCardData.cardtext
            };

            console.log('載入的卡片資料:', cardData);
            updateCardInfo(cardData);
        } else {
            console.error('找不到卡號:', cardNumber);
        }
    })
    .catch(error => {
        console.error('載入卡片資料失敗:', error);
    })
    .finally(() => {
        // 隱藏載入動畫
        hideOverlay('overlay-1');
    });
}



// 顯示/隱藏 overlay
function showOverlay(overlayId) {
const overlay = document.getElementById(overlayId);
if (overlay) {
    overlay.style.display = 'block';
}
}

function hideOverlay(overlayId) {
const overlay = document.getElementById(overlayId);
if (overlay) {
    overlay.style.display = 'none';
}
}

// ====================================================
// 搜尋歷史紀錄模組
// - 使用 localStorage 記錄最近查看的 10 張卡片
// - 提供快速回查功能
// ====================================================

var SearchHistory = (function() {
var STORAGE_KEY = 'wsCardsSearchHistory';
var MAX_ITEMS = 10;

/**
 * 取得歷史紀錄
 * @returns {Array} 歷史紀錄陣列
 */
function getHistory() {
    try {
        var data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('讀取搜尋歷史失敗:', e);
        return [];
    }
}

/**
 * 儲存歷史紀錄
 * @param {Array} history - 歷史紀錄陣列
 */
function saveHistory(history) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('儲存搜尋歷史失敗:', e);
    }
}

/**
 * 新增一筆歷史紀錄
 * @param {object} item - { cardNumber, cardName, cardTitle, cardRare, timestamp }
 */
function addItem(item) {
    if (!item || !item.cardNumber) return;

    var history = getHistory();

    // 移除重複項（同一張卡號）
    history = history.filter(function(h) {
        return h.cardNumber !== item.cardNumber;
    });

    // 加入時間戳
    item.timestamp = Date.now();

    // 插入到最前面
    history.unshift(item);

    // 超過上限就截斷
    if (history.length > MAX_ITEMS) {
        history = history.slice(0, MAX_ITEMS);
    }

    saveHistory(history);
    renderHistory();
    console.log('搜尋歷史已新增:', item.cardNumber);
}

/**
 * 移除特定歷史紀錄
 * @param {string} cardNumber - 卡號
 */
function removeItem(cardNumber) {
    var history = getHistory();
    history = history.filter(function(h) {
        return h.cardNumber !== cardNumber;
    });
    saveHistory(history);
    renderHistory();
}

/**
 * 清空所有歷史紀錄
 */
function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    console.log('搜尋歷史已全部清除');
}

/**
 * 格式化時間差
 * @param {number} timestamp - 時間戳
 * @returns {string} 格式化後的時間文字
 */
function formatTimeAgo(timestamp) {
    var now = Date.now();
    var diff = now - timestamp;
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return minutes + ' 分鐘前';
    if (hours < 24) return hours + ' 小時前';
    if (days < 7) return days + ' 天前';
    // 超過一週顯示日期
    var date = new Date(timestamp);
    return (date.getMonth() + 1) + '/' + date.getDate();
}

/**
 * 稀有度對應顏色
 */
function getRareColor(rare) {
    if (!rare) return '#718096';
    var r = rare.toUpperCase();
    if (r.indexOf('SSP') >= 0 || r.indexOf('SEC') >= 0 || r.indexOf('SP') >= 0) return '#e53e3e';
    if (r.indexOf('SR') >= 0 || r.indexOf('OFR') >= 0) return '#d69e2e';
    if (r.indexOf('RRR') >= 0) return '#805ad5';
    if (r.indexOf('RR') >= 0) return '#3182ce';
    if (r.indexOf('R') >= 0) return '#38a169';
    return '#718096';
}

/**
 * 渲染歷史紀錄到 DOM
 */
function renderHistory() {
    var container = document.getElementById('searchHistoryContainer');
    var wrapper = document.getElementById('searchHistoryWrapper');
    if (!container || !wrapper) return;

    var history = getHistory();

    if (history.length === 0) {
        wrapper.style.display = 'none';
        return;
    }

    wrapper.style.display = 'block';

    // 更新計數
    var countEl = document.getElementById('historyCount');
    if (countEl) {
        countEl.textContent = history.length;
    }

    var html = '';
    history.forEach(function(item, index) {
        var rareColor = getRareColor(item.cardRare);
        var timeAgo = formatTimeAgo(item.timestamp);
        
        html += '<div class="history-item" data-card-number="' + escapeHtml(item.cardNumber) + '" title="點擊快速查詢 ' + escapeHtml(item.cardNumber) + '">';
        html += '  <div class="history-item-main" onclick="SearchHistory.clickItem(\'' + escapeJsString(item.cardNumber) + '\')">';
        html += '    <div class="history-item-left">';
        html += '      <span class="history-rare-badge" style="background:' + rareColor + '">' + escapeHtml(item.cardRare || '?') + '</span>';
        html += '      <div class="history-item-info">';
        html += '        <span class="history-card-number">' + escapeHtml(item.cardNumber) + '</span>';
        html += '        <span class="history-card-name">' + escapeHtml(item.cardName || '') + '</span>';
        html += '      </div>';
        html += '    </div>';
        html += '    <div class="history-item-right">';
        html += '      <span class="history-time">' + timeAgo + '</span>';
        html += '    </div>';
        html += '  </div>';
        html += '  <button class="history-remove-btn" onclick="event.stopPropagation(); SearchHistory.removeItem(\'' + escapeJsString(item.cardNumber) + '\')" title="移除">';
        html += '    <i class="fas fa-times"></i>';
        html += '  </button>';
        html += '</div>';
    });

    container.innerHTML = html;
}

/**
 * HTML 跳脫
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * JS 字串跳脫（用於 onclick 屬性）
 */
function escapeJsString(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * 點擊歷史紀錄項目 → 觸發搜尋
 * @param {string} cardNumber - 卡號
 */
function clickItem(cardNumber) {
    console.log('從歷史紀錄快速搜尋:', cardNumber);

    // 填入搜尋框
    var inputEl = document.getElementById('xxxx');
    if (inputEl) {
        inputEl.value = cardNumber;
        // 觸發 input 事件讓 typeahead 處理
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 直接呼叫卡號搜尋
    if (typeof searchByCardNumber === 'function') {
        searchByCardNumber(cardNumber);
    }
}

/**
 * 收集當前卡片的資訊，用於加入歷史紀錄
 * @returns {object|null}
 */
function collectCurrentCardInfo() {
    var cardNoEl = document.getElementById('cardno');
    var cardNameEl = document.getElementById('cardname');
    var cardRareEl = document.getElementById('cardrare');
    var cardTitleEl = document.getElementById('cardTitle');

    var cardNumber = cardNoEl ? cardNoEl.textContent.trim() : '';
    if (!cardNumber || cardNumber === '-' || cardNumber === 'BD/W54-070SSP') {
        // 嘗試從 cardNumber select 取得
        var selectEl = document.getElementById('cardNumber');
        if (selectEl && selectEl.selectedIndex >= 0) {
            cardNumber = selectEl.options[selectEl.selectedIndex].text.trim();
        }
    }

    if (!cardNumber || cardNumber === '選擇卡號' || cardNumber === '000/000-000') {
        return null;
    }

    return {
        cardNumber: cardNumber,
        cardName: cardNameEl ? cardNameEl.textContent.trim() : '',
        cardRare: cardRareEl ? cardRareEl.textContent.trim() : '',
        cardTitle: cardTitleEl ? (cardTitleEl.options[cardTitleEl.selectedIndex] ? cardTitleEl.options[cardTitleEl.selectedIndex].text.trim() : '') : ''
    };
}

/**
 * 初始化：頁面載入時渲染歷史
 */
function init() {
    renderHistory();
}

// 公開 API
return {
    getHistory: getHistory,
    addItem: addItem,
    removeItem: removeItem,
    clearAll: clearAll,
    renderHistory: renderHistory,
    clickItem: clickItem,
    collectCurrentCardInfo: collectCurrentCardInfo,
    init: init
};
})();

// ====================================================
// 下載統計圖片功能
// - 合成圖片：上方顯示卡片資訊+卡圖，中間顯示價格走勢圖
// - 使用純 Canvas API 繪製
// ====================================================

/**
* 生成並下載統計圖片
* 圖片結構：
*   上方 (460px)：左側卡片資訊+價格摘要，右上角卡片圖片
*   中間 (460px)：價格走勢圖
*   底部 (60px)：浮水印
*/
function generateStatsImage() {
// 檢查是否有價格圖表
if (!myChart) {
    Swal.fire({ icon: 'warning', title: '尚無圖表', text: '請先選擇卡片以載入價格走勢圖' });
    return;
}

// 收集卡片資訊
var cardNo = (document.getElementById('cardno') && document.getElementById('cardno').textContent !== '-') 
    ? document.getElementById('cardno').textContent : '';
var cardName = (document.getElementById('cardname') && document.getElementById('cardname').textContent !== '-') 
    ? document.getElementById('cardname').textContent : '';
var cardRare = (document.getElementById('cardrare') && document.getElementById('cardrare').textContent !== '-') 
    ? document.getElementById('cardrare').textContent : '';
var cardColor = (document.getElementById('cardcolor') && document.getElementById('cardcolor').textContent !== '-') 
    ? document.getElementById('cardcolor').textContent : '';
var cardLevel = (document.getElementById('cardlevel') && document.getElementById('cardlevel').textContent !== '-') 
    ? document.getElementById('cardlevel').textContent : '';
var cardPower = (document.getElementById('cardpower') && document.getElementById('cardpower').textContent !== '-') 
    ? document.getElementById('cardpower').textContent : '';

// 作品名稱（從 cardStandard 選擇器）
var cardStandardSelect = document.getElementById('cardStandard');
var productName = '';
if (cardStandardSelect && cardStandardSelect.selectedIndex >= 0) {
    productName = cardStandardSelect.options[cardStandardSelect.selectedIndex].text;
    if (productName === '選擇作品') productName = '';
}

// 系列名稱（從 cardTitle 選擇器）
var cardTitleSelect = document.getElementById('cardTitle');
var seriesName = '';
if (cardTitleSelect && cardTitleSelect.selectedIndex >= 0) {
    seriesName = cardTitleSelect.options[cardTitleSelect.selectedIndex].text;
    if (seriesName === '選擇主題') seriesName = '';
}

// 價格摘要資訊
var currentPrice = document.getElementById('summaryCurrentPrice') ? document.getElementById('summaryCurrentPrice').textContent : '--';
var highPrice = document.getElementById('summaryHighPrice') ? document.getElementById('summaryHighPrice').textContent : '--';
var lowPrice = document.getElementById('summaryLowPrice') ? document.getElementById('summaryLowPrice').textContent : '--';
var changePercent = document.getElementById('summaryChangePercent') ? document.getElementById('summaryChangePercent').textContent : '--';

// 取得卡片圖片 URL
var cardImgEl = document.getElementById('cardImg');
var cardImgSrc = (cardImgEl && cardImgEl.src) ? cardImgEl.src : '';

// 取得圖表 base64
var chartBase64 = '';
try {
    chartBase64 = myChart.toBase64Image();
} catch (e) {
    console.error('取得圖表圖片失敗:', e);
}

// ===== 載入卡片圖片（跨域），載入完成後再合成 =====
var cardImage = new Image();
cardImage.crossOrigin = 'anonymous';
var cardImageLoaded = false;

function doCompose() {
    _composeStatsCanvas({
        cardNo: cardNo,
        cardName: cardName,
        cardRare: cardRare,
        cardColor: cardColor,
        cardLevel: cardLevel,
        cardPower: cardPower,
        productName: productName,
        seriesName: seriesName,
        currentPrice: currentPrice,
        highPrice: highPrice,
        lowPrice: lowPrice,
        changePercent: changePercent,
        chartBase64: chartBase64,
        cardImage: cardImageLoaded ? cardImage : null
    });
}

if (cardImgSrc) {
    cardImage.onload = function() {
        cardImageLoaded = true;
        doCompose();
    };
    cardImage.onerror = function() {
        cardImageLoaded = false;
        doCompose();
    };
    cardImage.src = cardImgSrc;
    // 如果圖片已經在快取中
    if (cardImage.complete && cardImage.naturalWidth > 0) {
        cardImageLoaded = true;
    }
} else {
    doCompose();
}
}

/**
* 合成統計圖片 Canvas 並觸發下載
* @param {object} info - 所有需要的資料
*/
function _composeStatsCanvas(info) {
var IMG_WIDTH = 1200;
var HEADER_HEIGHT = 420;  // 上方資訊+卡圖區域
var CHART_HEIGHT = 500;   // 圖表區域
var FOOTER_HEIGHT = 60;   // 底部
var IMG_HEIGHT = HEADER_HEIGHT + CHART_HEIGHT + FOOTER_HEIGHT;

var offscreen = document.createElement('canvas');
offscreen.width = IMG_WIDTH;
offscreen.height = IMG_HEIGHT;
var ctx = offscreen.getContext('2d');

// --- 背景 ---
var bgGrad = ctx.createLinearGradient(0, 0, IMG_WIDTH, IMG_HEIGHT);
bgGrad.addColorStop(0, '#667eea');
bgGrad.addColorStop(1, '#764ba2');
ctx.fillStyle = bgGrad;
ctx.fillRect(0, 0, IMG_WIDTH, IMG_HEIGHT);

// 上方資訊區域：半透明白底
ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
ctx.beginPath();
ctx.rect(0, 0, IMG_WIDTH, HEADER_HEIGHT);
ctx.fill();

// ===== 右上角卡片圖片 =====
var CARD_IMG_WIDTH = 246.5;
var CARD_IMG_HEIGHT = 331.5;
var CARD_IMG_X = IMG_WIDTH - CARD_IMG_WIDTH - 40;
var CARD_IMG_Y = 35;
var textAreaRight = CARD_IMG_X - 30; // 文字區域右邊界（不與卡圖重疊）

if (info.cardImage) {
    try {
        // 卡片圖片底部陰影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 25;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 8;

        // 圓角裁切卡片圖片
        ctx.save();
        ctx.beginPath();
        roundRectPath(ctx, CARD_IMG_X, CARD_IMG_Y, CARD_IMG_WIDTH, CARD_IMG_HEIGHT, 12);
        ctx.clip();
        ctx.drawImage(info.cardImage, CARD_IMG_X, CARD_IMG_Y, CARD_IMG_WIDTH, CARD_IMG_HEIGHT);
        ctx.restore();

        // 重置陰影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 卡圖邊框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRectPath(ctx, CARD_IMG_X, CARD_IMG_Y, CARD_IMG_WIDTH, CARD_IMG_HEIGHT, 12);
        ctx.stroke();
    } catch (e) {
        console.warn('繪製卡片圖片失敗（可能跨域限制）:', e);
        // 繪製佔位框
        _drawCardPlaceholder(ctx, CARD_IMG_X, CARD_IMG_Y, CARD_IMG_WIDTH, CARD_IMG_HEIGHT);
    }
} else {
    // 沒有卡圖時繪製佔位框
    _drawCardPlaceholder(ctx, CARD_IMG_X, CARD_IMG_Y, CARD_IMG_WIDTH, CARD_IMG_HEIGHT);
}

// ===== 左側卡片文字資訊 =====
var leftPadding = 50;
var y = 48;

// WS-Cards 品牌標誌
ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
ctx.font = 'bold 16px "Noto Sans TC", sans-serif';
ctx.textAlign = 'left';
ctx.fillText('WS-Cards | 價格走勢統計', leftPadding, y);
y += 12;

// 分隔線
ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(leftPadding, y);
ctx.lineTo(textAreaRight, y);
ctx.stroke();
y += 32;

// 卡號（大字）
if (info.cardNo) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px "Noto Sans TC", "Source Sans Pro", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(info.cardNo, leftPadding, y);
    y += 52;
}

// 卡名
if (info.cardName) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '600 30px "Noto Sans TC", "Source Sans Pro", sans-serif';
    ctx.textAlign = 'left';
    var maxTextWidth = textAreaRight - leftPadding;
    var displayCardName = _truncateText(ctx, info.cardName, maxTextWidth);
    ctx.fillText(displayCardName, leftPadding, y);
    y += 44;
}

// 作品名稱
if (info.productName) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '500 20px "Noto Sans TC", "Source Sans Pro", sans-serif';
    var maxProdWidth = textAreaRight - leftPadding;
    var prodText = '作品：' + _truncateText(ctx, info.productName, maxProdWidth - ctx.measureText('作品：').width);
    ctx.fillText(prodText, leftPadding, y);
    y += 30;
}

// 系列名稱
if (info.seriesName) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '500 20px "Noto Sans TC", "Source Sans Pro", sans-serif';
    var maxSerWidth = textAreaRight - leftPadding;
    var serText = '系列：' + _truncateText(ctx, info.seriesName, maxSerWidth - ctx.measureText('系列：').width);
    ctx.fillText(serText, leftPadding, y);
    y += 35;
}

// ===== 價格摘要統計（2×2 網格）=====
var summaryStartY = HEADER_HEIGHT - 140;
var summaryItems = [
    { label: '目前價格', value: info.currentPrice, color: '#667eea', icon: '¥' },
    { label: '當月最高', value: info.highPrice, color: '#e53e3e', icon: '↑' },
    { label: '當月最低', value: info.lowPrice, color: '#38a169', icon: '↓' },
    { label: '近7天漲跌', value: info.changePercent, color: '#dd6b20', icon: '%' }
];

var summaryCardW = 340;
var summaryCardH = 56;
var summaryGapX = 20;
var summaryGapY = 12;
var summaryStartX = leftPadding;

for (var i = 0; i < summaryItems.length; i++) {
    var item = summaryItems[i];
    var col = i % 2;
    var row = Math.floor(i / 2);
    var sx = summaryStartX + col * (summaryCardW + summaryGapX);
    var sy = summaryStartY + row * (summaryCardH + summaryGapY);

    // 卡片背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.13)';
    roundRect(ctx, sx, sy, summaryCardW, summaryCardH, 10);
    ctx.fill();

    // 左側色條
    ctx.fillStyle = item.color;
    roundRect(ctx, sx, sy + 6, 4, summaryCardH - 12, 2);
    ctx.fill();

    // Icon 圓圈
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(sx + 28, sy + summaryCardH / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.icon, sx + 28, sy + summaryCardH / 2 + 5);

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 12px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, sx + 52, sy + 22);

    // Value
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.value, sx + 52, sy + 46);
}

// ===== 中間：價格走勢圖 =====
var chartY = HEADER_HEIGHT + 40;
var chartAreaWidth = IMG_WIDTH - 140;
var chartAreaHeight = CHART_HEIGHT - 20;
var chartX = 40;

// 圖表區域白色底+陰影
ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
ctx.shadowBlur = 20;
ctx.shadowOffsetY = 5;
ctx.fillStyle = '#FFFFFF';
roundRect(ctx, chartX, chartY, chartAreaWidth, chartAreaHeight, 12);
ctx.fill();
ctx.shadowColor = 'transparent';
ctx.shadowBlur = 0;
ctx.shadowOffsetY = 0;

// 繪製圖表
if (info.chartBase64) {
    var chartImg = new Image();
    chartImg.onload = function() {
        var padding = 15;
        ctx.save();
        ctx.beginPath();
        roundRectPath(ctx, chartX + padding, chartY + padding, chartAreaWidth - padding * 2, chartAreaHeight - padding * 2, 8);
        ctx.clip();
        ctx.drawImage(chartImg, chartX + padding, chartY + padding, chartAreaWidth - padding * 2, chartAreaHeight - padding * 2);
        ctx.restore();

        // 底部
        drawFooter(ctx, IMG_WIDTH, IMG_HEIGHT, FOOTER_HEIGHT);
        // 嘗試下載（可能因跨域 taint 失敗）
        _tryDownload(offscreen, info.cardNo);
    };
    chartImg.onerror = function() {
        drawFooter(ctx, IMG_WIDTH, IMG_HEIGHT, FOOTER_HEIGHT);
        _tryDownload(offscreen, info.cardNo);
    };
    chartImg.src = info.chartBase64;
} else {
    drawFooter(ctx, IMG_WIDTH, IMG_HEIGHT, FOOTER_HEIGHT);
    _tryDownload(offscreen, info.cardNo);
}
}

/**
* 嘗試下載 canvas，若因跨域 taint 失敗則重試不含卡圖
*/
function _tryDownload(canvas, cardNo) {
try {
    triggerDownload(canvas, cardNo);
} catch (e) {
    console.warn('Canvas tainted，嘗試不含卡圖重新生成...', e);
    // 跨域導致 taint，重新生成不含卡圖的版本
    Swal.fire({
        icon: 'info',
        title: '跨域限制',
        text: '由於卡片圖片跨域限制，將生成不含卡圖的版本',
        timer: 2000,
        showConfirmButton: false
    });
    // 重新呼叫，但不帶卡圖
    var infoWithoutImg = Object.assign({}, _lastComposeInfo || {});
    infoWithoutImg.cardImage = null;
    _composeStatsCanvas(infoWithoutImg);
}
}

/**
* 繪製卡圖佔位框
*/
function _drawCardPlaceholder(ctx, x, y, w, h) {
ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
roundRect(ctx, x, y, w, h, 12);
ctx.fill();

ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
ctx.lineWidth = 2;
ctx.setLineDash([8, 6]);
ctx.beginPath();
roundRectPath(ctx, x, y, w, h, 12);
ctx.stroke();
ctx.setLineDash([]);

// 圖示
ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
ctx.font = '48px "Font Awesome 5 Free", sans-serif';
ctx.textAlign = 'center';
ctx.fillText('🃏', x + w / 2, y + h / 2 + 10);

ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
ctx.font = '14px "Noto Sans TC", sans-serif';
ctx.fillText('Card Image', x + w / 2, y + h / 2 + 40);
}

/**
* 繪製標籤 tag
* @returns {number} 下一個 tag 的 x 座標
*/
function _drawTag(ctx, x, y, text, bgColor) {
ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
var textWidth = ctx.measureText(text).width;
var tagW = textWidth + 20;
var tagH = 28;

ctx.fillStyle = bgColor;
roundRect(ctx, x, y - tagH + 6, tagW, tagH, 6);
ctx.fill();

ctx.fillStyle = '#FFFFFF';
ctx.textAlign = 'left';
ctx.fillText(text, x + 10, y);

return x + tagW + 8;
}

/**
* 稀有度對應標籤顏色
*/
function _getRareTagColor(rare) {
var rareUpper = (rare || '').toUpperCase();
if (rareUpper.indexOf('SSP') >= 0 || rareUpper.indexOf('SEC') >= 0) return '#d69e2e';
if (rareUpper.indexOf('SP') >= 0) return '#ed8936';
if (rareUpper.indexOf('RRR') >= 0 || rareUpper.indexOf('OFR') >= 0) return '#e53e3e';
if (rareUpper.indexOf('SR') >= 0 || rareUpper.indexOf('RR') >= 0) return '#9f7aea';
if (rareUpper.indexOf('R') >= 0) return '#667eea';
if (rareUpper.indexOf('U') >= 0) return '#38a169';
if (rareUpper.indexOf('C') >= 0 || rareUpper.indexOf('CR') >= 0) return '#718096';
return '#5a67d8';
}

/**
* 卡片顏色對應背景
*/
function _getCardColorBg(colorText) {
if (colorText === '藍' || colorText === '青') return '#2b6cb0';
if (colorText === '紅' || colorText === '赤') return '#c53030';
if (colorText === '黃' || colorText === '黄') return '#b7791f';
if (colorText === '綠' || colorText === '緑') return '#276749';
return '#718096';
}

/**
* 文字截斷（根據 canvas measureText）
*/
function _truncateText(ctx, text, maxWidth) {
if (ctx.measureText(text).width <= maxWidth) return text;
var truncated = text;
while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.substring(0, truncated.length - 1);
}
return truncated + '...';
}

/**
* 繪製底部浮水印
*/
function drawFooter(ctx, imgWidth, imgHeight, footerHeight) {
var footerY = imgHeight - footerHeight;
ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
ctx.fillRect(0, footerY, imgWidth, footerHeight);

ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
ctx.font = '14px "Noto Sans TC", sans-serif';
ctx.textAlign = 'center';
ctx.fillText('WS-Cards (ws-cards.cloud)  ·  資料來源：遊々亭  ·  ' + new Date().toLocaleDateString('zh-TW'), imgWidth / 2, footerY + 35);
}

/**
* 觸發下載
*/
function triggerDownload(canvas, cardNo) {
try {
    var dataURL = canvas.toDataURL('image/jpeg', 0.92);
    var link = document.createElement('a');
    var fileName = 'stats';
    if (cardNo) {
        fileName = cardNo.replace(/\//g, '_').replace(/\s/g, '') + '_stats';
    }
    link.download = fileName + '.jpg';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Swal.fire({
        icon: 'success',
        title: '圖片已下載',
        text: fileName + '.jpg',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
} catch (e) {
    console.error('下載圖片失敗:', e);
    Swal.fire({ icon: 'error', title: '下載失敗', text: '無法生成圖片：' + e.message });
}
}

/**
* 繪製圓角矩形（填充用）
*/
function roundRect(ctx, x, y, width, height, radius) {
ctx.beginPath();
ctx.moveTo(x + radius, y);
ctx.lineTo(x + width - radius, y);
ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
ctx.lineTo(x + width, y + height - radius);
ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
ctx.lineTo(x + radius, y + height);
ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
ctx.lineTo(x, y + radius);
ctx.quadraticCurveTo(x, y, x + radius, y);
ctx.closePath();
}

/**
* 圓角矩形路徑（用於 clip）
*/
function roundRectPath(ctx, x, y, width, height, radius) {
ctx.moveTo(x + radius, y);
ctx.lineTo(x + width - radius, y);
ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
ctx.lineTo(x + width, y + height - radius);
ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
ctx.lineTo(x + radius, y + height);
ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
ctx.lineTo(x, y + radius);
ctx.quadraticCurveTo(x, y, x + radius, y);
ctx.closePath();
}

// ====================================================
// 鑑定卡資訊模組
// - 顯示 PSA / BGS / ARS 鑑定等級分佈
// - 計算 10 分率
// ====================================================

var GradingModule = (function() {
var currentCompany = 'PSA';
var gradingData = null;
var selectedGrade = null;
var requestURLGradingBase = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/gradingJson/';

var GRADING_COMPANIES = ['PSA', 'BGS', 'ARS'];

function gradeToNumber(grade) {
    if (grade === '10+') return 10.5;
    if (grade === '黑10') return 10.2;
    if (grade === '金10') return 10.1;
    var num = parseFloat(grade);
    if (!isNaN(num)) return num;
    if (grade.indexOf('以下') > -1) {
        var base = parseFloat(grade);
        return isNaN(base) ? -1 : base - 0.5;
    }
    return -1;
}

function calculateSummaryStats(allGrades, totalCount, grade) {
    var selectedCount = 0;
    var higherCount = 0;
    var selectedNum = gradeToNumber(grade);
    allGrades.forEach(function(g) {
        if (g.grade === grade) selectedCount = g.count;
        if (gradeToNumber(g.grade) > selectedNum) higherCount += g.count;
    });
    var gradeRate = totalCount > 0 ? ((selectedCount / totalCount) * 100).toFixed(2) : '0.00';
    return { selectedCount: selectedCount, higherCount: higherCount, gradeRate: gradeRate };
}

function init() {
    var buttons = document.querySelectorAll('.grading-toggle-btn');
    buttons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var company = btn.getAttribute('data-company');
            switchCompany(company);
        });
    });
}

function switchCompany(company) {
    currentCompany = company;
    selectedGrade = null;
    var buttons = document.querySelectorAll('.grading-toggle-btn');
    buttons.forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-company') === company);
    });
    renderGradingData();
}

/**
 * 讀取單一鑑定公司 JSON
 * URL 格式: {base}{titleCode}_{company}.json
 * JSON 格式: { "卡號": { "等級": 數量 } } 或 { "卡號": null }
 */
function fetchCompanyData(titleCode, cardNumber, company) {
    var url = requestURLGradingBase + titleCode + '_' + company + '.json';
    return fetch(url)
        .then(function(response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function(data) {
            if (data && data[cardNumber] && typeof data[cardNumber] === 'object') {
                var cardData = data[cardNumber];
                if (data.updateDate) {
                    cardData._updateDate = data.updateDate;
                }
                return cardData;
            }
            return null;
        })
        .catch(function() {
            return null;
        });
}

/**
 * 載入鑑定資料（分別讀取 PSA / BGS / ARS 三個 JSON）
 * @param {string} titleCode - 作品代碼（已替換 / 為 _）
 * @param {string} cardNumber - 顯示用卡號（如 BD/W54-070SSP）
 */
function loadGradingData(titleCode, cardNumber) {
    if (!titleCode || !cardNumber || cardNumber === '000/000-000' || cardNumber === '選擇卡號') {
        resetUI();
        return;
    }

    console.log('載入鑑定資料, titleCode:', titleCode, '卡號:', cardNumber);

    var promises = GRADING_COMPANIES.map(function(company) {
        return fetchCompanyData(titleCode, cardNumber, company);
    });

    Promise.all(promises).then(function(results) {
        gradingData = {};
        GRADING_COMPANIES.forEach(function(company, index) {
            gradingData[company] = results[index];
        });

        var hasAny = GRADING_COMPANIES.some(function(c) { return gradingData[c] !== null; });
        if (!hasAny) {
            gradingData = null;
            console.log('此卡片無鑑定資料:', cardNumber);
        } else {
            console.log('鑑定資料載入完成:', cardNumber, gradingData);
        }

        updateButtonStates();
        renderGradingData();
    });
}

function updateButtonStates() {
    var companies = ['PSA', 'BGS', 'ARS'];
    companies.forEach(function(company) {
        var btn = document.getElementById('btn' + company);
        if (!btn) return;
        btn.disabled = false;
    });
}

function renderGradingData() {
    var container = document.getElementById('gradingContent');
    var tenRateContainer = document.getElementById('gradingTenRate');
    if (!container) return;

    if (tenRateContainer) tenRateContainer.style.display = 'none';

    if (!gradingData || !gradingData[currentCompany] ||
        typeof gradingData[currentCompany] !== 'object' ||
        Object.keys(gradingData[currentCompany]).length === 0) {
        container.innerHTML =
            '<div class="grading-placeholder">' +
            '<p>此卡片暫無 ' + currentCompany + ' 鑑定資料</p>' +
            '</div>';
        return;
    }

    var companyData = gradingData[currentCompany];

    var allGrades = [];
    var totalCount = 0;
    Object.keys(companyData).forEach(function(key) {
        if (key === '_updateDate') return;
        var count = parseInt(companyData[key], 10) || 0;
        allGrades.push({ grade: key, count: count });
        totalCount += count;
    });

    allGrades.sort(function(a, b) {
        return gradeToNumber(b.grade) - gradeToNumber(a.grade);
    });

    var visibleGrades = allGrades.filter(function(g) { return g.count > 0; });
    var topGrades = visibleGrades.slice(0, 4);

    if (!selectedGrade || !visibleGrades.find(function(g) { return g.grade === selectedGrade; })) {
        selectedGrade = topGrades.length > 0 ? topGrades[0].grade : null;
    }

    var stats = calculateSummaryStats(allGrades, totalCount, selectedGrade);
    var html = '';

    if (companyData._updateDate) {
        html += '<div style="font-size:0.75rem; color:var(--text-secondary); text-align:right; margin-bottom:0.5rem;">' +
                '<i class="fas fa-clock mr-1"></i>資料更新日期: ' + companyData._updateDate + '</div>';
    }

    html += '<div class="grading-grade-cards">';
    topGrades.forEach(function(g) {
        var sel = g.grade === selectedGrade ? ' selected' : '';
        html += '<div class="grading-grade-card' + sel + '" data-grade="' + g.grade + '">';
        html += '<div class="grading-grade-card-label">' + currentCompany + ' ' + g.grade + '</div>';
        html += '<div class="grading-grade-card-count">' + g.count.toLocaleString() + '</div>';
        html += '</div>';
    });
    html += '</div>';

    html += '<div class="grading-summary-grid">';
    html += '<div class="grading-summary-item"><div class="grading-summary-label">Total Population</div>';
    html += '<div class="grading-summary-value" id="gradingSummaryTotal">' + totalCount.toLocaleString() + '</div></div>';
    html += '<div class="grading-summary-item"><div class="grading-summary-label" id="gradingSummaryGradeLabel">' + currentCompany + ' ' + (selectedGrade || '-') + ' Population</div>';
    html += '<div class="grading-summary-value" id="gradingSummaryGradeCount">' + stats.selectedCount.toLocaleString() + '</div></div>';
    html += '<div class="grading-summary-item"><div class="grading-summary-label">Population Higher</div>';
    html += '<div class="grading-summary-value" id="gradingSummaryHigher">' + stats.higherCount.toLocaleString() + '</div></div>';
    html += '<div class="grading-summary-item"><div class="grading-summary-label">Grade Rate <span class="grade-rate-info" title="此等級佔總鑑定數的比例">&#9432;</span></div>';
    html += '<div class="grading-summary-value" id="gradingSummaryRate">' + stats.gradeRate + '%</div></div>';
    html += '</div>';

    html += '<div class="grading-detail-table-wrap">';
    html += '<table class="grading-detail-table">';
    html += '<thead><tr><th>Grade</th><th>Quantity</th><th>Qualifier</th></tr></thead>';
    html += '<tbody>';
    visibleGrades.forEach(function(g) {
        html += '<tr><td><strong>' + g.grade + '</strong></td><td>' + g.count.toLocaleString() + '</td><td>-</td></tr>';
    });
    html += '<tr class="grading-detail-total-row"><td><strong>Total</strong></td><td><strong>' + totalCount.toLocaleString() + '</strong></td><td>-</td></tr>';
    html += '</tbody></table>';
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.grading-grade-card').forEach(function(card) {
        card.addEventListener('click', function() {
            selectGradeCard(card.getAttribute('data-grade'));
        });
    });
}

function selectGradeCard(grade) {
    selectedGrade = grade;

    document.querySelectorAll('.grading-grade-card').forEach(function(card) {
        card.classList.toggle('selected', card.getAttribute('data-grade') === grade);
    });

    var companyData = gradingData[currentCompany];
    var allGrades = [];
    var totalCount = 0;
    Object.keys(companyData).forEach(function(key) {
        if (key === '_updateDate') return;
        var count = parseInt(companyData[key], 10) || 0;
        allGrades.push({ grade: key, count: count });
        totalCount += count;
    });

    var stats = calculateSummaryStats(allGrades, totalCount, grade);

    var labelEl = document.getElementById('gradingSummaryGradeLabel');
    var countEl = document.getElementById('gradingSummaryGradeCount');
    var higherEl = document.getElementById('gradingSummaryHigher');
    var rateEl = document.getElementById('gradingSummaryRate');
    if (labelEl) labelEl.textContent = currentCompany + ' ' + grade + ' Population';
    if (countEl) countEl.textContent = stats.selectedCount.toLocaleString();
    if (higherEl) higherEl.textContent = stats.higherCount.toLocaleString();
    if (rateEl) rateEl.textContent = stats.gradeRate + '%';
}

function resetUI() {
    gradingData = null;
    currentCompany = 'PSA';
    selectedGrade = null;

    var container = document.getElementById('gradingContent');
    var tenRateContainer = document.getElementById('gradingTenRate');

    if (container) {
        container.innerHTML =
            '<div class="grading-placeholder">' +
            '<p>請選擇卡片查看鑑定資訊</p>' +
            '</div>';
    }
    if (tenRateContainer) {
        tenRateContainer.style.display = 'none';
    }

    ['PSA', 'BGS', 'ARS'].forEach(function(company) {
        var btn = document.getElementById('btn' + company);
        if (btn) {
            btn.disabled = false;
            btn.classList.toggle('active', company === 'PSA');
        }
    });
}

return {
    init: init,
    loadGradingData: loadGradingData,
    switchCompany: switchCompany,
    resetUI: resetUI
};
})();
