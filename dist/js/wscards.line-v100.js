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

// 圖表線條顏色：深色模式使用淺色系線條以提高可讀性，淺色模式維持原本深藍色
var CHART_LINE_COLOR_LIGHT = '#1e2d5a';
var CHART_LINE_COLOR_DARK = '#8ab4f8';

function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function getChartLineColor() {
    return isDarkTheme() ? CHART_LINE_COLOR_DARK : CHART_LINE_COLOR_LIGHT;
}

// 同步原生 UI 的 color-scheme（依賴 <head> 內聯腳本已先設好 data-theme）
function syncDocumentColorScheme() {
    document.documentElement.style.colorScheme = isDarkTheme() ? 'dark' : 'light';
}

// 主題切換時，即時更新畫面上圖表的線條顏色
function refreshChartThemeColors() {
    var color = getChartLineColor();
    [myChart, myStockChart].forEach(function(chart) {
        if (!chart || !chart.data || !chart.data.datasets) return;
        chart.data.datasets.forEach(function(ds) {
            // 只更新折線資料集（bar 類型維持原色）
            if (ds.type && ds.type !== 'line') return;
            ds.borderColor = color;
            ds.backgroundColor = color;
            ds.pointBackgroundColor = color;
            ds.pointBorderColor = color;
        });
        chart.update();
    });
}

syncDocumentColorScheme();

// 監看 <html data-theme> 變化，切換深/淺色模式時重新上色
if (typeof MutationObserver !== 'undefined') {
    (function() {
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].attributeName === 'data-theme') {
                    syncDocumentColorScheme();
                    refreshChartThemeColors();
                    break;
                }
            }
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    })();
}

// ====================================================
// 搜尋防抖與鎖定機制
// - _searchDebounceTimer: 名稱搜尋的 debounce timer
// - _isSearching: 搜尋進行中的鎖定旗標
// - _lastSearchedValue: 上次成功觸發搜尋的卡號值（防重複）
// ====================================================
var _searchDebounceTimer = null;
var _cardAutoSearchTimer = null;
var _cardAutoSearchDelayMs = 30000;
var _searchActionState = 'copy';
var _isSearching = false;
var _lastSearchedValue = '';
var _cardDictionary = null; // 暫存卡片字典的陣列
// cardStandard 下拉選單原生就帶 2 個預留 option，options.length 判斷不出載入狀態，需另外追蹤
var _standardWLoaded = false;
var _standardSLoaded = false;

// ====================================================
// 統一下拉容器的資料快取
// - _typeaheadSuggestions: 作品/系列建議（來自 typeahead）
// - _cardNameSuggestions:  卡片名稱搜尋結果（來自 cardDictionary）
// ====================================================
var _typeaheadSuggestions = [];
var _cardNameSuggestions = [];

// ====================================================
// 圖表時間篩選 - 儲存原始圖表資料
// ====================================================
var _rawPriceLabels = [];
var _rawPriceData = [];
var _rawStockLabels = [];
var _rawStockData = [];
var _statsCardExtra = { pack: '', firstRelease: '' };

function _clearCardAutoSearchTimer() {
    if (_cardAutoSearchTimer) {
        clearTimeout(_cardAutoSearchTimer);
        _cardAutoSearchTimer = null;
    }
}

function _setSearchActionButtonState(state) {
    var button = document.getElementById('pasteButton');
    if (!button) return;

    var nextState = state === 'search' ? 'search' : 'copy';
    var stateChanged = _searchActionState !== nextState;
    _searchActionState = nextState;

    button.dataset.actionState = nextState;
    button.classList.toggle('search-armed', nextState === 'search');
    // 這顆按鈕在「貼上」與「搜尋」兩種行為間切換，名稱必須跟著實際行為走
    button.title = nextState === 'search' ? '搜尋' : '貼上';
    button.setAttribute('aria-label', nextState === 'search' ? '搜尋這個卡號' : '貼上剪貼簿的卡號');

    if (stateChanged) {
        button.classList.remove('flip-attention');
        void button.offsetWidth;
        button.classList.add('flip-attention');
    }
}

function _syncSearchActionStateFromValue(inputValue) {
    var value = (inputValue || '').trim();
    _setSearchActionButtonState(value.length > 0 ? 'search' : 'copy');
}

function _scheduleCardAutoSearch(inputValue) {
    _clearCardAutoSearchTimer();
    _cardAutoSearchTimer = setTimeout(function() {
        _cardAutoSearchTimer = null;
        var currentValue = $input.val().trim();
        if (currentValue === inputValue && !_isSearching && isCardNumberFormat(currentValue) && currentValue !== _lastSearchedValue) {
            console.log('30 秒未手動搜尋，自動搜尋卡號:', currentValue);
            searchByCardNumber(currentValue);
        }
    }, _cardAutoSearchDelayMs);
}

function _handleSearchInputState(inputValue) {
    var value = (inputValue || '').trim();
    var isCardFormat = value && value.length >= 8 && isCardNumberFormat(value);

    _syncSearchActionStateFromValue(value);

    if (isCardFormat) {
        _scheduleCardAutoSearch(value);
    } else {
        _clearCardAutoSearchTimer();
    }
}

async function handleSearchActionButtonClick() {
    var inputElement = document.getElementById('xxxx');
    if (!inputElement) return;

    var inputValue = inputElement.value.trim();

    // 搜尋狀態：只在完整卡號時才立即搜尋
    if (_searchActionState === 'search' && inputValue.length > 0) {
        if (_isSearching) {
            console.log('搜尋進行中，略過搜尋按鈕點擊');
            return;
        }

        if (isCardNumberFormat(inputValue)) {
            _clearCardAutoSearchTimer();
            if (inputValue !== _lastSearchedValue) {
                searchByCardNumber(inputValue);
            }
        }
        return;
    }

    // 複製狀態：讀取剪貼簿並貼到輸入框
    if (navigator.clipboard && navigator.clipboard.readText) {
        try {
            var text = await navigator.clipboard.readText();
            inputElement.value = text;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        } catch (err) {
            console.log('Clipboard API failed, fallback to manual paste');
        }
    }

    if (typeof Swal !== 'undefined') {
        showWsAlert({
            icon: 'info',
            title: '瀏覽器不允許讀取剪貼簿',
            text: '請直接長按輸入框貼上；電腦版可按 Ctrl + V。',
            showConfirmButton: true,
            confirmButtonText: '知道了'
        }).then(function() {
            inputElement.focus();
        });
    } else {
        inputElement.focus();
    }
}

function setupSearchActionButton() {
    var button = document.getElementById('pasteButton');
    var inputElement = document.getElementById('xxxx');
    if (!button || !inputElement) return;

    button.removeEventListener('click', handleSearchActionButtonClick);
    button.addEventListener('click', handleSearchActionButtonClick);
    _syncSearchActionStateFromValue(inputElement.value);
}

window.handleSearchActionButtonClick = handleSearchActionButtonClick;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSearchActionButton);
} else {
    setupSearchActionButton();
}

// 支援外部連結 ?cardno=PRD_W133-001，底線代表卡號中的斜線。
var _hasProcessedUrlCardNumber = false;

function searchCardNumberFromUrl() {
    if (_hasProcessedUrlCardNumber || typeof URLSearchParams === 'undefined') return;
    _hasProcessedUrlCardNumber = true;

    var cardNumber = new URLSearchParams(window.location.search).get('cardno');
    if (!cardNumber) return;

    cardNumber = cardNumber.trim().replace(/_/g, '/');
    if (!isCardNumberFormat(cardNumber)) return;

    var inputElement = document.getElementById('xxxx');
    if (inputElement) inputElement.value = cardNumber;
    _syncSearchActionStateFromValue(cardNumber);
    searchByCardNumber(cardNumber);
}

function showWsAlert(options) {
    var config = options || {};
    var customClass = Object.assign({}, config.customClass || {});
    customClass.popup = 'ws-swal-popup' + (config.toast ? ' ws-swal-toast' : '');
    customClass.confirmButton = 'ws-swal-confirm';
    customClass.cancelButton = 'ws-swal-cancel';
    customClass.denyButton = 'ws-swal-deny';
    config.customClass = customClass;
    return Swal.fire(config);
}

/**
 * 將日期標籤字串解析為 Date 物件
 * 支援格式: YYYYMMDD / YYYY-MM-DD / YYYY/MM/DD
 */
function parseLabelToDate(label) {
    if (typeof label !== 'string') return null;
    if (label.length === 8 && !label.includes('-') && !label.includes('/')) {
        return new Date(label.substring(0, 4), parseInt(label.substring(4, 6), 10) - 1, parseInt(label.substring(6, 8), 10));
    } else if (label.includes('-')) {
        var p = label.split('-');
        if (p.length === 3) return new Date(p[0], parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    } else if (label.includes('/')) {
        var p = label.split('/');
        if (p.length === 3) return new Date(p[0], parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    }
    return null;
}

/**
 * 依月數過濾 labels / data，回傳近 N 個月的資料
 * @param {Array} labels
 * @param {Array} data
 * @param {number} months  0 = 全部
 * @returns {{labels: Array, data: Array}}
 */
function filterDataByMonths(labels, data, months) {
    if (!months || months <= 0 || !labels || labels.length === 0) {
        return { labels: labels.slice(), data: data.slice() };
    }
    var cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    var filteredLabels = [];
    var filteredData = [];
    for (var i = 0; i < labels.length; i++) {
        var d = parseLabelToDate(labels[i]);
        if (d && d >= cutoff) {
            filteredLabels.push(labels[i]);
            filteredData.push(data[i]);
        }
    }
    // 若過濾後無資料（資料較舊），回傳全部
    if (filteredLabels.length === 0) {
        return { labels: labels.slice(), data: data.slice() };
    }
    return { labels: filteredLabels, data: filteredData };
}

/**
 * 更新價格圖表的時間範圍
 * @param {string|number} months
 */
function applyPriceTimeFilter(months) {
    months = parseInt(months, 10);
    if (!myChart) return;
    var filtered = filterDataByMonths(_rawPriceLabels, _rawPriceData, months);
    myChart.data.labels = filtered.labels;
    myChart.data.datasets[0].data = filtered.data;
    myChart.update();
    // 更新 chart-period 文字
    var periodEl = document.getElementById('priceChartPeriod');
    if (periodEl) periodEl.textContent = _periodText(months);
}

/**
 * 更新庫存圖表的時間範圍
 * @param {string|number} months
 */
function applyStockTimeFilter(months) {
    months = parseInt(months, 10);
    if (!myStockChart) return;
    var filtered = filterDataByMonths(_rawStockLabels, _rawStockData, months);
    myStockChart.data.labels = filtered.labels;
    myStockChart.data.datasets[0].data = filtered.data;
    myStockChart.update();
    // 更新 chart-period 文字
    var periodEl = document.getElementById('stockChartPeriod');
    if (periodEl) periodEl.textContent = _periodText(months);
}

function _periodText(months) {
    // 與時間範圍下拉選單用同一組字，避免同一件事有兩種說法
    if (months === 1) return '近一個月';
    if (months === 3) return '近三個月';
    if (months === 6) return '近半年';
    return '近一年';
}

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
{id:"WS00073", name:"ゴブリンスレイヤー",cname:"哥布林殺手 | GBS,GA04"},
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
{id:"WS00117", name:"ダンジョンに出会いを求めるのは間違っているだろうか",cname:"ダンまち | 在地下城尋求邂逅是否搞錯了什麼 | 地錯 | 地城邂逅 | DDM,GA10"},
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
{id:"WS00115", name:"無職転生 ～異世界行ったら本気だす～",cname:"無職轉生 ～異世界行ったら本気だす～ | MTI"},
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
{id:"WS00159", name:"ミラー・ウォリアーズ",cname:"迪士尼鏡像宇宙 | Disney Mirrorverse | MRd,MRp"},
{id:"WS00160", name:"VIRTUAL GIRL",cname:"虛擬少女@世界終焉 | VRG,BDY"},
{id:"WS00161", name:"東方Project",cname:"東方Project | THP"},
{id:"WS00162", name:"GA文庫",cname:"GA文庫 | GA01,GA02,GA03,GA04,GA05,GA06,GA07,GA08,GA09,GA10,GA11,GA12,GA13,GA14,GA15,GA16,GA17,GA18,GA19"},
{id:"WS00163", name:"グランブルーファンタジー",cname:"碧藍幻想 | GBF"},
{id:"WS00164", name:"ブラウンダスト2",cname:"棕色塵埃2 | 棕塵 | 永遠棕塵 | BRD"}
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

// ====================================================
// 覆寫 typeahead 實例，將原生 .dropdown-menu 導向
// 統一的 cardNameSearchContainer，避免兩個下拉並存
// ====================================================
(function() {
    var ta = $input.data('typeahead');
    if (!ta) return;

    // 覆寫 render：收集匹配結果並交由統一容器渲染
    ta.render = function(items) {
        _typeaheadSuggestions = Array.isArray(items) ? items.slice(0, 20) : [];
        renderUnifiedSearchContainer();
        // 清空原生 menu，防止空白 ul 顯示
        this.$menu.html('');
        return this;
    };

    // 覆寫 show：不顯示原生 menu，但維持 shown 旗標
    ta.show = function() {
        this.shown = true;
        return this;
    };

    // 覆寫 hide：清除 typeahead 建議並更新統一容器
    ta.hide = function() {
        this.shown = false;
        _typeaheadSuggestions = [];
        renderUnifiedSearchContainer();
        return this;
    };
})();

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
_handleSearchInputState(inputValue);

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
        console.log('Partial match detected->keep waiting for search click or 30s auto search');
}
} else {
// Nothing is active so it is a new value (or maybe empty value)
// 卡號搜尋交由「搜尋按鈕」或「30 秒後自動搜尋」處理
}
}


// 監聽 change 事件 (失去焦點時觸發)
$input.change(handleInputChange);

/**
* 監聽 input 事件 (即時輸入時觸發)
* - 名稱搜尋維持 debounce 機制
* - 卡號不再 1.2 秒立即搜尋，改為等待手動點擊搜尋
* - 若 30 秒未點擊搜尋，才自動搜尋一次
*/
$input.on('input', function() {
// 每次輸入都清除上一次的 debounce timer
if (_searchDebounceTimer) {
clearTimeout(_searchDebounceTimer);
_searchDebounceTimer = null;
}

var inputValue = $input.val().trim();
var isCardFormat = inputValue && inputValue.length >= 8 && isCardNumberFormat(inputValue);

_handleSearchInputState(inputValue);

if (inputValue && inputValue.length > 0 && !isCardFormat) {
// 啟動名稱搜尋的防抖
_searchDebounceTimer = setTimeout(function() {
    _searchDebounceTimer = null;
    var currentValue = $input.val().trim();
    if (currentValue === inputValue && !isCardNumberFormat(inputValue)) {
        searchByCardName(inputValue);
    }
}, 500); // 模糊搜尋的反應時間可以設短一點
} else {
    // 卡號模式或空白時隱藏名稱搜尋結果
    hideCardNameSearchResults();
}
});

// ========= 卡片名稱搜尋與浮動視窗模組 =========
function fetchCardDictionary(callback) {
    if (_cardDictionary) {
        if(callback) callback();
        return;
    }
    console.log("正在載入卡片字典...");
    // 呼叫包含卡名與卡號對應的 JSON，例如 json/cardDictionary.json
    // 如果檔案不存在會報錯，開發時需確認該檔案存在，格式為 [["BD/W54-070", "卡名A"], ...]
    fetch('json/cardDictionary.json')
        .then(response => response.json())
        .then(data => {
            _cardDictionary = data;
            console.log("卡片字典載入成功！共 " + data.length + " 筆");
            if(callback) callback();
        })
        .catch(err => {
            console.error("載入卡片字典失敗", err);
        });
}

// 點擊卡片彈窗外時關閉
document.addEventListener('click', function(e) {
    var searchDiv = document.getElementById('cardNameSearchContainer');
    if (searchDiv && e.target.id !== 'xxxx' && !searchDiv.contains(e.target)) {
        hideCardNameSearchResults();
    }
});

// scroll / resize 時同步更新浮動面板位置
function _updateCardNameSearchPos() {
    var searchDiv = document.getElementById('cardNameSearchContainer');
    if (!searchDiv || searchDiv.style.display === 'none') return;
    var inputEl = document.getElementById('xxxx');
    if (!inputEl) return;
    var rect = inputEl.getBoundingClientRect();
    searchDiv.style.top  = (rect.bottom + 2) + 'px';
    searchDiv.style.left = rect.left + 'px';
    searchDiv.style.width = rect.width + 'px';
}
window.addEventListener('scroll', _updateCardNameSearchPos, true);
window.addEventListener('resize', _updateCardNameSearchPos);

function hideCardNameSearchResults() {
    _typeaheadSuggestions = [];
    _cardNameSuggestions = [];
    var searchDiv = document.getElementById('cardNameSearchContainer');
    if (searchDiv) {
        searchDiv.style.display = 'none';
    }
}

function searchByCardName(keyword) {
    if (!keyword) {
        _cardNameSuggestions = [];
        renderUnifiedSearchContainer();
        return;
    }

    fetchCardDictionary(function() {
        if (!_cardDictionary) return;
        
        var lowerKeyword = keyword.toLowerCase();
        // 進行比對並取得前 30 筆
        _cardNameSuggestions = _cardDictionary.filter(function(item) {
            return (item[1] && item[1].toLowerCase().includes(lowerKeyword)) || 
                   (item[0] && item[0].toLowerCase().includes(lowerKeyword));
        }).slice(0, 30);

        renderUnifiedSearchContainer();
    });
}

/**
 * 統一下拉容器渲染函式
 * - 上半部：作品/系列建議（_typeaheadSuggestions）
 * - 下半部：卡片名稱搜尋結果（_cardNameSuggestions）
 * 兩者共用同一個 #cardNameSearchContainer，不再出現第二個下拉元素
 */
function renderUnifiedSearchContainer() {
    var inputEl = document.getElementById('xxxx');
    if (!inputEl) return;

    var hasTypeahead = _typeaheadSuggestions.length > 0;
    var hasCards     = _cardNameSuggestions.length > 0;

    if (!hasTypeahead && !hasCards) {
        hideCardNameSearchResults();
        return;
    }

    var searchDiv = document.getElementById('cardNameSearchContainer');
    if (!searchDiv) {
        searchDiv = document.createElement('div');
        searchDiv.id = 'cardNameSearchContainer';
        searchDiv.style.position = 'fixed';
        searchDiv.style.zIndex = '99999';
        searchDiv.style.background = '#fff';
        searchDiv.style.border = '1px solid #ccc';
        searchDiv.style.borderRadius = '0 0 6px 6px';
        searchDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        searchDiv.style.maxHeight = '360px';
        searchDiv.style.overflowY = 'auto';
        searchDiv.style.display = 'none';
        document.body.appendChild(searchDiv);
    }

    var rect = inputEl.getBoundingClientRect();
    searchDiv.style.top   = (rect.bottom + 2) + 'px';
    searchDiv.style.left  = rect.left + 'px';
    searchDiv.style.width = rect.width + 'px';

    var html = '';

    // ── 作品/系列區塊 ──
    if (hasTypeahead) {
        html += '<div style="padding:5px 10px;background:#eef2ff;color:#4f46e5;font-size:0.72em;font-weight:700;letter-spacing:0.5px;border-bottom:1px solid #e0e7ff;">作品 / 系列</div>';
        _typeaheadSuggestions.forEach(function(item) {
            var displayName = (item.name || '').replace(/'/g, '&#39;');
            var cname       = (item.cname || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            // onclick 使用單引號包裹字串，並跳脫 ' 和 \ 避免 HTML attribute 截斷
            var safeArg = (item.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            html += '<div class="unified-search-item typeahead-suggest-item"'
                  + ' style="padding:8px 10px;border-bottom:1px solid #f0f0f0;cursor:pointer;"'
                  + ' onclick="handleTypeaheadItemClick(\'' + safeArg + '\')">';
            html += '<div style="font-size:0.88em;font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + displayName + '">' + displayName + '</div>';
            if (cname) {
                html += '<div style="font-size:0.75em;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + cname + '">' + cname + '</div>';
            }
            html += '</div>';
        });
    }

    // ── 卡片名稱區塊 ──
    if (hasCards) {
        html += '<div style="padding:5px 10px;background:#f0fdf4;color:#15803d;font-size:0.72em;font-weight:700;letter-spacing:0.5px;border-bottom:1px solid #dcfce7;">卡片名稱</div>';
        _cardNameSuggestions.forEach(function(item) {
            var cardNo   = item[0];
            var cardName = item[1];
            html += '<div class="unified-search-item card-name-search-item"'
                  + ' style="padding:9px 10px;border-bottom:1px solid #f0f0f0;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"'
                  + ' onclick="handleCardNameResultClick(\'' + cardNo + '\')">';
            html += '<span style="font-weight:bold;font-size:0.88em;flex:1;margin-right:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + cardName + '">' + cardName + '</span>';
            html += '<span style="color:#667eea;font-size:0.78em;flex-shrink:0;">' + cardNo + '</span>';
            html += '</div>';
        });
    }

    searchDiv.innerHTML = html;
    searchDiv.style.display = 'block';

    // hover 效果
    searchDiv.querySelectorAll('.unified-search-item').forEach(function(el) {
        el.addEventListener('mouseover', function() { this.style.backgroundColor = '#f8fafc'; });
        el.addEventListener('mouseout',  function() { this.style.backgroundColor = 'transparent'; });
    });
}

// 相容舊呼叫 renderCardNameSearchResults（保留供外部使用）
function renderCardNameSearchResults(results) {
    _cardNameSuggestions = results || [];
    renderUnifiedSearchContainer();
}

window.handleTypeaheadItemClick = function(itemName) {
    console.log('選擇作品/系列:', itemName);
    hideCardNameSearchResults();
    var inputEl = document.getElementById('xxxx');
    if (inputEl) inputEl.value = itemName;
    if (typeof changeStandardForSuggest === 'function') changeStandardForSuggest(itemName);
    if (typeof scrollToFilters === 'function') scrollToFilters();
};

window.handleCardNameResultClick = function(cardNumber) {
    console.log("選擇卡片:", cardNumber);
    hideCardNameSearchResults();
    var inputEl = document.getElementById('xxxx');
    if (inputEl) {
        inputEl.value = cardNumber;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (typeof searchByCardNumber === 'function') {
        searchByCardNumber(cardNumber);
    }
};
// ===============================================

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

// 顯示搜尋提示（整段查詢只有這一則進度提示）
showSearchNotification('查詢 ' + cardNumber + '…');

// 拆解卡號
var cardParts = parseCardNumber(cardNumber);
if (!cardParts) {
  console.warn('無法解析卡號格式:', cardNumber);
  showSearchNotification('卡號格式看起來不對，正確格式像 PRD/W01-001。', 'error');
  _isSearching = false;
  return;
}

console.log('卡號解析結果:', cardParts);

// 根據解析結果設置選擇器
setSelectorsFromCardParts(cardParts);

} catch (error) {
console.error('搜尋卡號時發生錯誤:', error);
showSearchNotification('查詢時發生問題，請再試一次。', 'error');
_isSearching = false;
}
}

/**
* 顯示搜尋通知
*
* 只有兩種情況該打斷讀者：查詢進行中、以及查詢失敗。
* 查詢成功不發通知 —— 畫面本身就是答案，且成功後會自動捲到結果。
*
* @param {string} message - 通知訊息
* @param {string} type - 通知類型 ('info', 'error'; 'success' 會被靜音)
*/
function showSearchNotification(message, type = 'info') {
console.log('[搜尋通知]', message);

if (typeof Swal === 'undefined') return;

// 成功不再彈窗，避免一次查詢連續蓋出多個提示
if (type === 'success') {
  Swal.close();
  return;
}

showWsAlert({
  icon: type === 'error' ? 'error' : 'info',
  title: type === 'error' ? '查不到這張卡' : '查詢中',
  text: message,
  timer: type === 'error' ? 4000 : 2000,
  showConfirmButton: false,
  toast: true,
  position: 'top-end'
});
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
// 每個查不到的環節對讀者來說都是同一件事：這張卡查不到。
// 所以不再播報內部步驟，只在真的失敗時說明原因與下一步。
var notFound = function(target) {
    showSearchNotification(target + ' 不在遊遊亭的收錄範圍，或卡號有誤。可改用下方「篩選條件」逐步尋找。', 'error');
    _isSearching = false;
};

// 1. 首先找到並設置 cardStandard
var standardFound = await findAndSetCardStandard(cardParts.prefix);
if (!standardFound) {
  if(cardParts.prefix !== cardParts.series){
    //W103-001 這類的就不會進來
    console.warn('找不到對應的作品標準:', cardParts.prefix);
    notFound(cardParts.fullNumber);
    return;
  }
}
reGenTitle();
// 等待 cardTitle 選項載入完成
await waitForTitleOptionsLoaded();


// 2. 設置 cardTitle
var titleFound = await findAndSetCardTitle(cardParts.series);
if (!titleFound) {
    if(cardParts.prefix !== cardParts.series){
        console.warn('找不到對應的主題:', cardParts.series);
        notFound(cardParts.fullNumber);
        return;
    }
}

if(titleFound){
    // 等待 cardNumber 選項載入完成
    await waitForNumberOptionsLoaded();

    // 3. 設置 cardNumber
    var numberFound = await findAndSetCardNumber(cardParts.fullNumber);
    if (!numberFound) {
    console.warn('找不到對應的卡號:', cardParts.fullNumber);
    notFound(cardParts.fullNumber);
    return;
    }
}else{
    // 2.5 設置 cardSuffix (主要工作將卡號清單找出並展出)
    var suffixFound = await findAndSetCardSuffix(cardParts.prefix,cardParts.suffix);
    if (!suffixFound) {
        console.warn('後綴找不到對應的卡號:', cardParts.suffix);
        notFound(cardParts.fullNumber);
        return;
    }

    // 3. 根據設置 cardNumber (這邊的fullNumber應該是等同於suffix)
    var numberFound = await findAndSetCardNumberBySuffix(cardParts.fullNumber);
    if (!numberFound) {
        console.warn('找不到對應的卡號:', cardParts.fullNumber);
        notFound(cardParts.fullNumber);
        return;
    }
}

console.log('✓ 卡號搜尋完成:', cardParts.fullNumber);
// 成功時關掉進度提示即可，結果本身就是回饋
showSearchNotification('', 'success');

// 搜尋完成，釋放鎖定
_isSearching = false;

// 搜尋成功後平滑滾動到結果區域
setTimeout(() => {
    scrollToResults();
}, 200); // 延遲一秒讓圖表載入完成	

} catch (error) {
console.error('設置選擇器時發生錯誤:', error);
showSearchNotification('查詢時發生問題，請再試一次。', 'error');
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
    _standardWLoaded = true;
}
requestStandardW.onerror = function(){
    _standardWLoaded = true;
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
    _standardSLoaded = true;
}
requestStandardS.onerror = function(){
    _standardSLoaded = true;
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
    searchCardNumberFromUrl();
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

if (typeof syncAdvancedFilterButton === 'function') {
    syncAdvancedFilterButton();
}
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
if (typeof syncAdvancedFilterButton === 'function') {
    clearAdvancedProductCache();
    syncAdvancedFilterButton();
}
}


// ===== 進階選項篩選 =====
var _advProductCache = { titleCode: '', cards: null };
var _advFiltersBound = false;

var ADV_KIND_LABELS = {
    '0': '角色',
    '1': '事件',
    '2': '名場面'
};

function getAdvKindLabel(kind) {
    var key = String(kind);
    return ADV_KIND_LABELS[key] || key;
}

function isProductSelected() {
    var select = document.getElementById('cardTitle');
    if (!select || select.selectedIndex < 0) return false;
    var value = String(select.value || '').trim();
    var text = (select.options[select.selectedIndex] && select.options[select.selectedIndex].text || '').trim();
    if (!value || value === '000/000-000' || value === '0') return false;
    if (!text || text === '選擇主題' || text === '選擇產品') return false;
    return true;
}

function clearAdvancedProductCache() {
    _advProductCache = { titleCode: '', cards: null };
}

function syncAdvancedFilterButton() {
    var btn = document.getElementById('advancedFilterBtn');
    if (!btn) return;
    btn.style.display = isProductSelected() ? '' : 'none';
}

function getSelectedProductTitleCode() {
    var select = document.getElementById('cardTitle');
    if (!select) return '';
    return String(select.value || '').replace('/', '_');
}

function getSelectedProductDisplayName() {
    var select = document.getElementById('cardTitle');
    if (!select || select.selectedIndex < 0) return '';
    return (select.options[select.selectedIndex] && select.options[select.selectedIndex].text) || '';
}

function buildCardImageUrls(cardId) {
    var card_Num = cardId;
    var card_first = card_Num.substr(0, 1);
    var card_second = card_Num.substr(0, card_Num.indexOf('-'));
    card_second = card_second.replace('/', '_');
    var card_third = card_Num.replace('/', '_').replace('-', '_');
    return {
        primary: 'https://imgs.devilfox.net/ws/' + card_second.toLowerCase() + '/' + card_third.toLowerCase() + '.png',
        fallback: 'https://ws-tcg.com/wordpress/wp-content/images/cardlist/' + card_first.toLowerCase() + '/' + card_second.toLowerCase() + '/' + card_third.toLowerCase() + '.png'
    };
}

function fillSelectOptions(selectEl, values, valueMapper) {
    if (!selectEl) return;
    var current = selectEl.value || 'all';
    selectEl.innerHTML = '';
    var allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = '全部';
    selectEl.appendChild(allOpt);
    values.forEach(function(v) {
        var opt = document.createElement('option');
        var mapped = valueMapper ? valueMapper(v) : { value: String(v), label: String(v) };
        opt.value = mapped.value;
        opt.textContent = mapped.label;
        selectEl.appendChild(opt);
    });
    var hasCurrent = Array.prototype.some.call(selectEl.options, function(o) { return o.value === current; });
    selectEl.value = hasCurrent ? current : 'all';
}

function uniqueSorted(values, sorter) {
    var set = {};
    values.forEach(function(v) {
        if (v === undefined || v === null || v === '') return;
        set[String(v)] = v;
    });
    var arr = Object.keys(set).map(function(k) { return set[k]; });
    if (sorter) {
        arr.sort(sorter);
    } else {
        arr.sort(function(a, b) {
            return String(a).localeCompare(String(b), 'zh-Hant', { numeric: true });
        });
    }
    return arr;
}

function populateAdvancedFilterOptions(cards) {
    var raritySelect = document.getElementById('advRarity');
    var colorSelect = document.getElementById('advColor');
    var levelSelect = document.getElementById('advLevel');
    var kindSelect = document.getElementById('advKind');

    fillSelectOptions(raritySelect, uniqueSorted(cards.map(function(c) { return c.rarity || c.cardrare; })));
    fillSelectOptions(colorSelect, uniqueSorted(cards.map(function(c) { return c.color || c.cardcolor; })));
    fillSelectOptions(levelSelect, uniqueSorted(cards.map(function(c) {
        return c.level !== undefined ? c.level : c.cardlevel;
    }), function(a, b) {
        return Number(a) - Number(b);
    }));
    fillSelectOptions(kindSelect, uniqueSorted(cards.map(function(c) {
        return c.kind !== undefined ? c.kind : c.cardkind;
    }), function(a, b) {
        return Number(a) - Number(b);
    }), function(v) {
        return { value: String(v), label: getAdvKindLabel(v) };
    });
}

function applyAdvancedFilters() {
    var strip = document.getElementById('advResultStrip');
    var countEl = document.getElementById('advResultCount');
    var cards = (_advProductCache && _advProductCache.cards) ? _advProductCache.cards : [];

    var rarity = (document.getElementById('advRarity') || {}).value || 'all';
    var color = (document.getElementById('advColor') || {}).value || 'all';
    var level = (document.getElementById('advLevel') || {}).value || 'all';
    var kind = (document.getElementById('advKind') || {}).value || 'all';

    var filtered = cards.filter(function(c) {
        var cRarity = String(c.rarity || c.cardrare || '');
        var cColor = String(c.color || c.cardcolor || '');
        var cLevel = String(c.level !== undefined ? c.level : (c.cardlevel !== undefined ? c.cardlevel : ''));
        var cKind = String(c.kind !== undefined ? c.kind : (c.cardkind !== undefined ? c.cardkind : ''));
        if (rarity !== 'all' && cRarity !== rarity) return false;
        if (color !== 'all' && cColor !== color) return false;
        if (level !== 'all' && cLevel !== level) return false;
        if (kind !== 'all' && cKind !== kind) return false;
        return true;
    });

    if (countEl) {
        countEl.textContent = '結果：' + filtered.length + ' 張';
    }
    if (!strip) return;

    if (!filtered.length) {
        strip.innerHTML = '<div class="adv-result-empty">沒有符合條件的卡片，請放寬上方篩選條件</div>';
        return;
    }

    strip.innerHTML = '';
    filtered.forEach(function(c) {
        var id = c.id || c.cardno || '';
        if (!id) return;
        var urls = buildCardImageUrls(id);
        var rare = c.rarity || c.cardrare || '-';
        var name = c.name || c.cardname || '';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'adv-result-item';
        btn.setAttribute('data-card-id', id);
        btn.title = name || id;

        var img = document.createElement('img');
        img.alt = id;
        img.loading = 'lazy';
        img.src = urls.primary;
        img.onerror = function() {
            if (urls.fallback && img.src !== urls.fallback) {
                img.src = urls.fallback;
            } else {
                img.onerror = null;
            }
        };

        var meta = document.createElement('div');
        meta.className = 'adv-result-meta';
        meta.innerHTML = '<span class="adv-rare"></span><span class="adv-id"></span>';
        meta.querySelector('.adv-rare').textContent = rare;
        meta.querySelector('.adv-id').textContent = id;

        btn.appendChild(img);
        btn.appendChild(meta);
        btn.addEventListener('click', function() {
            selectAdvancedCard(id);
        });
        strip.appendChild(btn);
    });

    if (!strip.children.length) {
        strip.innerHTML = '<div class="adv-result-empty">沒有符合條件的卡片，請放寬上方篩選條件</div>';
    }
}

function loadProductContentCards(titleCode) {
    if (_advProductCache.titleCode === titleCode && Array.isArray(_advProductCache.cards)) {
        return Promise.resolve(_advProductCache.cards);
    }
    var jsonUrl = 'https://storage.googleapis.com/divine-vehicle-292507.appspot.com/cardDataInfo/content/ws/' + titleCode + '.json';
    return fetch(jsonUrl)
        .then(function(response) {
            if (!response.ok) throw new Error('JSON載入失敗');
            return response.json();
        })
        .then(function(data) {
            var cards = [];
            if (data && data.cards && Array.isArray(data.cards)) {
                cards = data.cards;
            } else if (data && typeof data === 'object') {
                cards = Object.keys(data).filter(function(k) {
                    return k !== 'metadata';
                }).map(function(k) {
                    var item = data[k] || {};
                    if (!item.id) item.id = k;
                    return item;
                });
            }
            _advProductCache = { titleCode: titleCode, cards: cards };
            return cards;
        });
}

function bindAdvancedFilterEvents() {
    if (_advFiltersBound) return;
    _advFiltersBound = true;
    ['advRarity', 'advColor', 'advLevel', 'advKind'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', applyAdvancedFilters);
        }
    });
}

function openAdvancedFilterModal() {
    if (!isProductSelected()) {
        syncAdvancedFilterButton();
        return;
    }

    bindAdvancedFilterEvents();

    var titleCode = getSelectedProductTitleCode();
    var productName = getSelectedProductDisplayName();
    var nameEl = document.getElementById('advProductName');
    if (nameEl) nameEl.textContent = productName;

    var strip = document.getElementById('advResultStrip');
    var countEl = document.getElementById('advResultCount');
    if (strip) strip.innerHTML = '<div class="adv-result-empty">載入卡片資料中…</div>';
    if (countEl) countEl.textContent = '結果：…';

    if (typeof $ !== 'undefined' && $('#advancedFilterModal').modal) {
        $('#advancedFilterModal').modal('show');
    }

    loadProductContentCards(titleCode)
        .then(function(cards) {
            populateAdvancedFilterOptions(cards);
            applyAdvancedFilters();
        })
        .catch(function(err) {
            console.error('載入進階篩選資料失敗:', err);
            clearAdvancedProductCache();
            if (strip) strip.innerHTML = '<div class="adv-result-empty">無法載入此產品的卡片資料，請關閉後重試</div>';
            if (countEl) countEl.textContent = '結果：0 張';
        });
}

function selectAdvancedCard(cardId) {
    if (!cardId) return;

    if (typeof $ !== 'undefined' && $('#advancedFilterModal').modal) {
        $('#advancedFilterModal').modal('hide');
    }

    var inputEl = document.getElementById('xxxx');
    if (inputEl) {
        inputEl.value = cardId;
    }

    // 允許重新搜尋與目前相同的卡號
    _lastSearchedValue = '';
    _isSearching = false;

    if (typeof searchByCardNumber === 'function') {
        searchByCardNumber(cardId);
    }
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

if (typeof syncAdvancedFilterButton === 'function') {
    clearAdvancedProductCache();
    syncAdvancedFilterButton();
}

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
    if (typeof syncAdvancedFilterButton === 'function') {
        syncAdvancedFilterButton();
    }
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


// 卡名還沒載入，先以卡號建立連結；卡名進來後由 loadCardData 再更新一次
if (typeof window.updateExternalSearchLinks === 'function') {
    window.updateExternalSearchLinks(cardNumberValue, '');
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

            // 儲存原始資料供時間篩選使用
            _rawPriceLabels = cardPriceUpDate ? cardPriceUpDate.slice() : [];
            _rawPriceData = cardData ? cardData.slice() : [];

            // 重設價格圖表時間選單為預設值（一年內）
            var priceTimeSelect = document.getElementById('priceTimeRange');
            if (priceTimeSelect) priceTimeSelect.value = '12';
            
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
                        label: '日圓',
                        fill: false,
                        borderColor: getChartLineColor(),
                        backgroundColor: getChartLineColor(),
                        pointBackgroundColor: getChartLineColor(),
                        pointBorderColor: getChartLineColor(),
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        borderWidth: 2,
                        data: cardData,
                        tension: 0.3
                    }],
                },
                // Configuration options go here
                options: {
                legend: {
                    display: true,
                    align: 'start',
                    labels: {
                        fontColor: '#555',
                        fontSize: 12,
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltips: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    titleFontColor: '#333',
                    bodyFontColor: '#333',
                    borderColor: '#e0e0e0',
                    borderWidth: 1,
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
                            var value = Number(tooltipItem.yLabel);
                            if (isNaN(value)) return '¥' + tooltipItem.yLabel;
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
                            gridLines: {
                                display: false
                            },
                            scaleLabel: {
                                display: false
                            },
                            ticks: {
                                fontColor: '#999',
                                fontSize: 11,
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
                            gridLines: {
                                color: 'rgba(0,0,0,0.05)',
                                drawBorder: false
                            },
                            scaleLabel: {
                                display: false
                            },
                            ticks: {
                                fontColor: '#999',
                                fontSize: 11,
                                callback: function(value) {
                                    // 原本門檻是 1000，而 .toFixed(0) 會把 1300 / 1400 / 900
                                    // 全部印成「1k」、把 1500 印成「2k」——大多數 WS 卡的價格
                                    // 剛好落在這一段，所以價格軸長期讀起來是 1k,1k,1k,2k。
                                    // 一條被 wipe 畫上去的線，落在會說謊的刻度上比不畫更糟。
                                    if (value >= 10000) return (value / 1000).toFixed(0) + 'k';
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
                // 稀有度來源統一使用 cardData.cardrare
                var historyRare = (cardData && cardData.cardrare) ? String(cardData.cardrare).trim() : '';
                
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
                    cardRare: historyRare,
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
    // 沒有價格資料時，不要留著上一張卡的日期
    var elAsOfDefault = document.getElementById('priceSummaryAsOf');
    if (elAsOfDefault) elAsOfDefault.textContent = '這張卡目前沒有價格紀錄。';
    var elSampleDefault = document.getElementById('priceSummarySample');
    if (elSampleDefault) elSampleDefault.style.display = 'none';
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

// 依「實際日期」而非「資料筆數」取區間。
// 標籤寫「近 30 日 / 近 7 日」，計算就必須真的是日期區間，
// 否則資料有缺漏時（遊遊亭並非每日都有紀錄）標籤會說謊。
function _pricesWithinDays(days) {
    var labels = _rawPriceLabels || [];
    // 沒有可對應的日期標籤時，退回原本的「近 N 筆」近似值
    if (labels.length !== priceData.length) {
        return validPrices.slice(-days);
    }
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var picked = [];
    for (var i = 0; i < priceData.length; i++) {
        var p = priceData[i];
        if (p === null || p === undefined || p === 0 || isNaN(p)) continue;
        var d = parseLabelToDate(labels[i]);
        if (d && d >= cutoff) picked.push(p);
    }
    return picked;
}

var recent30 = _pricesWithinDays(30);
var highPrice = recent30.length ? Math.max.apply(null, recent30) : null;
var lowPrice = recent30.length ? Math.min.apply(null, recent30) : null;

// 漲跌幅：真的用 7 日區間的第一筆當基準；
// 區間內不足兩筆就沒有「漲跌」可言，寧可顯示 -- 也不給一個假的 0%
var recent7 = _pricesWithinDays(7);
var changePercent = null;
if (recent7.length >= 2 && recent7[0] !== 0) {
    changePercent = ((currentPrice - recent7[0]) / recent7[0] * 100).toFixed(1);
}

// 更新 DOM
var elCurrent = document.getElementById('summaryCurrentPrice');
var elHigh = document.getElementById('summaryHighPrice');
var elLow = document.getElementById('summaryLowPrice');
var elChange = document.getElementById('summaryChangePercent');

// 重設數值的 class（漲/跌/平會換色，所以每次都要整串重寫，不能只加不減）
//
// 原本這裡叫 triggerAnimate，會加上 .animate 觸發 @keyframes countUp
// （from { opacity: 0 }）。那個動畫已經移除：價格是這一頁的答案，
// 任何讓它半透明的一格都是可讀性風險，而且它的名字在說謊——沒有任何數字
// 在跳動。真正的數字滾動改由檔尾的「答案抵達」模組負責，它只改 textContent，
// 完全不碰 opacity，所以量到的對比就是真的對比。
function setValueClass(el, baseClass) {
    if (!el) return;
    el.className = baseClass;
}

if (elCurrent) {
    elCurrent.textContent = '¥' + currentPrice.toLocaleString();
    setValueClass(elCurrent, 'price-summary-value');
}
if (elHigh) {
    elHigh.textContent = highPrice === null ? '--' : '¥' + highPrice.toLocaleString();
    setValueClass(elHigh, 'price-summary-value');
}
if (elLow) {
    elLow.textContent = lowPrice === null ? '--' : '¥' + lowPrice.toLocaleString();
    setValueClass(elLow, 'price-summary-value');
}
if (elChange) {
    if (changePercent === null) {
        elChange.textContent = '--';
        setValueClass(elChange, 'price-summary-value price-flat');
    } else {
        var sign = changePercent > 0 ? '+' : '';
        elChange.textContent = sign + changePercent + '%';
        // 漲跌顏色
        var colorClass = 'price-flat';
        if (changePercent > 0) colorClass = 'price-up';
        else if (changePercent < 0) colorClass = 'price-down';

        setValueClass(elChange, 'price-summary-value ' + colorClass);
    }
}

// 價格必須帶日期才算完整答案：讀者要知道這個數字是哪一天的
var elAsOf = document.getElementById('priceSummaryAsOf');
if (elAsOf) {
    var lastLabel = (_rawPriceLabels && _rawPriceLabels.length === priceData.length)
        ? _rawPriceLabels[priceData.length - 1] : '';
    var lastDate = parseLabelToDate(lastLabel);
    elAsOf.textContent = lastDate
        ? '資料日期 ' + (lastDate.getMonth() + 1) + '/' + lastDate.getDate() + '，來源遊遊亭。'
        : '資料來源：遊遊亭。';
}

// 開站時載入的是範例卡片，必須說清楚，避免被當成自己要查的卡的價格
var elSample = document.getElementById('priceSummarySample');
if (elSample) {
    elSample.style.display = window._hasUserModified ? 'none' : 'inline';
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

            // 儲存原始資料供時間篩選使用
            _rawStockLabels = cardPriceUpDate ? cardPriceUpDate.slice() : [];
            _rawStockData = cardData ? cardData.slice() : [];

            // 重設庫存圖表時間選單為預設值（一年內）
            var stockTimeSelect = document.getElementById('stockTimeRange');
            if (stockTimeSelect) stockTimeSelect.value = '12';
            
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
                        label: '數量',
                        fill: false,
                        borderColor: getChartLineColor(),
                        backgroundColor: getChartLineColor(),
                        pointBackgroundColor: getChartLineColor(),
                        pointBorderColor: getChartLineColor(),
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        borderWidth: 2,
                        data: cardData,
                        tension: 0.3
                    }],
                },
                // Configuration options go here
                options: {
                legend: {
                    display: true,
                    align: 'start',
                    labels: {
                        fontColor: '#555',
                        fontSize: 12,
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltips: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    titleFontColor: '#333',
                    bodyFontColor: '#333',
                    borderColor: '#e0e0e0',
                    borderWidth: 1,
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
                            gridLines: {
                                display: false
                            },
                            scaleLabel: {
                                display: false
                            },
                            ticks: {
                                fontColor: '#999',
                                fontSize: 11,
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
                            gridLines: {
                                color: 'rgba(0,0,0,0.05)',
                                drawBorder: false
                            },
                            scaleLabel: {
                                display: false
                            },
                            ticks: {
                                fontColor: '#999',
                                fontSize: 11,
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
* 優先讀取: https://imgs.devilfox.net/ws/{folder}/{file}.png
* 失敗則改用: https://ws-tcg.com/wordpress/wp-content/images/cardlist/{first}/{second}/{third}.png
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

            // 主要來源 (devilfox)：folder = card_second，file = card_third，皆轉小寫
            // 例如 5HY/W83-002 -> https://imgs.devilfox.net/ws/5hy_w83/5hy_w83_002.png
            var urlPrimary="https://imgs.devilfox.net/ws/"+card_second.toLowerCase()+"/"+card_third.toLowerCase()+".png";
            // 備援來源 (ws-tcg)
            var urlFallback="https://ws-tcg.com/wordpress/wp-content/images/cardlist/"+card_first.toLowerCase()+"/"+card_second.toLowerCase()+"/"+card_third.toLowerCase()+".png";
            console.log("url card (primary):"+urlPrimary);
            console.log("url card (fallback):"+urlFallback);
            cardImg.setAttribute("src",urlPrimary);
            showCardImage(urlPrimary, urlFallback);
}
        
/**
* 顯示卡片圖片（現代化效果）
* @param {string} src - 圖片 URL
* @param {string} [fallbackSrc] - 主要圖片載入失敗時的備援 URL
* 
* 提供淡入效果和載入狀態管理
*/
function showCardImage(src, fallbackSrc) {
            const img = document.getElementById('cardImg');
            const placeholder = document.querySelector('.image-placeholder');
            
            if (src) {
                // 淡入效果
                img.style.opacity = '0';
                img.style.display = 'block';

                img.onload = function() {
                    placeholder.style.display = 'none';
                    img.style.transition = 'opacity 0.5s ease';
                    img.style.opacity = '1';
                };

                // 主要來源載入失敗時改用備援來源
                img.onerror = function() {
                    if (fallbackSrc && img.src !== fallbackSrc) {
                        console.log("主要圖片載入失敗，改用備援來源:"+fallbackSrc);
                        img.src = fallbackSrc;
                    } else {
                        img.onerror = null;
                    }
                };

                img.src = src;
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
  // options.length 初始就有 2 個預留 option，判斷不出兩支 XHR 是否都跑完，改認旗標
  if (!cardStandardSelect || !_standardWLoaded || !_standardSLoaded) {
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
document.getElementById('cardno').textContent = cardData.cardno || '-' ;

// 更新卡名
document.getElementById('cardname').textContent = cardData.cardname || '-' ;

// 更新稀有度
document.getElementById('cardrare').textContent = cardData.cardrare || '-' ;

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

// 更新種類（0→角色、1→事件、2→名場面）
document.getElementById('cardkind').textContent = (cardData.cardkind !== undefined && cardData.cardkind !== null && cardData.cardkind !== '')
    ? getAdvKindLabel(cardData.cardkind)
    : '-' ;

// 更新等級
document.getElementById('cardlevel').textContent = cardData.cardlevel || '-' ;

// 更新魂
document.getElementById('cardsoul').textContent = cardData.cardsoul || '-' ;

// 更新Cost
document.getElementById('cardcost').textContent = cardData.cardcost || '-' ;

// 更新Power
document.getElementById('cardpower').textContent = cardData.cardpower || '-' ;

// 更新サイド
document.getElementById('cardside').textContent = cardData.cardside || '-' ;

// 更新觸發
document.getElementById('cardtrigger').textContent = cardData.cardtrigger || '-' ;

// 更新特徵
document.getElementById('cardfeatures').textContent = cardData.cardfeatures || '-' ;

// 更新效果（支援HTML換行，但需先防範 XSS）
const cardText = cardData.cardtext || '-';
const escapedCardText = cardText
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
document.getElementById('cardtext').innerHTML = escapedCardText.replace(/\n/g, '<br>');

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

            //更新搜尋關鍵字（含各連結的無障礙名稱與畫面上的卡號）
            if (typeof window.updateExternalSearchLinks === 'function') {
                window.updateExternalSearchLinks(cardNumber, cardData.cardname || '');
            }


            window._statsCardExtra = {
                pack: rawCardData.pack || rawCardData.packName || rawCardData.set_name || '',
                firstRelease: rawCardData.firstRelease || rawCardData.releaseDate || rawCardData.release_date || rawCardData.release || ''
            };
            console.log('載入的卡片資料:', cardData);
            updateCardInfo(cardData);
            hideInfoMask();
            
            // ===== 判斷並生成稀有度下拉選單 =====
            let baseCardNumber = cardNumber;
            const baseMatch = cardNumber.match(/^(.+-\d+)/);
            if (baseMatch) {
                baseCardNumber = baseMatch[1];
            }

            let relatedCards = [];
            if (data.cards && Array.isArray(data.cards)) {
                relatedCards = data.cards.filter(c => c.id && c.id.startsWith(baseCardNumber));
            } else {
                relatedCards = Object.keys(data).filter(k => k.startsWith(baseCardNumber)).map(k => data[k]);
            }

            // 過濾掉可能因為數字前綴相同但長度不同的卡號 (例如 097 和 0970)
            relatedCards = relatedCards.filter(c => {
                const id = c.id || c.cardno;
                // 確保緊接在 baseCardNumber 後面的字元不是數字
                if (id === baseCardNumber) return true;
                const rest = id.substring(baseCardNumber.length);
                return !/^\d/.test(rest);
            });

            // 取得 filter-container
            const filterContainer = document.querySelector('.filter-container');
            if (filterContainer) {
                // 如果已經有稀有度下拉選單，先移除
                const existingGroup = document.getElementById('rareFilterGroup');
                if (existingGroup) {
                    existingGroup.remove();
                }

                // 如果有超過一種稀有度，才顯示下拉選單
                if (relatedCards.length > 1) {
                    const rareGroup = document.createElement('div');
                    rareGroup.className = 'filter-group';
                    rareGroup.id = 'rareFilterGroup';
                    
                    const label = document.createElement('label');
                    label.className = 'filter-label';
                    label.innerHTML = '<i class="fas fa-star mr-2"></i>此卡其他稀有度(普版、高版)';
                    
                    const select = document.createElement('select');
                    select.name = 'cardRareFilter';
                    select.id = 'cardRareFilter';
                    select.style.fontFamily = "'M PLUS U', sans-serif";
                    select.style.width = "300px";

                    relatedCards.forEach(c => {
                        const id = c.id || c.cardno;
                        const rare = c.rarity || c.cardrare || '未知';
                        const option = document.createElement('option');
                        option.value = id;
                        // 處理如果 baseNumber 完全等於 id 時，通常是標準稀有度
                        const displayRare = rare; 
                        option.textContent = displayRare;
                        if (id === cardNumber) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    });

                    select.addEventListener('change', function() {
                        const selectedId = this.value;
                        // 當切換稀有度時，我們把查詢框和下拉等狀態設好，然後再載入卡片
                        var inputEl = document.getElementById('xxxx');
                        if (inputEl) {
                            inputEl.value = selectedId;
                        }
                        if (typeof searchByCardNumber === 'function') {
                            searchByCardNumber(selectedId);
                        } else {
                            loadCardData(selectedId);
                        }
                    });

                    rareGroup.appendChild(label);
                    rareGroup.appendChild(select);
                    filterContainer.appendChild(rareGroup);
                }
            }
            // =====================================

        } else {
            console.error('找不到卡號:', cardNumber);
            showInfoMask('notfound');
        }
    })
    .catch(error => {
        console.error('載入卡片資料失敗:', error);
        showInfoMask('error');
    })
    .finally(() => {
        // 隱藏載入動畫
        hideOverlay('overlay-1');
    });
}



/**
* 顯示/隱藏 overlay
*/
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

// 顯示/隱藏卡片資訊遮罩
// reason: 'notfound' = 字典裡沒有這張卡；'error' = 資料載入失敗（可重試）
// 兩者對讀者的下一步完全不同，不能都寫「無法取得資料」
function showInfoMask(reason) {
    const swiper = document.getElementById('infoSwiper');
    const mask = document.getElementById('infoSwiperMask');
    const text = document.getElementById('infoSwiperMaskText');
    if (mask && swiper) {
        if (text) {
            text.innerHTML = reason === 'error'
                ? '<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>詳細資料載入失敗，請重新整理頁面'
                : '<i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>此卡號查無詳細資料';
        }
        mask.classList.add('active');
        swiper.classList.add('has-mask');
    }
}

function hideInfoMask() {
    const swiper = document.getElementById('infoSwiper');
    const mask = document.getElementById('infoSwiperMask');
    if (mask && swiper) {
        mask.classList.remove('active');
        swiper.classList.remove('has-mask');
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

    function normalizeText(value) {
        if (value === null || value === undefined) return '';
        var text = String(value).trim();
        return (text === '-' || text === '?') ? '' : text;
    }

    var normalizedItem = {
        cardNumber: normalizeText(item.cardNumber),
        cardName: normalizeText(item.cardName),
        cardRare: normalizeText(item.cardRare),
        cardTitle: normalizeText(item.cardTitle)
    };

    if (!normalizedItem.cardNumber) return;

    var history = getHistory();
    var existing = null;

    // 移除重複項（同一張卡號）
    history = history.filter(function(h) {
        if (h.cardNumber === normalizedItem.cardNumber) {
            existing = h;
            return false;
        }
        return true;
    });

    // 避免空值覆蓋：若新資料缺欄位，沿用舊紀錄
    if (existing) {
        normalizedItem.cardName = normalizedItem.cardName || normalizeText(existing.cardName);
        normalizedItem.cardRare = normalizedItem.cardRare || normalizeText(existing.cardRare);
        normalizedItem.cardTitle = normalizedItem.cardTitle || normalizeText(existing.cardTitle);
    }

    // 加入時間戳
    normalizedItem.timestamp = Date.now();

    // 插入到最前面
    history.unshift(normalizedItem);

    // 超過上限就截斷
    if (history.length > MAX_ITEMS) {
        history = history.slice(0, MAX_ITEMS);
    }

    saveHistory(history);
    renderHistory();
    console.log('搜尋歷史已新增:', normalizedItem.cardNumber);
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
    // 清除無法復原，所以先確認；按鈕直接寫出動作，不用「確定 / 取消」
    var count = getHistory().length;
    if (count > 0 && typeof Swal !== 'undefined') {
        showWsAlert({
            icon: 'warning',
            title: '清除全部查詢紀錄？',
            text: '將移除 ' + count + ' 筆紀錄，清除後無法復原。',
            showCancelButton: true,
            confirmButtonText: '清除紀錄',
            cancelButtonText: '保留',
            focusCancel: true
        }).then(function(result) {
            if (!result.isConfirmed) return;
            localStorage.removeItem(STORAGE_KEY);
            renderHistory();
            console.log('搜尋歷史已全部清除');
        });
        return;
    }

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
        countEl.textContent = history.length + ' 張';
    }

    var html = '';
    history.forEach(function(item, index) {
        var rareColor = getRareColor(item.cardRare);
        var timeAgo = formatTimeAgo(item.timestamp);
        
        // 標題描述結果（查詢哪張卡），而不是動作（點擊）
        html += '<div class="history-item" data-card-number="' + escapeHtml(item.cardNumber) + '" title="查詢 ' + escapeHtml(item.cardNumber) + '">';
        html += '  <div class="history-item-main" role="button" tabindex="0" aria-label="查詢 ' + escapeHtml(item.cardNumber) + (item.cardName ? ' ' + escapeHtml(item.cardName) : '') + '" onclick="SearchHistory.clickItem(\'' + escapeJsString(item.cardNumber) + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();SearchHistory.clickItem(\'' + escapeJsString(item.cardNumber) + '\');}">';
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
        // 12 個都叫「移除」的按鈕對讀螢幕軟體是無解的，名稱必須指出移除哪一張
        html += '  <button type="button" class="history-remove-btn" onclick="event.stopPropagation(); SearchHistory.removeItem(\'' + escapeJsString(item.cardNumber) + '\')" title="從紀錄中移除 ' + escapeHtml(item.cardNumber) + '" aria-label="從紀錄中移除 ' + escapeHtml(item.cardNumber) + '">';
        html += '    <i class="fas fa-times" aria-hidden="true"></i>';
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

/**
* 取得週分桶 key（以週一為週首）
* @param {Date} d
* @returns {string}
*/
function _getWeekBucketKey(d) {
    var mondayOffset = (d.getDay() + 6) % 7;
    var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayOffset);
    var m = monday.getMonth() + 1;
    var day = monday.getDate();
    return monday.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

/**
* 下載圖專用：超過 threshold 筆時改為每週聚合
* 價格與庫存皆取該週最後一筆有效值，X 軸 label 為該週最後一個日期
* @param {Array} labels
* @param {Array} priceData
* @param {Array} stockData
* @param {number} [threshold=90]
* @returns {{labels: Array, priceData: Array, stockData: Array, aggregated: boolean}}
*/
function _aggregateWeeklyForStatsExport(labels, priceData, stockData, threshold) {
    threshold = threshold || 90;
    if (!labels || labels.length <= threshold) {
        return {
            labels: labels,
            priceData: priceData,
            stockData: stockData,
            aggregated: false
        };
    }

    var buckets = {};
    var weekOrder = [];

    for (var i = 0; i < labels.length; i++) {
        var d = parseLabelToDate(labels[i]);
        if (!d) continue;

        var weekKey = _getWeekBucketKey(d);
        if (!buckets[weekKey]) {
            buckets[weekKey] = { label: labels[i], price: null, stock: null };
            weekOrder.push(weekKey);
        } else {
            buckets[weekKey].label = labels[i];
        }

        var p = priceData[i];
        if (p !== null && p !== undefined && !isNaN(Number(p))) {
            buckets[weekKey].price = p;
        }
        var s = stockData[i];
        if (s !== null && s !== undefined && !isNaN(Number(s))) {
            buckets[weekKey].stock = s;
        }
    }

    var outLabels = [];
    var outPrice = [];
    var outStock = [];
    for (var j = 0; j < weekOrder.length; j++) {
        var bucket = buckets[weekOrder[j]];
        outLabels.push(bucket.label);
        outPrice.push(bucket.price);
        outStock.push(bucket.stock);
    }

    return {
        labels: outLabels,
        priceData: outPrice,
        stockData: outStock,
        aggregated: true
    };
}

/**
* 依價格 labels 對齊庫存資料（找不到的日期填 null）
* @param {Array} labels
* @returns {Array}
*/
function _alignStockToLabels(labels) {
    if (!labels || labels.length === 0) return [];
    var stockIndexMap = {};
    for (var i = 0; i < _rawStockLabels.length; i++) {
        stockIndexMap[_rawStockLabels[i]] = _rawStockData[i];
    }
    return labels.map(function(label) {
        return Object.prototype.hasOwnProperty.call(stockIndexMap, label) ? stockIndexMap[label] : null;
    });
}

/**
* 統計圖匯出用 X 軸日期格式化
* @param {string} value
* @returns {string}
*/
function _formatStatsChartXTick(value) {
    if (typeof value !== 'string') return value;
    if (value.length === 8 && value.indexOf('-') < 0 && value.indexOf('/') < 0) {
        return value.substring(4, 6) + '/' + value.substring(6, 8);
    }
    if (value.indexOf('-') >= 0) {
        var dashParts = value.split('-');
        if (dashParts.length === 3) return dashParts[1] + '/' + dashParts[2];
    }
    if (value.indexOf('/') >= 0) {
        var slashParts = value.split('/');
        if (slashParts.length === 3) return slashParts[1] + '/' + slashParts[2];
    }
    return value;
}

/**
* 匯出圖的色彩系統。
*
* 這張圖的使用場景是被貼進 LINE 群組、被縮到拇指大小掃一眼，所以它是一張
* 海報而不是頁面截圖。整張圖只有一個色相（金），加上漲跌兩色；階層靠
* 「墨 / 紙 / 墨」三段地色和字級落差撐起來，不靠更多顏色或更多方框。
*
* 頁面 UI 用墨色濃淡表示漲跌（.price-up / .price-down），匯出圖用色相 ——
* 因為轉貼出去的圖沒有 hover、沒有圖例，一眼要看得出漲還是跌。
* 方向定義跟隨台／日市場慣例：漲為紅、跌為綠。
*/
function getStatsExportTheme() {
    var dark = isDarkTheme();
    return dark ? {
        isDark: true,
        ink: '#14110d',
        inkDeep: '#0b0907',
        inkText: '#f4f1e6',
        inkMuted: '#c3bda9',
        inkGold: '#e2bd77',
        inkGoldSoft: '#b99f6d',
        inkHairline: 'rgba(226, 189, 119, 0.32)',
        inkHairlineSoft: 'rgba(226, 189, 119, 0.15)',
        paper: '#22241f',
        paperText: '#f0eee4',
        paperMuted: '#a8a89c',
        paperSubtle: '#93958a',
        paperGold: '#dbb96e',
        paperHairline: 'rgba(240, 238, 228, 0.17)',
        paperRule: 'rgba(219, 185, 110, 0.45)',
        line: '#e0b967',
        lineRgb: '224, 185, 103',
        column: 'rgba(240, 238, 228, 0.10)',
        up: '#ff8b82',
        down: '#72c79b',
        upOnPaper: '#ff9a91',
        downOnPaper: '#7fd0a6'
    } : {
        isDark: false,
        ink: '#1d1710',
        inkDeep: '#120e09',
        inkText: '#f6efe0',
        inkMuted: '#cdc3ad',
        inkGold: '#e2bd77',
        inkGoldSoft: '#b99f6d',
        inkHairline: 'rgba(226, 189, 119, 0.34)',
        inkHairlineSoft: 'rgba(226, 189, 119, 0.16)',
        paper: '#f3f0e8',
        paperText: '#1d2637',
        paperMuted: '#5a6472',
        paperSubtle: '#626b78',
        paperGold: '#8a5f14',
        paperHairline: 'rgba(29, 38, 55, 0.14)',
        paperRule: 'rgba(138, 95, 20, 0.42)',
        line: '#a9761a',
        lineRgb: '169, 118, 26',
        column: 'rgba(29, 38, 55, 0.11)',
        up: '#ff8b82',
        down: '#72c79b',
        upOnPaper: '#b3282c',
        downOnPaper: '#1c6b47'
    };
}

/**
* Canvas 用 fillText 畫字時，畫的是「當下已載入」的字重。
* 頁面使用 M PLUS U；Canvas 文字也要明確指定相同字型。
* 所以動筆前先把要用到的字重載進來，並且設上限，字型 CDN 掛掉時
* 圖還是要生得出來。
* @returns {Promise}
*/
function _statsFontsReady() {
    if (typeof Promise === 'undefined') return null;
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var sample = '0123456789¥%價格庫存最高最低今日';
    var specs = [
        '400 12px "M PLUS U"',
        '500 12px "M PLUS U"',
        '700 20px "M PLUS U"',
        '900 62px "M PLUS U"'
    ];
    var jobs = [];
    for (var i = 0; i < specs.length; i++) {
        jobs.push(document.fonts.load(specs[i], sample));
    }
    return Promise.race([
        Promise.all(jobs).catch(function() { /* 字型載不到也要出圖 */ }),
        new Promise(function(resolve) { setTimeout(resolve, 1400); })
    ]);
}

/**
* 整理匯出圖要畫的走勢資料（價格 + 庫存），時間範圍跟隨 priceTimeRange 選單。
* 走勢是自己畫的，不再截 Chart.js 的圖 —— 2x 輸出下向量筆畫才不會糊，
* 也才控制得住最高／最低／今日這幾個標記。
* @returns {{labels: Array, price: Array, stock: Array, months: number}|null}
*/
function _buildStatsExportSeries() {
    if (!_rawPriceLabels || _rawPriceLabels.length === 0) return null;

    var months = 12;
    var priceTimeSelect = document.getElementById('priceTimeRange');
    if (priceTimeSelect) months = parseInt(priceTimeSelect.value, 10) || 12;

    var filtered = filterDataByMonths(_rawPriceLabels, _rawPriceData, months);
    if (!filtered.labels || filtered.labels.length === 0) return null;

    var stock = _alignStockToLabels(filtered.labels);
    var weekly = _aggregateWeeklyForStatsExport(filtered.labels, filtered.data, stock, 90);

    return {
        labels: weekly.labels,
        price: weekly.priceData,
        stock: weekly.stockData,
        months: months
    };
}

/**
* 找出好看又不說謊的軸刻度：每一條格線都會標上數字，
* 所以基準線不從 0 開始也讀得出來。
* @returns {{lo: number, hi: number, step: number}}
*/
function _niceAxis(min, max, targetTicks) {
    targetTicks = Math.max(2, targetTicks || 4);
    if (!isFinite(min) || !isFinite(max)) return { lo: 0, hi: 1, step: 1 };
    if (max <= min) max = min + Math.max(1, Math.abs(min) * 0.05);

    var raw = (max - min) / targetTicks;
    var magnitude = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var normalized = raw / magnitude;
    var stepFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    var step = stepFactor * magnitude;

    return {
        lo: Math.floor(min / step) * step,
        hi: Math.ceil(max / step) * step,
        step: step
    };
}

/**
* 手動字距。Canvas 的 letterSpacing 在舊版 Safari 沒有支援，
* 而這頁的讀者大半在手機上，所以小標的字距自己排。
* @returns {number} 實際佔用寬度
*/
function _drawTrackedText(ctx, text, x, y, tracking, align) {
    tracking = tracking || 0;
    var chars = String(text).split('');
    var total = 0;
    var i;
    for (i = 0; i < chars.length; i++) total += ctx.measureText(chars[i]).width + tracking;
    if (chars.length > 0) total -= tracking;

    var cursor = x;
    if (align === 'right') cursor = x - total;
    else if (align === 'center') cursor = x - total / 2;

    var prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    for (i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], cursor, y);
        cursor += ctx.measureText(chars[i]).width + tracking;
    }
    ctx.textAlign = prevAlign;
    return total;
}

/**
* 折行。卡名是這張圖的主角，寧可折兩行也不要在中文字中間截掉。
* 中文沒有空格，所以逐字累加；有空格時優先在空格斷行，避免切開英文字。
* @returns {Array<string>}
*/
function _wrapStatsText(ctx, text, maxWidth, maxLines) {
    text = String(text || '');
    maxLines = maxLines || 2;
    if (!text) return [''];
    if (ctx.measureText(text).width <= maxWidth) return [text];

    var lines = [];
    var current = '';
    var lastSpace = -1;

    for (var i = 0; i < text.length; i++) {
        var next = current + text.charAt(i);
        if (text.charAt(i) === ' ') lastSpace = current.length;

        if (ctx.measureText(next).width > maxWidth && current.length > 0) {
            if (lines.length === maxLines - 1) {
                lines.push(_truncateText(ctx, text.substring(i - current.length), maxWidth));
                return lines;
            }
            if (lastSpace > 0) {
                lines.push(current.substring(0, lastSpace));
                current = current.substring(lastSpace + 1) + text.charAt(i);
            } else {
                lines.push(current);
                current = text.charAt(i);
            }
            lastSpace = -1;
        } else {
            current = next;
        }
    }
    if (current) lines.push(current);
    return lines.slice(0, maxLines);
}

/**
* 文字截斷（根據 canvas measureText）
*/
function _truncateText(ctx, text, maxWidth) {
    text = String(text == null ? '' : text);
    if (ctx.measureText(text).width <= maxWidth) return text;
    var truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
        truncated = truncated.substring(0, truncated.length - 1);
    }
    return truncated + '…';
}

/**
* 判斷漲跌方向：1 漲 / -1 跌 / 0 無資料或平盤
*/
function _statsChangeDirection(text) {
    var value = String(text == null ? '' : text).trim();
    if (!value || value === '--' || value === '—') return 0;
    if (value.charAt(0) === '-' || value.charAt(0) === '−') return -1;
    if (value.charAt(0) === '+') return parseFloat(value.substring(1)) === 0 ? 0 : 1;
    var numeric = parseFloat(value.replace(/[^0-9.\-]/g, ''));
    if (isNaN(numeric) || numeric === 0) return 0;
    return numeric > 0 ? 1 : -1;
}

/**
* 漲跌三角形。用畫的，不用 ▲▼ 字元 —— 字元的大小和基線隨字型跑，
* 對不齊旁邊的數字。
*/
function _drawStatsTriangle(ctx, cx, cy, size, direction, color) {
    if (!direction) {
        ctx.fillStyle = color;
        ctx.fillRect(cx - size * 0.6, cy - 1, size * 1.2, 2);
        return;
    }
    var half = size * 0.62;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (direction > 0) {
        ctx.moveTo(cx, cy - size * 0.58);
        ctx.lineTo(cx + half, cy + size * 0.42);
        ctx.lineTo(cx - half, cy + size * 0.42);
    } else {
        ctx.moveTo(cx, cy + size * 0.58);
        ctx.lineTo(cx + half, cy - size * 0.42);
        ctx.lineTo(cx - half, cy - size * 0.42);
    }
    ctx.closePath();
    ctx.fill();
}

/**
* 墨底上的屬性籤。稀有度是價值來源，給它唯一一個實心金籤；
* 其餘用金色細框，維持「只有一個色相」。
* @returns {number} 下一個籤的 x
*/
function _drawStatsChip(ctx, x, y, text, theme, filled, dotColor) {
    var height = 23;
    ctx.font = '700 12px "M PLUS U", sans-serif';
    var textWidth = ctx.measureText(text).width;
    var padLeft = dotColor ? 20 : 10;
    var width = textWidth + padLeft + 10;

    if (filled) {
        ctx.fillStyle = theme.inkGold;
        roundRect(ctx, x, y, width, height, 3);
        ctx.fill();
    } else {
        ctx.strokeStyle = theme.inkHairline;
        ctx.lineWidth = 1;
        roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 3);
        ctx.stroke();
    }

    if (dotColor) {
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(x + 11, y + height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = filled ? theme.ink : theme.inkGold;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + padLeft, y + 16);
    return x + width + 7;
}

/**
* 威夏卡色對應的點色。這是遊戲屬性而不是語意色，
* 所以只給一個 8px 的點，不讓它跟漲跌色搶。
*/
function _statsCardColorDot(colorText) {
    var map = {
        '藍': '#5b9bd5', '青': '#5b9bd5',
        '紅': '#e2685f', '赤': '#e2685f',
        '黃': '#e0b24a', '黄': '#e0b24a',
        '綠': '#5aab7c', '緑': '#5aab7c'
    };
    return map[colorText] || null;
}

/**
* 沒有卡圖時的替代框。墨底上用金色細框加中央的金色細十字，
* 不用 emoji 當圖示。
*/
function _drawStatsCardPlaceholder(ctx, x, y, w, h, theme) {
    ctx.fillStyle = theme.inkDeep;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();

    ctx.strokeStyle = theme.inkHairline;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 5);
    ctx.stroke();
    ctx.setLineDash([]);

    // 畫一個相框圖示（框 + 山稜線 + 太陽），而不是拿標點或 emoji 充當圖示
    var cx = x + w / 2;
    var cy = y + h / 2 - 8;
    ctx.strokeStyle = theme.inkHairline;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    roundRectPath(ctx, cx - 22, cy - 17, 44, 34, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy + 10);
    ctx.lineTo(cx - 4, cy - 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.lineTo(cx + 10, cy - 2);
    ctx.lineTo(cx + 16, cy + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 9, cy - 8, 3, 0, Math.PI * 2);
    ctx.stroke();

    cy = y + h / 2;
    ctx.fillStyle = theme.inkGoldSoft;
    ctx.font = '500 11px "M PLUS U", sans-serif';
    ctx.textAlign = 'center';
    _drawTrackedText(ctx, '無卡面圖', cx, cy + 34, 1.6, 'center');
    ctx.textAlign = 'left';
}

/**
* 生成統計圖片並在新分頁顯示。
* 版面：墨底頁首（卡面 + 卡名 + 現價）／紙底走勢／數據條／墨底頁尾。
*/
function generateStatsImage() {
    if (!myChart) {
        showWsAlert({ icon: 'warning', title: '還沒有可下載的圖表', text: '請先查詢一張卡號，載入價格走勢後再下載。', confirmButtonText: '知道了' });
        return;
    }

    // 在使用者點擊的同步階段先開啟分頁，避免非同步合成完成後被瀏覽器阻擋
    var statsWindow = window.open('', '_blank');
    if (!statsWindow) {
        showWsAlert({ icon: 'warning', title: '無法開啟新分頁', text: '請允許此網站開啟新分頁後再試一次。', confirmButtonText: '知道了' });
        return;
    }

    // 卡圖非同步讀取期間仍要維持同一個主題，避免走勢和戰報框架來自不同模式。
    var exportTheme = getStatsExportTheme();

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

    // 尚未選擇時的選項要判成空字串，否則「選擇作品系列」這種提示文字
    // 會被當成作品名，直接印進下載的統計圖裡。
    // 用 value 的哨兵值 000/000-000 判斷，而不是比對顯示文字 ——
    // 顯示文字是給人看的，隨時可能被改寫。
    function _selectedOptionLabel(selectEl) {
        if (!selectEl || selectEl.selectedIndex < 0) return '';
        var opt = selectEl.options[selectEl.selectedIndex];
        if (!opt || opt.value === '000/000-000') return '';
        return opt.text || '';
    }

    // 作品名稱（從 cardStandard 選擇器）
    var productName = _selectedOptionLabel(document.getElementById('cardStandard'));

    // 系列名稱（從 cardTitle 選擇器）
    var cardTitleSelect = document.getElementById('cardTitle');
    var seriesName = _selectedOptionLabel(cardTitleSelect);

    // 價格摘要資訊
    var currentPrice = document.getElementById('summaryCurrentPrice') ? document.getElementById('summaryCurrentPrice').textContent : '--';
    var highPrice = document.getElementById('summaryHighPrice') ? document.getElementById('summaryHighPrice').textContent : '--';
    var lowPrice = document.getElementById('summaryLowPrice') ? document.getElementById('summaryLowPrice').textContent : '--';
    var changePercent = document.getElementById('summaryChangePercent') ? document.getElementById('summaryChangePercent').textContent : '--';

    // 額外卡片資訊（Header 2x2 卡 + 資訊 table）
    var cardKind = document.getElementById('cardkind') ? document.getElementById('cardkind').textContent.trim() : '--';
    var cardFeatures = document.getElementById('cardfeatures') ? document.getElementById('cardfeatures').textContent.trim() : '--';
    var cardPack = (_statsCardExtra && _statsCardExtra.pack) ? _statsCardExtra.pack : seriesName;
    var cardFirstRelease = (_statsCardExtra && _statsCardExtra.firstRelease) ? _statsCardExtra.firstRelease : '--';
    var highDate = '--', lowDate = '--';
    var dayChangePrice = '', currentStock = '--', dayChangeStock = '';
    var marketChangeAmount = '--', marketChangePercent = '--';
    (function() {
        if (_rawPriceLabels.length > 0 && _rawPriceData.length > 0) {
            var cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            var valid30 = [];
            for (var priceIndex = 0; priceIndex < _rawPriceData.length; priceIndex++) {
                var price = parseFloat(_rawPriceData[priceIndex]);
                var priceDate = parseLabelToDate(_rawPriceLabels[priceIndex]);
                if (!isNaN(price) && price > 0 && priceDate && priceDate >= cutoff) {
                    valid30.push({ value: price, label: _rawPriceLabels[priceIndex] });
                }
            }
            if (valid30.length > 0) {
                var hmaxObj = valid30.reduce(function(acc, x) { return x.value > acc.value ? x : acc; }, valid30[0]);
                var hminObj = valid30.reduce(function(acc, x) { return x.value < acc.value ? x : acc; }, valid30[0]);
                var fmtLabel = function(s) {
                    var date = parseLabelToDate(s);
                    return date ? (date.getMonth() + 1) + '/' + date.getDate() : s;
                };
                highDate = fmtLabel(hmaxObj.label);
                lowDate = fmtLabel(hminObj.label);
                if (valid30.length >= 2) {
                    var first30 = valid30[0].value;
                    var last30 = valid30[valid30.length - 1].value;
                    var difference = last30 - first30;
                    var sign = difference > 0 ? '+' : difference < 0 ? '-' : '';
                    marketChangeAmount = sign + '¥' + Math.abs(difference).toLocaleString();
                    marketChangePercent = (difference > 0 ? '+' : '') + ((difference / first30) * 100).toFixed(1) + '%';
                }
            }
            // 與昨日相比（price）
            var validAllPrice = _rawPriceData.map(function(v) { return parseFloat(v) || 0; }).filter(function(v) { return v > 0; });
            if (validAllPrice.length >= 2) {
                var todayP = validAllPrice[validAllPrice.length - 1];
                var yestP  = validAllPrice[validAllPrice.length - 2];
                var pct = ((todayP - yestP) / yestP * 100).toFixed(1);
                dayChangePrice = (parseFloat(pct) > 0 ? '+' : '') + pct + '%';
            }
        }
        // 庫存數量 & 與昨日相比（stock）
        if (_rawStockData.length > 0) {
            var validStock = _rawStockData.map(function(v) { return parseFloat(v); }).filter(function(v) { return !isNaN(v); });
            if (validStock.length > 0) {
                currentStock = String(Math.round(validStock[validStock.length - 1]));
                if (validStock.length >= 2) {
                    var diff = Math.round(validStock[validStock.length - 1] - validStock[validStock.length - 2]);
                    dayChangeStock = (diff > 0 ? '+' : '') + String(diff);
                }
            }
        }
    })();

    // 取得卡片圖片 URL
    var cardImgEl = document.getElementById('cardImg');
    var cardImgSrc = (cardImgEl && cardImgEl.src) ? cardImgEl.src : '';

    var series = _buildStatsExportSeries();

    // ===== 載入卡片圖片（跨域），載入完成後再合成 =====
    var cardImage = new Image();
    cardImage.crossOrigin = 'anonymous';
    var cardImageLoaded = false;

    function doCompose() {
        var info = {
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
            series: series,
            cardImage: cardImageLoaded ? cardImage : null,
            theme: exportTheme,
            statsWindow: statsWindow,
            cardKind: cardKind,
            cardFeatures: cardFeatures,
            cardPack: cardPack,
            cardFirstRelease: cardFirstRelease,
            highDate: highDate,
            lowDate: lowDate,
            currentStock: currentStock,
            dayChangePrice: dayChangePrice,
            dayChangeStock: dayChangeStock,
            marketChangeAmount: marketChangeAmount,
            marketChangePercent: marketChangePercent
        };
        var fontsReady = _statsFontsReady();
        if (fontsReady && fontsReady.then) {
            fontsReady.then(function() { _composeStatsCanvas(info); });
        } else {
            _composeStatsCanvas(info);
        }
    }

    var CARD_BACK_URL = './dist/img/cardback.png';

    function loadFallbackCardBack() {
        var fallback = new Image();
        fallback.crossOrigin = 'anonymous';
        fallback.onload = function() {
            cardImageLoaded = true;
            cardImage = fallback;
            doCompose();
        };
        fallback.onerror = function() {
            cardImageLoaded = false;
            doCompose();
        };
        fallback.src = CARD_BACK_URL;
    }

    if (cardImgSrc) {
        cardImage.onload = function() {
            cardImageLoaded = true;
            doCompose();
        };
        cardImage.onerror = function() {
            // 原圖失敗，改用卡背
            loadFallbackCardBack();
        };
        cardImage.src = cardImgSrc;
        // 如果圖片已經在快取中
        if (cardImage.complete && cardImage.naturalWidth > 0) {
            cardImageLoaded = true;
        }
    } else {
        // 沒有卡圖 src，直接用卡背
        loadFallbackCardBack();
    }
}

/* 匯出圖版面尺寸（CSS px；實際以 2x 繪製） */
var STATS_EXPORT_LAYOUT = {
    W: 800,
    GUTTER: 36,
    HEAD_H: 364,
    CHART_TOP: 364,
    PLOT_X: 88,
    PLOT_Y: 428,
    PLOT_H: 232,
    STRIP_TOP: 700,
    STRIP_BOTTOM: 800,
    FOOTER_H: 46
};

/**
* 合成匯出圖。
* 三段地色：墨（主角與現價）／紙（走勢）／墨（來源），只有一個色相。
* 走勢是直接畫在同一張 canvas 上的，所以整張圖是同步完成，沒有第二個非同步關卡。
* @param {object} info
*/
function _composeStatsCanvas(info) {
    var L = STATS_EXPORT_LAYOUT;
    var theme = info.theme || getStatsExportTheme();
    var W = L.W;
    var H = L.STRIP_BOTTOM + L.FOOTER_H;

    // ── HiDPI：以 2x 解析度繪製，確保輸出清晰 ──
    var DPR = 2;
    var offscreen = document.createElement('canvas');
    offscreen.width = W * DPR;
    offscreen.height = H * DPR;
    offscreen.style.width = W + 'px';
    offscreen.style.height = H + 'px';
    var ctx = offscreen.getContext('2d');
    ctx.scale(DPR, DPR);
    ctx.textBaseline = 'alphabetic';

    _drawStatsPaperGround(ctx, W, H, L, theme);
    _drawStatsInkHead(ctx, W, L, theme, info);
    _drawStatsTrend(ctx, W, L, theme, info);
    _drawStatsMarketStrip(ctx, W, L, theme, info);
    _drawStatsFooter(ctx, W, H, L, theme, info);

    _tryDownload(offscreen, info.cardNo, info.statsWindow, info);
}

/**
* 中段紙底
*/
function _drawStatsPaperGround(ctx, W, H, L, theme) {
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, L.CHART_TOP, W, H - L.CHART_TOP);
}

/**
* 墨底頁首：卡面在左，卡名／屬性／收錄在右上，現價與 30 日變化壓在底部。
* 現價是這張圖唯一的主角，字級直接拉到 62px；其他東西全部退到它後面。
*/
function _drawStatsInkHead(ctx, W, L, theme, info) {
    var G = L.GUTTER;
    var headH = L.HEAD_H;

    var ground = ctx.createLinearGradient(0, 0, W * 0.72, headH);
    ground.addColorStop(0, theme.ink);
    ground.addColorStop(1, theme.inkDeep);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, headH);

    ctx.fillStyle = theme.inkGold;
    ctx.fillRect(0, headH - 2, W, 2);

    // ── 卡面：收藏品本身要先被看見 ──
    var boxX = G + 4, boxY = 34, boxW = 208, boxH = 296;
    if (info.cardImage) {
        var srcW = info.cardImage.naturalWidth || info.cardImage.width || boxW;
        var srcH = info.cardImage.naturalHeight || info.cardImage.height || boxH;
        var scale = Math.min(boxW / srcW, boxH / srcH);
        var drawW = srcW * scale, drawH = srcH * scale;
        var drawX = boxX + (boxW - drawW) / 2, drawY = boxY + (boxH - drawH) / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.62)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 14;
        ctx.fillStyle = theme.inkDeep;
        roundRect(ctx, drawX, drawY, drawW, drawH, 5);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.save();
        ctx.beginPath();
        roundRectPath(ctx, drawX, drawY, drawW, drawH, 5);
        ctx.clip();
        ctx.drawImage(info.cardImage, drawX, drawY, drawW, drawH);
        ctx.restore();

        ctx.strokeStyle = theme.inkHairline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundRectPath(ctx, drawX + 0.5, drawY + 0.5, drawW - 1, drawH - 1, 5);
        ctx.stroke();
    } else {
        _drawStatsCardPlaceholder(ctx, boxX, boxY, boxW, boxH, theme);
    }

    // ── 身分：卡名是標題本身，不加上方小標 ──
    var TX = boxX + boxW + 44;
    var RX = W - G;
    var colW = RX - TX;

    ctx.textAlign = 'left';
    ctx.fillStyle = theme.inkText;
    ctx.font = '700 30px "M PLUS U", sans-serif';
    var nameLines = _wrapStatsText(ctx, info.cardName || info.cardNo || '卡片資料', colW, 2);
    var nameBaseline = 60;
    for (var n = 0; n < nameLines.length; n++) {
        ctx.fillText(nameLines[n], TX, nameBaseline + n * 38);
    }
    var afterName = nameBaseline + (nameLines.length - 1) * 38;

    var chipY = afterName + 14;
    var chipX = TX;
    if (info.cardRare) chipX = _drawStatsChip(ctx, chipX, chipY, info.cardRare, theme, true);
    if (info.cardColor) chipX = _drawStatsChip(ctx, chipX, chipY, info.cardColor, theme, false, _statsCardColorDot(info.cardColor));
    if (info.cardKind && info.cardKind !== '--') chipX = _drawStatsChip(ctx, chipX, chipY, info.cardKind, theme, false);
    if (info.cardLevel) chipX = _drawStatsChip(ctx, chipX, chipY, 'Lv ' + info.cardLevel, theme, false);
    if (info.cardPower) chipX = _drawStatsChip(ctx, chipX, chipY, 'P ' + info.cardPower, theme, false);

    // ── 卡號與收錄：查得到、對得上，但不跟現價搶 ──
    var factRows = [
        { label: '卡號', value: info.cardNo || '--' },
        { label: '收錄', value: info.cardPack || info.seriesName || '--' },
        { label: '特徵', value: info.cardFeatures || '--' }
    ];
    var factY = chipY + 23 + 30;
    for (var f = 0; f < factRows.length; f++) {
        var rowY = factY + f * 22;
        ctx.fillStyle = theme.inkGoldSoft;
        ctx.font = '500 10px "M PLUS U", sans-serif';
        _drawTrackedText(ctx, factRows[f].label, TX, rowY, 1.8);
        ctx.fillStyle = theme.inkMuted;
        ctx.font = '400 12px "M PLUS U", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(_truncateText(ctx, factRows[f].value, colW - 58), TX + 58, rowY);
    }

    // ── 現價：整張圖的答案，貼齊頁首底部 ──
    var ruleY = 228;
    ctx.strokeStyle = theme.inkHairline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(TX, ruleY + 0.5);
    ctx.lineTo(RX, ruleY + 0.5);
    ctx.stroke();

    ctx.fillStyle = theme.inkGold;
    ctx.font = '700 10px "M PLUS U", sans-serif';
    ctx.textAlign = 'left';
    _drawTrackedText(ctx, '遊遊亭 現價 / JPY', TX, 252, 2.2);

    // 沒有報價時不要把 62px 的「--」印上去 —— 兩條粗槓看起來像被塗掉，
    // 而不是「沒有資料」。空狀態要用話講清楚。
    var hasPrice = !!info.currentPrice && info.currentPrice !== '--' && info.currentPrice !== '-';
    if (hasPrice) {
        ctx.fillStyle = theme.inkText;
        ctx.font = '900 62px "M PLUS U", sans-serif';
        ctx.fillText(_truncateText(ctx, info.currentPrice, colW * 0.62), TX, 308);
    } else {
        ctx.fillStyle = theme.inkGoldSoft;
        ctx.font = '700 26px "M PLUS U", sans-serif';
        ctx.fillText('目前沒有價格紀錄', TX, 298);
    }

    var hasChange = hasPrice && info.marketChangePercent && info.marketChangePercent !== '--';
    if (hasChange) {
        var direction = _statsChangeDirection(info.marketChangePercent);
        var directionColor = direction > 0 ? theme.up : direction < 0 ? theme.down : theme.inkMuted;

        ctx.textAlign = 'right';
        ctx.fillStyle = directionColor;
        ctx.font = '700 30px "M PLUS U", sans-serif';
        ctx.fillText(info.marketChangePercent, RX, 302);
        if (direction !== 0) {
            var changeWidth = ctx.measureText(info.marketChangePercent).width;
            _drawStatsTriangle(ctx, RX - changeWidth - 15, 292, 12, direction, directionColor);
        }

        ctx.fillStyle = theme.inkGoldSoft;
        ctx.font = '500 11px "M PLUS U", sans-serif';
        var amount = (info.marketChangeAmount && info.marketChangeAmount !== '--') ? info.marketChangeAmount + '　' : '';
        _drawTrackedText(ctx, amount + '近 30 日', RX, 328, 0.6, 'right');
        ctx.textAlign = 'left';
    }
}

/**
* 紙底走勢段。走勢直接畫在合成 canvas 上：
* 庫存是墨色底柱（配角），價格是唯一的金線（主角），
* 最高／最低只標位置，數字留給下面的數據條，避免同一個數字說兩次。
*/
function _drawStatsTrend(ctx, W, L, theme, info) {
    var G = L.GUTTER;
    var plotX = L.PLOT_X;
    var plotY = L.PLOT_Y;
    var plotW = W - G - plotX;
    var plotH = L.PLOT_H;
    var plotBottom = plotY + plotH;

    // 段落標題
    ctx.fillStyle = theme.paperGold;
    ctx.fillRect(G, 388, 4, 18);
    ctx.fillStyle = theme.paperText;
    ctx.font = '700 16px "M PLUS U", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('價格與庫存走勢', G + 16, 404);

    var months = (info.series && info.series.months) ? info.series.months : 12;
    ctx.fillStyle = theme.paperMuted;
    ctx.font = '500 11px "M PLUS U", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('近 ' + months + ' 個月　資料來源：遊遊亭', W - G, 403);
    ctx.textAlign = 'left';

    var series = info.series;
    var points = [];
    if (series && series.labels && series.labels.length > 0) {
        for (var i = 0; i < series.labels.length; i++) {
            var priceValue = parseFloat(series.price[i]);
            var stockValue = parseFloat(series.stock[i]);
            points.push({
                label: series.labels[i],
                price: (isFinite(priceValue) && priceValue > 0) ? priceValue : null,
                stock: isFinite(stockValue) ? stockValue : null
            });
        }
    }
    var pricePoints = points.filter(function(p) { return p.price !== null; });

    if (pricePoints.length < 2) {
        ctx.strokeStyle = theme.paperHairline;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        roundRectPath(ctx, plotX + 0.5, plotY + 0.5, plotW - 1, plotH - 1, 6);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = theme.paperMuted;
        ctx.font = '500 13px "M PLUS U", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('這張卡目前的價格紀錄不足，畫不出走勢。', plotX + plotW / 2, plotY + plotH / 2);
        ctx.textAlign = 'left';
        return;
    }

    var priceValues = pricePoints.map(function(p) { return p.price; });
    var axis = _niceAxis(Math.min.apply(null, priceValues), Math.max.apply(null, priceValues), 4);
    var inset = 8;
    var stepX = points.length > 1 ? (plotW - inset * 2) / (points.length - 1) : 0;

    function px(index) { return plotX + inset + index * stepX; }
    function py(value) { return plotBottom - ((value - axis.lo) / (axis.hi - axis.lo)) * plotH; }

    // 格線：每一條都標數字，所以基準線不從 0 開始也不會誤導
    ctx.font = '500 11px "M PLUS U", sans-serif';
    for (var tick = axis.lo; tick <= axis.hi + axis.step * 0.01; tick += axis.step) {
        var ty = Math.round(py(tick)) + 0.5;
        ctx.strokeStyle = theme.paperHairline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotX, ty);
        ctx.lineTo(plotX + plotW, ty);
        ctx.stroke();
        ctx.fillStyle = theme.paperSubtle;
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(tick).toLocaleString('en-US'), plotX - 12, ty + 4);
    }
    ctx.textAlign = 'left';

    // 庫存底柱（配角，墨色不搶金線）
    var stockValues = points.filter(function(p) { return p.stock !== null; }).map(function(p) { return p.stock; });
    var hasStock = stockValues.length > 0;
    if (hasStock) {
        var stockMax = Math.max.apply(null, stockValues) || 1;
        var barW = Math.max(1.5, Math.min(11, stepX * 0.52));
        ctx.fillStyle = theme.column;
        for (var s = 0; s < points.length; s++) {
            if (points[s].stock === null) continue;
            var barH = (points[s].stock / stockMax) * (plotH * 0.36);
            if (barH < 1) barH = 1;
            ctx.fillRect(px(s) - barW / 2, plotBottom - barH, barW, barH);
        }
    }

    // 「今日」的位置：右緣的垂直金色細線
    var lastIndex = points.length - 1;
    while (lastIndex > 0 && points[lastIndex].price === null) lastIndex--;
    var lastX = px(lastIndex);
    ctx.strokeStyle = theme.paperRule;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(Math.round(lastX) + 0.5, plotY);
    ctx.lineTo(Math.round(lastX) + 0.5, plotBottom + 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // 價格線與面積
    var fill = ctx.createLinearGradient(0, plotY, 0, plotBottom);
    fill.addColorStop(0, 'rgba(' + theme.lineRgb + ', 0.22)');
    fill.addColorStop(1, 'rgba(' + theme.lineRgb + ', 0)');

    var segments = [];
    var currentSegment = [];
    for (var q = 0; q < points.length; q++) {
        if (points[q].price === null) {
            if (currentSegment.length > 0) { segments.push(currentSegment); currentSegment = []; }
        } else {
            currentSegment.push({ x: px(q), y: py(points[q].price) });
        }
    }
    if (currentSegment.length > 0) segments.push(currentSegment);

    for (var sg = 0; sg < segments.length; sg++) {
        var seg = segments[sg];
        if (seg.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(seg[0].x, plotBottom);
        for (var a = 0; a < seg.length; a++) ctx.lineTo(seg[a].x, seg[a].y);
        ctx.lineTo(seg[seg.length - 1].x, plotBottom);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    }

    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 2.75;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var sl = 0; sl < segments.length; sl++) {
        var line = segments[sl];
        ctx.beginPath();
        for (var b = 0; b < line.length; b++) {
            if (b === 0) ctx.moveTo(line[b].x, line[b].y);
            else ctx.lineTo(line[b].x, line[b].y);
        }
        ctx.stroke();
    }

    // 期間最高／最低。標籤一定要帶「期間」和數字：
    // 下面的數據條講的是近 30 日，這裡講的是整個顯示區間，
    // 兩個不同的窗口如果都只寫「最高」，圖就會自己跟自己矛盾。
    var highIndex = 0, lowIndex = 0;
    for (var m = 0; m < points.length; m++) {
        if (points[m].price === null) continue;
        if (points[highIndex].price === null || points[m].price > points[highIndex].price) highIndex = m;
        if (points[lowIndex].price === null || points[m].price < points[lowIndex].price) lowIndex = m;
    }

    function markExtreme(index, label, above) {
        var mx = px(index), my = py(points[index].price);
        var text = label + ' ¥' + Math.round(points[index].price).toLocaleString('en-US');
        var isToday = index === lastIndex;

        if (!isToday) {
            ctx.strokeStyle = theme.line;
            ctx.lineWidth = 1.75;
            ctx.beginPath();
            ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.font = '700 9px "M PLUS U", sans-serif';
        var textW = ctx.measureText(text).width + (text.length - 1) * 1.4;
        var labelY = above ? my - 15 : my + 23;
        labelY = Math.max(plotY + 12, Math.min(plotBottom - 6, labelY));

        // 今日的點自己有標記，標籤往左讓開，不要疊在一起
        var anchorRight = isToday ? mx - 14 : Math.min(mx + textW / 2, plotX + plotW);
        var anchorLeft = anchorRight - textW;
        if (anchorLeft < plotX) { anchorLeft = plotX; anchorRight = plotX + textW; }

        // 標籤壓在庫存底柱上會讀不到，先鋪一塊紙色底
        ctx.fillStyle = theme.paper;
        roundRect(ctx, anchorLeft - 5, labelY - 10, textW + 10, 15, 3);
        ctx.fill();

        ctx.fillStyle = theme.paperGold;
        _drawTrackedText(ctx, text, anchorLeft, labelY, 1.4);
        ctx.textAlign = 'left';
    }
    if (points[highIndex].price !== null) markExtreme(highIndex, '期間最高', true);
    if (points[lowIndex].price !== null && lowIndex !== highIndex) markExtreme(lowIndex, '期間最低', false);

    // 今日的點
    var lastY = py(points[lastIndex].price);
    ctx.fillStyle = 'rgba(' + theme.lineRgb + ', 0.22)';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.line;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.paper;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
    ctx.stroke();

    // X 軸：只標月份起點，並保持最小間距，不讓標籤擠成一排斜字。
    // 「今日」掛在時間軸上，右端的月份讓位給它。
    var axisBaseline = plotBottom + 20;
    ctx.fillStyle = theme.paperGold;
    ctx.font = '700 10px "M PLUS U", sans-serif';
    var todayLabelW = _drawTrackedText(ctx, '今日', Math.min(lastX + 12, plotX + plotW), axisBaseline, 1.8, 'right');
    var todayLabelLeft = Math.min(lastX + 12, plotX + plotW) - todayLabelW;

    var lastLabelX = -999;
    ctx.fillStyle = theme.paperSubtle;
    ctx.font = '500 10px "M PLUS U", sans-serif';
    var previousMonth = -1;
    for (var x = 0; x < points.length; x++) {
        var d = parseLabelToDate(points[x].label);
        if (!d) continue;
        if (d.getMonth() === previousMonth) continue;
        previousMonth = d.getMonth();
        var labelX = px(x);
        if (labelX - lastLabelX < 62) continue;
        if (labelX > todayLabelLeft - 22) continue;
        lastLabelX = labelX;
        ctx.textAlign = 'center';
        ctx.fillText((d.getMonth() + 1) + ' 月', labelX, axisBaseline);
    }
    ctx.textAlign = 'left';

    // 圖例：貼在圖上，不用另開一塊圖例區
    var keyY = plotY + 14;
    var keyRight = plotX + plotW;
    ctx.font = '500 10px "M PLUS U", sans-serif';
    if (hasStock) {
        ctx.fillStyle = theme.paperMuted;
        var stockLabelW = _drawTrackedText(ctx, '庫存', keyRight - 34, keyY, 1.2, 'right');
        var swatchX = keyRight - 34 - stockLabelW - 15;
        // 底柱在圖裡是刻意壓低的配角，但圖例裡要找得到，所以補一道細框
        ctx.fillStyle = theme.column;
        ctx.fillRect(swatchX, keyY - 8, 9, 9);
        ctx.strokeStyle = theme.paperHairline;
        ctx.lineWidth = 1;
        ctx.strokeRect(swatchX + 0.5, keyY - 7.5, 8, 8);
        keyRight = swatchX - 12;
    }
    ctx.fillStyle = theme.paperMuted;
    var priceLabelW = _drawTrackedText(ctx, '價格', keyRight, keyY, 1.2, 'right');
    ctx.strokeStyle = theme.line;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(keyRight - priceLabelW - 22, keyY - 4);
    ctx.lineTo(keyRight - priceLabelW - 8, keyY - 4);
    ctx.stroke();
}

/**
* 數據條：四格一行，只有金色細線分隔，沒有方框。
* 最高／最低是區間端點而不是方向，維持墨色；只有「較昨日」用漲跌色。
*/
function _drawStatsMarketStrip(ctx, W, L, theme, info) {
    var G = L.GUTTER;
    var top = L.STRIP_TOP;
    var bottom = L.STRIP_BOTTOM;

    ctx.strokeStyle = theme.paperRule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(G, top + 0.5);
    ctx.lineTo(W - G, top + 0.5);
    ctx.stroke();

    var dayDirection = _statsChangeDirection(info.dayChangePrice);
    var dayColor = dayDirection > 0 ? theme.upOnPaper : dayDirection < 0 ? theme.downOnPaper : theme.paperMuted;

    var cells = [
        { label: '30 日最高', value: info.highPrice || '--', note: info.highDate && info.highDate !== '--' ? info.highDate : '', color: theme.paperText },
        { label: '30 日最低', value: info.lowPrice || '--', note: info.lowDate && info.lowDate !== '--' ? info.lowDate : '', color: theme.paperText },
        { label: '較昨日', value: info.dayChangePrice || '--', note: '價格', color: dayColor },
        { label: '目前庫存', value: (info.currentStock && info.currentStock !== '--') ? info.currentStock + ' 件' : '--', note: info.dayChangeStock ? '較昨日 ' + info.dayChangeStock : '', color: theme.paperText }
    ];

    var cellW = (W - G * 2) / cells.length;
    for (var i = 0; i < cells.length; i++) {
        var cx = G + i * cellW;
        if (i > 0) {
            ctx.strokeStyle = theme.paperHairline;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(Math.round(cx) + 0.5, top + 14);
            ctx.lineTo(Math.round(cx) + 0.5, bottom - 14);
            ctx.stroke();
        }
        var textX = cx + (i === 0 ? 0 : 20);
        // 值是 '--' 的時候連日期註記一起收掉：沒有最高價，就沒有「最高價那天」。
        var hasValue = cells[i].value !== '--';
        if (!hasValue) cells[i].note = '';

        ctx.fillStyle = theme.paperGold;
        ctx.font = '700 10px "M PLUS U", sans-serif';
        _drawTrackedText(ctx, cells[i].label, textX, top + 30, 1.8);

        ctx.fillStyle = hasValue ? cells[i].color : theme.paperSubtle;
        ctx.font = '700 24px "M PLUS U", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(_truncateText(ctx, cells[i].value, cellW - 24), textX, top + 64);

        if (cells[i].note) {
            ctx.fillStyle = theme.paperSubtle;
            ctx.font = '500 10px "M PLUS U", sans-serif';
            _drawTrackedText(ctx, cells[i].note, textX, top + 84, 0.8);
        }
    }
}

/**
* 墨底頁尾：轉貼出去以後，這一條是唯一還說得出圖從哪裡來的東西。
*/
function _drawStatsFooter(ctx, W, H, L, theme, info) {
    var G = L.GUTTER;
    var top = L.STRIP_BOTTOM;

    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, top, W, H - top);

    var baseline = top + 29;

    ctx.fillStyle = theme.inkGold;
    ctx.fillRect(G, top + 17, 3, 13);

    ctx.textAlign = 'left';
    ctx.fillStyle = theme.inkGold;
    ctx.font = '700 14px "M PLUS U", sans-serif';
    ctx.fillText('WS-Cards', G + 11, baseline);
    var markWidth = ctx.measureText('WS-Cards').width;

    ctx.fillStyle = theme.inkGoldSoft;
    ctx.font = '500 11px "M PLUS U", sans-serif';
    _drawTrackedText(ctx, '卡片雲　ws-cards.cloud', G + 11 + markWidth + 12, baseline, 0.6);

    var now = new Date();
    var stamp = now.getFullYear() + '/' + ('0' + (now.getMonth() + 1)).slice(-2) + '/' + ('0' + now.getDate()).slice(-2)
        + ' ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    ctx.fillStyle = theme.inkGoldSoft;
    ctx.font = '500 11px "M PLUS U", sans-serif';
    _drawTrackedText(ctx, '資料來源：遊遊亭　製表 ' + stamp, W - G, baseline, 0.6, 'right');
    ctx.textAlign = 'left';
}

/**
* 嘗試顯示 canvas，若因跨域 taint 失敗則重試不含卡圖
*/
function _tryDownload(canvas, cardNo, statsWindow, info) {
    try {
        triggerDownload(canvas, cardNo, statsWindow);
    } catch (e) {
        if (!info || !info.cardImage) {
            if (statsWindow && !statsWindow.closed) statsWindow.close();
            console.error('圖片產生失敗:', e);
            showWsAlert({ icon: 'error', title: '圖片產生失敗', text: '請重新整理頁面後再試一次。', confirmButtonText: '知道了' });
            return;
        }
        console.warn('Canvas tainted，嘗試不含卡圖重新生成...', e);
        // 跨域導致 taint，重新生成不含卡圖的版本
        showWsAlert({
            icon: 'info',
            title: '圖片將不含卡面',
            text: '卡面圖片來自外部網站，無法一起存下來。其餘價格與卡片資訊都會保留。',
            timer: 2000,
            showConfirmButton: false
        });
        // 重新呼叫，但不帶卡圖
        var infoWithoutImg = Object.assign({}, info || {});
        infoWithoutImg.cardImage = null;
        _composeStatsCanvas(infoWithoutImg);
    }
}

/**
* 在預先開啟的新分頁顯示圖片
*/
function triggerDownload(canvas, cardNo, statsWindow) {
    var dataURL = canvas.toDataURL('image/jpeg', 0.94);
    var fileName = 'stats';
    if (cardNo) {
        fileName = cardNo.replace(/\//g, '_').replace(/\s/g, '') + '_stats';
    }
    if (!statsWindow || statsWindow.closed) {
        throw new Error('統計圖片新分頁已關閉');
    }
    var base64Data = dataURL.split(',')[1];
    var byteCharacters = atob(base64Data);
    var byteArray = new Uint8Array(byteCharacters.length);
    for (var i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
    }
    var imageBlob = new Blob([byteArray], { type: 'image/jpeg' });
    var imageUrl = URL.createObjectURL(imageBlob);
    statsWindow.location.href = imageUrl;
    setTimeout(function() {
        URL.revokeObjectURL(imageUrl);
    }, 60000);

    showWsAlert({
        icon: 'success',
        title: '圖片已在新分頁開啟',
        text: fileName + '.jpg',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
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
        var isCurrent = btn.getAttribute('data-company') === company;
        btn.classList.toggle('active', isCurrent);
        // 目前選了哪一家不能只靠顏色表示
        btn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
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
        // 「暫無」會讓人以為之後就會有 —— 這是系統無法保證的承諾
        container.innerHTML =
            '<div class="grading-placeholder">' +
            '<p>此卡號沒有 ' + currentCompany + ' 的鑑定紀錄</p>' +
            '<p class="text-muted" style="font-size:0.8rem;">可切換上方其他鑑定公司查看</p>' +
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
                '<i class="fas fa-clock mr-1" aria-hidden="true"></i>鑑定資料更新：' + companyData._updateDate + '</div>';
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
    html += '<thead><tr><th>Grade</th><th>Quantity</th></tr></thead>';
    html += '<tbody>';
    visibleGrades.forEach(function(g) {
        html += '<tr><td><strong>' + g.grade + '</strong></td><td>' + g.count.toLocaleString() + '</td></tr>';
    });
    html += '<tr class="grading-detail-total-row"><td><strong>Total</strong></td><td><strong>' + totalCount.toLocaleString() + '</strong></td></tr>';
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
            '<p>選擇卡號後顯示鑑定數量</p>' +
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
            btn.setAttribute('aria-pressed', company === 'PSA' ? 'true' : 'false');
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

// ============================================================================
// 答案抵達 — 這一頁唯一一個被授權的動畫時刻
// ----------------------------------------------------------------------------
// 查詢完成時，讀者要的答案由三件事組成，而且有先後：
//   今天多少 → 落在近 30 日的什麼位置 → 一路是怎麼走過來的
// 抵達動作就照這個順序交出來，總長約 700ms：
//
//   t+0    格線與兩軸「已經」畫好（Chart.js 自己的 tween 關掉）
//   t+0    價格線由左至右 wipe 進來，560ms
//          —— clip 只套在資料集上，所以線是被畫在已經打好格的紙上。
//             由左至右就是 x 軸的方向，這個方向本身帶著「時間經過」的意思。
//   t+120  最新售價從「7 日前的基準價」滾到今天，520ms
//          —— 基準價由旁邊那個 % 反推（current / (1 + change/100)），
//             所以滾動的起點永遠跟旁邊顯示的漲跌幅一致，不會各說各話。
//             從 0 滾上來是廣告手法，什麼都沒說；從上週的價格滾過來，
//             滾的那一段距離本身就是漲跌。
//   t+520  近 30 日最高從「今天的價格」往上滾，380ms
//   t+560  近 30 日最低從「今天的價格」往下滾，380ms
//          —— 兩個數字往外滾，等於當場把今天的價格所在的區間畫出來
//   t+120  近 7 日漲跌的箭頭轉到位（不滾數字：這一格的資訊是方向，不是量）
//
// 這整段是包在既有函式外面的 wrapper：把這個 IIFE 刪掉，頁面就完全回到
// 原本的行為，沒有任何呼叫端需要改。
//
// prefers-reduced-motion：wipe 直接給滿、數字直接寫最終值、箭頭不轉。
// 值還是會變、圖還是會重畫，所以「查詢完成了」這個回饋不會消失，
// 消失的只有位移本身。
// ============================================================================

(function () {
    'use strict';

    if (typeof Chart === 'undefined') return;

    function prefersReducedMotion() {
        return typeof window.matchMedia === 'function' &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // 指數式減速：自信抵達的曲線，不用彈跳
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // ------------------------------------------------------------------
    // 1. wsWipe — Chart.js 2.8 外掛
    //
    //    beforeDatasetsDraw 把 ctx 裁切到 chartArea 的左側 p 比例，
    //    afterDatasetsDraw 還原。關鍵在於它只裁「資料集」：格線、兩軸、
    //    刻度文字從第一格就是完整的，所以看起來是「線被畫上去」，
    //    而不是「整張圖淡入」。
    //
    //    beforeUpdate 順手把格線與刻度改成隨主題走。原本兩張圖的格線都寫死
    //    rgba(0,0,0,0.05)，在 #141414 的深色底上等於不存在——而「紙已經打好格」
    //    正是這個 wipe 唯一的立足點，格線看不見的話它就只是一個隨便的揭露。
    // ------------------------------------------------------------------
    var CHART_IDS = { myChart: 1, myStockChart: 1 };

    function isPageChart(chart) {
        return !!(chart && chart.canvas && CHART_IDS[chart.canvas.id]);
    }

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    Chart.plugins.register({
        id: 'wsWipe',

        beforeUpdate: function (chart) {
            if (!isPageChart(chart)) return;
            var scales = chart.options && chart.options.scales;
            if (!scales) return;

            var dark = isDark();
            var grid = dark ? 'rgba(233, 231, 225, 0.12)' : 'rgba(26, 32, 44, 0.10)';
            var tick = dark ? '#9a958b' : '#5a6472';

            ['xAxes', 'yAxes'].forEach(function (key) {
                (scales[key] || []).forEach(function (axis) {
                    if (axis.gridLines && axis.gridLines.display !== false) {
                        axis.gridLines.color = grid;
                        axis.gridLines.zeroLineColor = grid;
                    }
                    if (axis.ticks) axis.ticks.fontColor = tick;
                });
            });
        },

        beforeDatasetsDraw: function (chart) {
            var p = chart.$wsWipe;
            if (typeof p !== 'number' || p >= 1) return;
            var area = chart.chartArea;
            if (!area) return;
            var ctx = chart.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.rect(
                area.left,
                area.top,
                Math.max(0, (area.right - area.left) * Math.max(0, p)),
                area.bottom - area.top
            );
            ctx.clip();
            chart.$wsWipeClipped = true;
        },

        afterDatasetsDraw: function (chart) {
            if (!chart.$wsWipeClipped) return;
            chart.$wsWipeClipped = false;
            chart.ctx.restore();
        }
    });

    // Chart.js 2.8 預設會把整張圖（含格線）從 0 撐開 1000ms。
    // 那個 tween 也是「切換時間範圍時點會亂飛到新位置」的原因：
    // 它把第 N 個點的舊值補間到第 N 個點的新值，而換了區間之後
    // 第 N 個點根本是不同的日期。關掉它，改用重新繪製。
    Chart.defaults.global.animation.duration = 0;

    // 依 canvas id 取圖表實例。不讀 window.myChart：頁面自己的非同步流程
    // 會重新指派那個全域變數，探測到的可能不是正在畫的那一個。
    function chartById(id) {
        var instances = Chart.instances || {};
        for (var key in instances) {
            var c = instances[key];
            if (c && c.canvas && c.canvas.id === id) return c;
        }
        return null;
    }

    var _wipeTokens = {};

    function playWipe(chartId, duration) {
        var chart = chartById(chartId);
        if (!chart) return;

        var token = (_wipeTokens[chartId] = (_wipeTokens[chartId] || 0) + 1);

        if (prefersReducedMotion() || !window.requestAnimationFrame) {
            chart.$wsWipe = 1;
            try { chart.draw(); } catch (e) {}
            return;
        }

        chart.$wsWipe = 0;
        var start = null;

        function frame(now) {
            // 讀者在動畫途中換了卡號或換了區間：舊的 wipe 必須讓位，
            // 否則它會把新的線又蓋回去裁掉一半。
            if (_wipeTokens[chartId] !== token) return;
            if (start === null) start = now;
            var t = Math.min(1, (now - start) / duration);
            chart.$wsWipe = easeOutCubic(t);
            try { chart.draw(); } catch (e) { return; }
            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                chart.$wsWipe = 1;
            }
        }

        try { chart.draw(); } catch (e) {}
        requestAnimationFrame(frame);

        // 同樣的保底。rAF 停在半路的話，clip 就永遠留在那裡——
        // 也就是有一段價格線永遠看不到。缺資料比沒有動畫嚴重得多。
        setTimeout(function () {
            if (_wipeTokens[chartId] !== token) return;
            if (chart.$wsWipe === 1) return;
            chart.$wsWipe = 1;
            try { chart.draw(); } catch (e) {}
        }, duration + 80);
    }

    // ------------------------------------------------------------------
    // 2. wsRoll — 數字滾動
    //
    //    每個元素帶自己的 token。查詢流程可能重入（讀者連續換卡號），
    //    沒有 token 的話舊的 rAF 會在新值寫進去之後又蓋回舊值，
    //    最後停在一個從來不存在的價格上。
    // ------------------------------------------------------------------
    function wsRoll(el, from, to, duration, delay, format) {
        if (!el) return;

        var token = (el.__wsRollToken = (el.__wsRollToken || 0) + 1);

        function finish() {
            if (el.__wsRollToken !== token) return;
            el.textContent = format(to);
        }

        if (prefersReducedMotion() || !window.requestAnimationFrame || from === to) {
            finish();
            return;
        }

        el.textContent = format(from);

        var start = null;
        function frame(now) {
            if (el.__wsRollToken !== token) return;
            if (start === null) start = now;
            var elapsed = now - start;
            if (elapsed < delay) { requestAnimationFrame(frame); return; }
            var t = Math.min(1, (elapsed - delay) / duration);
            el.textContent = format(from + (to - from) * easeOutCubic(t));
            if (t < 1) requestAnimationFrame(frame); else finish();
        }
        requestAnimationFrame(frame);

        // 保底：時間到就把最終值寫上，不管 rAF 有沒有把最後一格送來。
        //
        // rAF 不保證會被呼叫到底——分頁切到背景、被節流、或渲染器認為自己
        // 閒置了，迴圈就停在半路。停在半路的價格是「一個從來不存在的數字」，
        // 而這一頁存在的理由就是那個數字要能拿去做決定。動畫可以被犧牲，
        // 答案不行。token 檢查讓這裡是幂等的：如果 rAF 自己跑完了，
        // 這一次只是把同樣的字再寫一遍；如果期間又查了新的卡號，
        // token 已經換了，這一次什麼都不做。
        setTimeout(finish, delay + duration + 80);
    }

    function yen(v) {
        return '¥' + Math.round(v).toLocaleString('en-US');
    }

    // 讀回畫面上已經寫好的字，而不是重算一次。
    // 這樣滾動的終點必然等於最終顯示值——不可能出現「動畫停在 ¥1,531，
    // 但答案其實是 ¥1,630」這種對不起來的情況。
    function numFrom(el) {
        if (!el) return null;
        var raw = String(el.textContent || '').replace(/[^0-9.+-]/g, '');
        if (!raw || raw === '-' || raw === '+') return null;
        var n = parseFloat(raw);
        return isNaN(n) ? null : n;
    }

    // ------------------------------------------------------------------
    // 3. 抵達的編排
    // ------------------------------------------------------------------
    function playArrival() {
        var card = document.getElementById('priceSummaryCard');
        if (!card) return;

        var elCurrent = document.getElementById('summaryCurrentPrice');
        var elHigh = document.getElementById('summaryHighPrice');
        var elLow = document.getElementById('summaryLowPrice');
        var elChange = document.getElementById('summaryChangePercent');

        var current = numFrom(elCurrent);
        var high = numFrom(elHigh);
        var low = numFrom(elLow);
        var change = numFrom(elChange);

        // 走勢線：不管有沒有摘要數字都要 wipe，它是這個時刻的主體
        playWipe('myChart', 560);

        if (current === null) return;   // 沒有價格可言，就沒有答案可以抵達

        // 售價：從 7 日前的基準價滾到今天。
        // 基準價由旁邊的 % 反推，所以兩個格子永遠說同一件事。
        // 沒有漲跌幅可算時（區間內不足兩筆）就沒有起點，直接顯示今天的價格。
        if (change !== null && change !== 0) {
            var basis = current / (1 + change / 100);
            if (isFinite(basis) && basis > 0) {
                wsRoll(elCurrent, basis, current, 520, 120, yen);
            }
        }

        // 最高／最低：從今天的價格往外滾，兩個數字一起把區間畫出來
        if (high !== null && high !== current) wsRoll(elHigh, current, high, 380, 520, yen);
        if (low !== null && low !== current) wsRoll(elLow, current, low, 380, 560, yen);

        // 漲跌：只轉箭頭。方向是資訊，數字大小不是。
        var changeItem = card.querySelector('.price-summary-item.change');
        if (changeItem && change !== null && change !== 0 && !prefersReducedMotion()) {
            changeItem.classList.remove('is-arriving');
            void changeItem.offsetWidth;                // 讓動畫可以重播
            changeItem.classList.add('is-arriving');

            // 用 timer 收尾，不用 animationend。
            //
            // 這個箭頭的「方向」就是這一格的資訊，而動畫的起始格是 rotate(±90deg)
            // ——也就是箭頭指向側邊、看不出漲跌。動畫時間軸並不保證會前進
            // （背景分頁、節流、被停用的合成動畫都會讓它停在起始格），
            // 那時 animationend 永遠不會來，箭頭就永遠橫著。
            // timer 是另一條時鐘，它一定會到；class 一移除，圖示就回到
            // 靜止角度，也就是正確的方向。這也是為什麼這裡刻意不用
            // animation-fill-mode: forwards——沒有 fill-mode 的動畫沒跑完
            // 就會回到靜止狀態，正好是我們要的失敗方式。
            setTimeout(function () {
                changeItem.classList.remove('is-arriving');
            }, 480);
        }
    }

    // ------------------------------------------------------------------
    // 4. 接到既有流程上（全部用 wrapper，不動原本的函式內容）
    // ------------------------------------------------------------------

    // updatePriceSummary 負責把最終值寫進 DOM；抵達動作接在它之後，
    // 讀回它寫好的字當終點。
    if (typeof window.updatePriceSummary === 'function') {
        var _updatePriceSummary = window.updatePriceSummary;
        window.updatePriceSummary = function (priceData) {
            var r = _updatePriceSummary.apply(this, arguments);
            try { playArrival(); } catch (e) { console.error('答案抵達動作失敗（不影響資料）:', e); }
            return r;
        };
    }

    // 庫存圖用同一種語言，但短一些、也不帶數字滾動：
    // 它是補充資訊，不是答案本身。它的資料來自另一個 XHR，
    // 所以在它自己抵達的時候 wipe。
    if (typeof window.getCardStockData === 'function') {
        var _getCardStockData = window.getCardStockData;
        window.getCardStockData = function () {
            var r = _getCardStockData.apply(this, arguments);
            try { playWipe('myStockChart', 380); } catch (e) {}
            return r;
        };
    }

    // 換時間範圍是「重剪」，不是「抵達」：讀者已經知道這條線的樣子了，
    // 所以走同一個 wipe 但更短，而且不重滾數字（摘要講的是近 30／7 日，
    // 跟圖表選的區間無關，滾一次會讓人以為那些數字也跟著變了）。
    ['applyPriceTimeFilter', 'applyStockTimeFilter'].forEach(function (name) {
        if (typeof window[name] !== 'function') return;
        var orig = window[name];
        var chartId = name === 'applyPriceTimeFilter' ? 'myChart' : 'myStockChart';
        window[name] = function () {
            var r = orig.apply(this, arguments);
            try { playWipe(chartId, 320); } catch (e) {}
            return r;
        };
    });

    // 主題切換時 refreshChartThemeColors 會 chart.update()，
    // 那會經過 beforeUpdate 把格線重新上色。但 update() 也會重畫資料集，
    // 而此時 $wsWipe 可能還停在 1 以外的值（極少數：切主題時剛好在抵達中）。
    // 保險起見把它歸零成「不裁切」。
    if (typeof window.refreshChartThemeColors === 'function') {
        var _refreshChartThemeColors = window.refreshChartThemeColors;
        window.refreshChartThemeColors = function () {
            ['myChart', 'myStockChart'].forEach(function (id) {
                _wipeTokens[id] = (_wipeTokens[id] || 0) + 1;   // 取消進行中的 wipe
                var c = chartById(id);
                if (c) c.$wsWipe = 1;
            });
            return _refreshChartThemeColors.apply(this, arguments);
        };
    }
})();