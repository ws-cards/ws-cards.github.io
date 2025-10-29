/**
 * WS Cards Line Chart Application
 * 現代化的卡片價格趨勢圖表應用程式
 */
class WSCardsLineApp {
    constructor() {
        this.charts = {
            priceChart: null,
            stockChart: null
        };
        
        this.config = {
            baseURL: 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardData/',
            stockURL: 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/stockJson/',
            mappingURL: 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardDisplayMapping.json',
            titleURL: 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardTitle.json',
            standardWURL: 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_W.json',
            standardSURL: 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/json/cardStandard_S.json',
            defaultCard: {
                title: 'BD_W54',
                number: 'BD/W54-070SSP'
            }
        };
        
        this.data = {
            mappingRep: null,
            standardW: null,
            standardS: null,
            currentTitle: null,
            currentPriceData: null,
            currentStockData: null
        };
        
        this.elements = {
            cardStandard: null,
            cardTitle: null,
            cardNumber: null,
            cardImg: null,
            overlays: []
        };
        
        this.init();
    }

    /**
     * 初始化應用程式
     */
    async init() {
        try {
            // 移動端優化
            this.handleMobileOptimization();
            
            // 快取DOM元素
            this.cacheElements();
            
            // 載入初始資料
            await this.loadInitialData();
            
            // 設置事件監聽器
            this.setupEventListeners();
            
            // 設置UI
            this.setupUI();
            
            // 載入預設圖表
            await this.loadDefaultChart();
            
            console.log('WSCardsLineApp 初始化完成');
        } catch (error) {
            console.error('初始化失敗:', error);
            this.showError('應用程式初始化失敗，請重新載入頁面');
        }
    }

    /**
     * 移動端優化
     */
    handleMobileOptimization() {
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 100);
    }

    /**
     * 快取DOM元素
     */
    cacheElements() {
        this.elements = {
            cardStandard: document.getElementById('cardStandard'),
            cardTitle: document.getElementById('cardTitle'),
            cardNumber: document.getElementById('cardNumber'),
            cardImg: document.getElementById('cardImg'),
            overlays: [
                document.getElementById('overlay-1'),
                document.getElementById('overlay-2'),
                document.getElementById('overlay-3')
            ]
        };
    }

    /**
     * 載入初始資料
     */
    async loadInitialData() {
        try {
            const promises = [
                this.fetchJSON(this.config.mappingURL),
                this.fetchJSON(this.config.standardWURL),
                this.fetchJSON(this.config.standardSURL),
                this.fetchJSON(this.config.titleURL)
            ];

            const [mapping, standardW, standardS, titles] = await Promise.all(promises);
            
            this.data.mappingRep = mapping;
            this.data.standardW = standardW;
            this.data.standardS = standardS;
            this.data.titles = titles;
            
            console.log('初始資料載入完成');
        } catch (error) {
            console.error('載入初始資料失敗:', error);
            throw new Error('無法載入基礎資料');
        }
    }

    /**
     * 使用現代化的 fetch API 取代 XMLHttpRequest
     */
    async fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for URL: ${url}`);
        }
        return await response.json();
    }

    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        // 使用事件委派處理選擇器變更
        document.addEventListener('change', this.handleSelectChange.bind(this));
        
        // 搜尋輸入防抖處理
        const searchInput = document.querySelector('.typeahead');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }
    }

    /**
     * 處理搜尋功能 (由 Typeahead 處理，這裡預留接口)
     */
    handleSearch(query) {
        // Typeahead 已經處理搜尋功能，這裡可以添加額外的搜尋邏輯
        console.log('搜尋查詢:', query);
    }

    /**
     * 統一處理選擇器變更事件
     */
    async handleSelectChange(event) {
        const target = event.target;
        
        try {
            switch (target.id) {
                case 'cardStandard':
                    this.removeTitle();
                    await this.changeStandard();
                    break;
                case 'cardTitle':
                    await this.changeTitle();
                    break;
                case 'cardNumber':
                    await this.changeNumber();
                    break;
            }
        } catch (error) {
            console.error('處理選擇器變更失敗:', error);
            this.showError('操作失敗，請稍後再試');
        }
    }
}

// Typeahead 設定資料
const typeaheadData = [
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
{id:"WS00155", name:"怪獣８号",cname:"怪獸8號 | 怪8 | KJ8"}	
];

// 全域應用程式實例
let wsCardsApp;

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 載入完成，初始化應用程式...');
    wsCardsApp = new WSCardsLineApp();
});

// 確保 jQuery 載入完成後再初始化 Typeahead
$(document).ready(function() {
    console.log('jQuery 載入完成，初始化 Typeahead...');
    // 保持原有的 jQuery typeahead 功能，但整合到類別中
    initializeTypeahead();
});

/**
 * 初始化 Typeahead 功能
 */
function initializeTypeahead() {
    // 確保 jQuery 和 Typeahead 已載入
    if (typeof $ === 'undefined' || typeof $.fn.typeahead === 'undefined') {
        console.warn('jQuery 或 Typeahead 尚未載入，延遲初始化');
        setTimeout(initializeTypeahead, 100);
        return;
    }

    $(".typeahead").typeahead({ 
        source: typeaheadData,
        minLength: 1,
        showHintOnFocus: true,
        scrollHeight: 0,
        items: 'all',
        matcher: function (item) {
            var it = this.displayText(item);
            var cname = item.cname + "";
            if(cname.indexOf(this.query) >= 0){
                return item.name;
            } else if(cname.toLowerCase().indexOf(this.query) >= 0){
                return item.name;
            } else if(cname.toLowerCase().indexOf(this.query.toLowerCase()) >= 0){
                return item.name;
            }
            return ~it.toLowerCase().indexOf(this.query.toLowerCase());
        },
        fitToElement: true,
        selectOnBlur: false
    });

    // Typeahead 變更事件處理
    $(".typeahead").change(function() {
        var current = $(this).typeahead("getActive");
        if (current && current.name === $(this).val()) {
            if (wsCardsApp && typeof wsCardsApp.changeStandardForSuggest === 'function') {
                wsCardsApp.changeStandardForSuggest(current.name);
            }
        }
    });
    
    console.log('Typeahead 初始化完成');
}

// 擴展 WSCardsLineApp 類別的方法
WSCardsLineApp.prototype.setupUI = function() {
    // 重置選擇器
    this.resetSelectors();
    
    // 載入標準資料到選擇器
    this.loadStandardData();
    
    // 載入標題資料到選擇器  
    this.loadTitleData();
};

WSCardsLineApp.prototype.resetSelectors = function() {
    const { cardStandard, cardTitle, cardNumber } = this.elements;
    
    if (cardStandard) {
        cardStandard.length = 1;
        cardStandard.options[0].selected = true;
    }
    
    if (cardTitle) {
        cardTitle.length = 1;
        cardTitle.options[0].selected = true;
    }
    
    if (cardNumber) {
        cardNumber.length = 1;
        cardNumber.options[0].selected = true;
        cardNumber.style.visibility = 'hidden';
    }
};

WSCardsLineApp.prototype.loadStandardData = function() {
    const { cardStandard } = this.elements;
    if (!cardStandard || !this.data.standardW || !this.data.standardS) return;
    
    // 載入 Weiss 資料
    const optgroupW = document.getElementById("Weiss");
    if (optgroupW && this.data.standardW) {
        for (const key in this.data.standardW) {
            const option = document.createElement("option");
            option.setAttribute("value", this.data.standardW[key]);
            option.setAttribute("id", key);
            option.appendChild(document.createTextNode(key));
            optgroupW.appendChild(option);
        }
    }
    
    // 載入 Schwarz 資料
    const optgroupS = document.getElementById("Schwarz");
    if (optgroupS && this.data.standardS) {
        for (const key in this.data.standardS) {
            const option = document.createElement("option");
            option.setAttribute("value", this.data.standardS[key]);
            option.setAttribute("id", key);
            option.appendChild(document.createTextNode(key));
            optgroupS.appendChild(option);
        }
    }
};

WSCardsLineApp.prototype.loadTitleData = function() {
    const { cardTitle } = this.elements;
    if (!cardTitle || !this.data.titles) return;
    
    // 首先添加預設選項
    const defaultOption = document.createElement("option");
    defaultOption.setAttribute("value", "");
    defaultOption.appendChild(document.createTextNode("--選擇主題--"));
    cardTitle.appendChild(defaultOption);
    
    // 然後添加所有標題選項
    for (const key in this.data.titles) {
        const option = document.createElement("option");
        option.setAttribute("value", key);
        option.appendChild(document.createTextNode(this.data.titles[key]));
        cardTitle.appendChild(option);
    }
    
    console.log(`已載入 ${Object.keys(this.data.titles).length + 1} 個主題選項（包含預設選項）`);
};

WSCardsLineApp.prototype.loadDefaultChart = async function() {
    try {
        this.showLoading(['overlay-1', 'overlay-2', 'overlay-3']);
        
        const [priceData, stockData] = await Promise.all([
            this.fetchJSON(`${this.config.baseURL}${this.config.defaultCard.title}.json`),
            this.fetchJSON(`${this.config.stockURL}${this.config.defaultCard.title}.json`)
        ]);
        
        await this.createPriceChart(priceData, this.config.defaultCard.number, this.config.defaultCard.number);
        await this.createStockChart(stockData, this.config.defaultCard.number, this.config.defaultCard.number);
        this.updateCardImage(this.config.defaultCard.number);
        
    } catch (error) {
        console.error('載入預設圖表失敗:', error);
        this.showError('載入預設圖表失敗');
    } finally {
        this.hideLoading(['overlay-1', 'overlay-2', 'overlay-3']);
    }
};
// 核心選擇器處理方法
WSCardsLineApp.prototype.changeStandard = async function() {
    const cardStandard = this.elements.cardStandard.value;
    const selectTitle = this.elements.cardTitle;
    
    // 清空標題選擇器
    this.clearSelectOptions(selectTitle);
    
    // 首先添加預設選項到第一個位置
    const defaultOption = document.createElement("option");
    defaultOption.setAttribute("value", "");
    defaultOption.appendChild(document.createTextNode("--選擇主題--"));
    selectTitle.appendChild(defaultOption);
    
    try {
        const cardsTitle = this.data.titles;
        const cardStandardArray = cardStandard.split(",");
        
        for (const key in cardsTitle) {
            const keyStr = key.substr(0, key.indexOf('/'));
            const filtered = cardStandardArray.filter(value => value === keyStr);
            
            if (filtered.length > 0) {
                const option = document.createElement("option");
                option.setAttribute("value", key);
                option.appendChild(document.createTextNode(cardsTitle[key]));
                selectTitle.appendChild(option);
            }
        }
        
        // 確保預設選項被選中
        selectTitle.selectedIndex = 0;
        
        console.log(`cardTitle 已更新，共 ${selectTitle.options.length} 個選項（包含預設選項）`);
        
        // 驗證預設選項是否正確設置
        this.validateDefaultOption(selectTitle, 'cardTitle');
        
        this.changeStandardAfterChangeNumber();
    } catch (error) {
        console.error('變更標準失敗:', error);
        this.showError('載入主題列表失敗');
    }
};

WSCardsLineApp.prototype.changeStandardForSuggest = function(productName) {
    const element = document.getElementById(productName);
    if (element) {
        element.selected = true;
        this.changeStandard();
    }
};

WSCardsLineApp.prototype.removeTitle = function() {
    const notUseElement = document.getElementById('notuse');
    if (notUseElement) {
        notUseElement.style.display = 'none';
    }
};

WSCardsLineApp.prototype.changeStandardAfterChangeNumber = function() {
    const selectPrice = this.elements.cardNumber;
    
    // 顯示卡號選擇器並重置為預設狀態
    selectPrice.style.visibility = 'visible';
    this.clearSelectOptions(selectPrice);
    
    // 添加卡號選擇器的預設選項
    const option = document.createElement("option");
    option.setAttribute("value", "");
    option.appendChild(document.createTextNode("--選擇卡號--"));
    selectPrice.appendChild(option);
    
    console.log('cardNumber 選擇器已重置');
};

WSCardsLineApp.prototype.changeTitle = async function() {
    console.log("變更標題開始");
    
    try {
        this.showLoading(['overlay-2', 'overlay-3']);
        
        const cardTitle = this.elements.cardTitle.value;
        const selectPrice = this.elements.cardNumber;
        
        selectPrice.style.visibility = 'visible';
        this.clearSelectOptions(selectPrice);
        
        // 添加預設選項
        const defaultOption = document.createElement("option");
        defaultOption.setAttribute("value", "");
        defaultOption.appendChild(document.createTextNode("--選擇卡號--"));
        selectPrice.appendChild(defaultOption);
        
        const cardTitleFormatted = cardTitle.replace('/', '_');
        console.log(`${cardTitle} -> ${cardTitleFormatted}`);
        
        const priceData = await this.fetchJSON(`${this.config.baseURL}${cardTitleFormatted}.json`);
        
        // 使用 Set 來避免重複選項
        const addedValues = new Set();
        
        // 更新卡號選項
        for (const key in priceData) {
            // 檢查是否已經添加過這個值
            if (addedValues.has(key)) {
                console.warn(`重複的卡號已跳過: ${key}`);
                continue;
            }
            
            const option = document.createElement("option");
            option.setAttribute("value", key);
            
            let displayText;
            if (key.indexOf('/') < 0 && key.indexOf('S') === 0) {
                displayText = this.data.mappingRep[key] || key;
            } else {
                displayText = key;
            }
            
            option.appendChild(document.createTextNode(displayText));
            selectPrice.appendChild(option);
            
            // 記錄已添加的值
            addedValues.add(key);
        }
        
        console.log(`已添加 ${addedValues.size} 個卡號選項`);
        
        this.sortSelectOptions(selectPrice);
        
        // 調試：檢查是否還有重複項
        this.checkDuplicateOptions(selectPrice, 'cardNumber');
        
        selectPrice.options[0].selected = true;
        await this.changeNumber();
        
    } catch (error) {
        console.error('變更標題失敗:', error);
        this.showError('載入卡號列表失敗');
    } finally {
        this.hideLoading(['overlay-2', 'overlay-3']);
    }
};

WSCardsLineApp.prototype.changeNumber = async function() {
    const cardTitle = this.elements.cardTitle.value;
    const cardTitleFormatted = cardTitle.replace('/', '_');
    
    try {
        this.showLoading(['overlay-1', 'overlay-2', 'overlay-3']);
        
        const [priceData, stockData] = await Promise.all([
            this.fetchJSON(`${this.config.baseURL}${cardTitleFormatted}.json`),
            this.fetchJSON(`${this.config.stockURL}${cardTitleFormatted}.json`)
        ]);
        
        const cardNumberSelect = this.elements.cardNumber;
        const selectedIndex = cardNumberSelect.selectedIndex;
        const cardNumberDisplay = cardNumberSelect.options[selectedIndex].text;
        const internalCardNumber = cardNumberSelect.options[selectedIndex].value;
        
        // 銷毀舊圖表
        this.destroyCharts();
        
        // 建立新圖表
        await Promise.all([
            this.createPriceChart(priceData, internalCardNumber, cardNumberDisplay),
            this.createStockChart(stockData, internalCardNumber, cardNumberDisplay)
        ]);
        
        this.updateCardImage(cardNumberDisplay);
        
    } catch (error) {
        console.error('變更卡號失敗:', error);
        this.showError('載入圖表失敗');
    } finally {
        this.hideLoading(['overlay-1', 'overlay-2', 'overlay-3']);
    }
};

// 工具方法
WSCardsLineApp.prototype.clearSelectOptions = function(selectElement) {
    while (selectElement.firstChild) {
        selectElement.removeChild(selectElement.firstChild);
    }
};

/**
 * 移除選擇器中的重複選項
 */
WSCardsLineApp.prototype.removeDuplicateOptions = function(selectElement) {
    const options = Array.from(selectElement.options);
    const seenValues = new Set();
    const uniqueOptions = [];
    
    options.forEach(option => {
        const value = option.value;
        
        if (!seenValues.has(value)) {
            seenValues.add(value);
            uniqueOptions.push(option);
        } else {
            console.warn(`移除重複選項: ${value} (${option.textContent})`);
            option.remove();
        }
    });
    
    return uniqueOptions.length;
};

WSCardsLineApp.prototype.sortSelectOptions = function(selectElement) {
    // 保存第一個選項（通常是預設選項）
    const firstOption = selectElement.options[0];
    const options = Array.from(selectElement.options).slice(1); // 跳過第一個選項
    
    // 過濾掉空值或重複值
    const uniqueOptions = [];
    const seenValues = new Set();
    
    options.forEach(option => {
        const value = option.value;
        const text = option.textContent;
        
        // 檢查是否為空值或重複值
        if (value && !seenValues.has(value)) {
            seenValues.add(value);
            uniqueOptions.push(option);
        } else if (value) {
            console.warn(`發現重複的選項值，已移除: ${value} (${text})`);
        }
    });
    
    // 排序選項
    uniqueOptions.sort((a, b) => {
        return a.textContent.localeCompare(b.textContent, 'zh-TW', {
            numeric: true,
            sensitivity: 'base'
        });
    });
    
    // 清空並重新添加
    selectElement.innerHTML = '';
    selectElement.appendChild(firstOption);
    uniqueOptions.forEach(option => selectElement.appendChild(option));
    
    console.log(`排序完成，共 ${uniqueOptions.length + 1} 個選項（包含預設選項）`);
};

WSCardsLineApp.prototype.showLoading = function(overlayIds) {
    overlayIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'block';
    });
};

WSCardsLineApp.prototype.hideLoading = function(overlayIds) {
    overlayIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
};

WSCardsLineApp.prototype.showError = function(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: '錯誤',
            text: message
        });
    } else {
        alert(message);
    }
};

/**
 * 調試方法：檢查選擇器中的重複值
 */
WSCardsLineApp.prototype.checkDuplicateOptions = function(selectElement, elementName = 'Unknown') {
    const options = Array.from(selectElement.options);
    const valueCount = new Map();
    
    options.forEach(option => {
        const value = option.value;
        if (valueCount.has(value)) {
            valueCount.set(value, valueCount.get(value) + 1);
        } else {
            valueCount.set(value, 1);
        }
    });
    
    const duplicates = Array.from(valueCount.entries()).filter(([value, count]) => count > 1);
    
    if (duplicates.length > 0) {
        console.warn(`${elementName} 中發現重複選項:`, duplicates);
        return duplicates;
    } else {
        console.log(`${elementName} 中沒有重複選項，共 ${options.length} 個選項`);
        return [];
    }
};

/**
 * 調試方法：驗證選擇器的第一個選項是否為預設選項
 */
WSCardsLineApp.prototype.validateDefaultOption = function(selectElement, elementName = 'Unknown') {
    if (selectElement.options.length === 0) {
        console.warn(`${elementName} 沒有任何選項`);
        return false;
    }
    
    const firstOption = selectElement.options[0];
    const isDefaultOption = firstOption.value === "" && firstOption.textContent.includes("--選擇");
    
    if (isDefaultOption) {
        console.log(`✓ ${elementName} 的第一個選項正確設為預設選項: "${firstOption.textContent}"`);
    } else {
        console.warn(`✗ ${elementName} 的第一個選項不是預設選項: value="${firstOption.value}", text="${firstOption.textContent}"`);
    }
    
    return isDefaultOption;
};

WSCardsLineApp.prototype.destroyCharts = function() {
    Object.values(this.charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    this.charts = { priceChart: null, stockChart: null };
};
// 圖表管理方法
WSCardsLineApp.prototype.createPriceChart = function(jsonObj, internalCardNumber, cardNum) {
    console.log("建立價格圖表:", cardNum);
    
    const cardInfo = jsonObj[internalCardNumber];
    if (!cardInfo) {
        console.error('找不到卡片資料:', internalCardNumber);
        return;
    }
    
    const canvas = document.getElementById('myChart');
    if (!canvas) {
        console.error('找不到價格圖表畫布');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    this.charts.priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: cardInfo.upddate,
            datasets: [{
                label: cardNum,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                data: cardInfo.cardPrice,
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '價格(日幣)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
    
    this.hideLoading(['overlay-2']);
};

WSCardsLineApp.prototype.createStockChart = function(jsonObj, internalCardNumber, cardNum) {
    console.log("建立庫存圖表:", cardNum);
    
    const cardInfo = jsonObj[internalCardNumber];
    if (!cardInfo) {
        console.error('找不到庫存資料:', internalCardNumber);
        return;
    }
    
    const canvas = document.getElementById('myStockChart');
    if (!canvas) {
        console.error('找不到庫存圖表畫布');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    this.charts.stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: cardInfo.upddate,
            datasets: [{
                label: cardNum,
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                data: cardInfo.cardPrice,
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '庫存'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
    
    this.hideLoading(['overlay-3']);
};

WSCardsLineApp.prototype.updateCardImage = async function(cardNumberDisplay) {
    const cardImg = this.elements.cardImg;
    if (!cardImg) return;
    
    try {
        const cardNum = cardNumberDisplay.indexOf(' ') >= 0 
            ? cardNumberDisplay.substr(0, cardNumberDisplay.indexOf(' '))
            : cardNumberDisplay;

        const cardFirst = cardNum.substr(0, 1).toLowerCase();
        const cardSecond = cardNum.substr(0, cardNum.indexOf('-')).replace('/', '_').toLowerCase();
        const cardThird = cardNum.replace('/', '_').replace('-', '_').toLowerCase();
        
        const urlCard = `https://ws-tcg.com/wordpress/wp-content/cardimages/${cardFirst}/${cardSecond}/${cardThird}.png`;
        
        console.log('載入圖片:', urlCard);
        
        // 使用 Promise 處理圖片載入
        await this.loadImage(cardImg, urlCard);
        
    } catch (error) {
        console.error('圖片載入失敗:', error);
        // 設定預設圖片
        cardImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaZguWcluePuzwvdGV4dD48L3N2Zz4=';
    } finally {
        // 確保載入完成後隱藏 overlay
        const timer = setInterval(() => {
            if (cardImg.complete) {
                clearInterval(timer);
                this.hideLoading(['overlay-1']);
            }
        }, 10);
        
        // 安全機制：最多等待5秒
        setTimeout(() => {
            clearInterval(timer);
            this.hideLoading(['overlay-1']);
        }, 5000);
    }
};

WSCardsLineApp.prototype.loadImage = function(imgElement, src) {
    return new Promise((resolve, reject) => {
        imgElement.onload = () => resolve();
        imgElement.onerror = () => reject(new Error('圖片載入失敗'));
        imgElement.src = src;
        
        // 超時處理
        setTimeout(() => reject(new Error('圖片載入超時')), 10000);
    });
};
// 向後相容的全域函數
function changeStandardForSuggest(productName) {
    if (wsCardsApp) {
        wsCardsApp.changeStandardForSuggest(productName);
    }
}

function removeTitle() {
    if (wsCardsApp) {
        wsCardsApp.removeTitle();
    }
}

function changeStandard() {
    if (wsCardsApp) {
        wsCardsApp.changeStandard();
    }
}

function changeTitle() {
    if (wsCardsApp) {
        wsCardsApp.changeTitle();
    }
}

function changeNumber() {
    if (wsCardsApp) {
        wsCardsApp.changeNumber();
    }
}

// 初始化公告（如果需要的話）
document.addEventListener('DOMContentLoaded', function() {
    // 側邊欄控制
    if (typeof $ !== 'undefined' && $('.nav-link').length) {
        $('.nav-link').PushMenu('collapse');
    }
    
    // 公告按鈕
    const annButton = document.getElementById('annButton');	
    if (annButton) {
        annButton.addEventListener("click", function(){
            if (typeof $ !== 'undefined') {
                $('#announceexampleModalCenter').modal('show');
            }
        });
    }

    // 顯示公告
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'info',
            title: '公告',
            text: '4/17 資料已復原可正常查詢'
        });
    }
});

console.log('WSCardsLineApp 腳本載入完成');


