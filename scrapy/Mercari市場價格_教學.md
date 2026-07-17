# 🃏 Mercari 市場價格趨勢：超白話教學

> 這份教學會教你：怎麼把 Mercari（日本二手網站）上「卡片賣了多少錢」
> 抓下來，畫成一條會漲會跌的線，放到網站上。
>
> **完全不懂程式也沒關係**，照著一步一步做就好。

---

## 🎯 這個東西在做什麼？（用講故事的方式）

想像你在觀察「某張卡最近賣多少錢」：

1. 每天有人在 Mercari 上把卡賣掉 💴
2. 我們寫的小機器人 🤖 每天去看一次「今天這張卡賣了幾筆、各賣多少」
3. 它算出「今天大概賣 ○○ 円」，記在一本小本子上 📒
4. 一天記一個點，久了就連成一條線 📈
5. 這條線放到你的網站上，大家就看得到「這張卡的行情走勢」

就這樣。**你要做的，只是每天讓那隻小機器人出門一次。**

---

## 🧰 開工前要準備的 3 樣東西

| 要準備 | 怎麼確認有沒有 | 沒有的話 |
|--------|----------------|----------|
| ① Python | 打開 PowerShell，輸入 `python --version`，有跳版本號就 OK | 去 python.org 下載安裝 |
| ② 兩個小工具 | 輸入下面那行指令 | 見下方 |
| ③ Google Cloud SDK | 輸入 `gsutil version`，有跳字就 OK | 上傳那步才需要，可先跳過 |

**安裝兩個小工具**（一次就好，複製貼上按 Enter）：

```powershell
pip install requests cryptography
```

> 💡 PowerShell 是 Windows 內建的黑色小視窗。按開始鍵，打 `powershell`，就找得到。

---

## 🚶 三個步驟（先看懂流程，再動手）

```
第①步  挑要追哪些卡   ──►  產生一張清單 cards.json
                                │
第②步  小機器人出門    ──►  把每張卡的成交價記下來
                                │
第③步  搬到網站上      ──►  網頁就能畫出趨勢線 📈
```

**好消息：這三步我已經幫你包成「一顆按鈕」了**（就是 `run_mercari.bat`）。
下面先教你按那顆按鈕，最後才教每一步各自是什麼。

---

## ✅ 最簡單的用法：按一下就好

### 步驟 A：先設定「要追哪些卡」

用記事本打開 **`run_mercari.bat`**，只看最上面「Config」那一區，
你會看到這幾行（其他都不用動）：

```bat
set "PRODUCTS=--product BD/W54 --product BD/W73"     ← 要追的作品
set "SUFFIXES=--include-suffix SSP --include-suffix SP --include-suffix SEC"  ← 要追的稀有度
set "SKIP_UPLOAD=0"                                   ← 先改成 1（先不上傳，只測試）
```

- **想追別的作品**：把 `BD/W54` 換成你要的作品代碼（例如 `--product KOn/W24`）。
- **第一次測試**：把 `SKIP_UPLOAD=0` 改成 `SKIP_UPLOAD=1`，這樣只會抓資料、先不上傳。

改完存檔。

### 步驟 B：按下去

在 PowerShell 裡，先切到專案資料夾，再執行那顆按鈕：

```powershell
cd c:\Users\perrychiou\Desktop\ws\ws-cards.github.io
.\run_mercari.bat
```

跑完你會在畫面看到 `RUN OK` ✅。這樣就成功了！

### 步驟 C：東西跑去哪了？

- 抓到的價格 → 存在 `mercariData\` 資料夾裡（每個作品一個 `.json` 檔）
- 過程紀錄 → 存在 `logs\` 資料夾裡（出問題時看這個）

確認 `mercariData\` 裡有檔案、`logs` 裡寫著 `RUN OK`，就代表機器人乖乖工作了。

---

## 📤 要讓網站看得到（上傳那一步）

網站看的資料是放在 Google 的雲端空間（bucket）。所以要把 `mercariData\`
搬上去。**確認你已經裝好 Google Cloud SDK 並登入過**，然後：

1. 把 `run_mercari.bat` 裡的 `SKIP_UPLOAD=1` 改回 `SKIP_UPLOAD=0`
2. 再按一次 `.\run_mercari.bat`

它就會自動幫你搬上去。搬完，打開網頁選到那張卡，
往下滑就會看到 **「市場價格趨勢」** 那張綠色的圖 📈。

> 🔐 第一次用雲端要先登入一次：在 PowerShell 打 `gcloud auth login`，
> 會跳出瀏覽器讓你用 Google 帳號登入。登入過一次，以後就不用再登。

---

## ⏰ 讓它每天自己跑（不用每天手動按）

跑一次確認沒問題後，貼這行到 PowerShell（只要做一次）：

```powershell
schtasks /create /tn "MercariTrend" /sc daily /st 04:30 /tr "c:\Users\perrychiou\Desktop\ws\ws-cards.github.io\run_mercari.bat"
```

意思是：**每天早上 4:30，自動幫你按一次那顆按鈕**。
（想換時間就把 `04:30` 改掉。）

不想要了就打這行取消：

```powershell
schtasks /delete /tn "MercariTrend" /f
```

---

## 🔍 進階：那三步各自是什麼？（想懂再看）

### 第①步：挑卡 → `make_cards_list.py`

卡典裡有 6 萬多張卡，**不可能每張都追**（會被 Mercari 擋）。
所以這支工具幫你「只挑要追的」。例如只追 BD/W54 的 SSP 卡：

```powershell
python make_cards_list.py --product BD/W54 --include-suffix SSP --with-name --out cards.json
```

- `--product`：要哪個作品
- `--include-suffix`：要哪種稀有度（SSP、SP、SEC 這種值錢的）
- `--with-name`：清單裡連「卡名」一起放（第②步搜尋要用）

跑完會產生一張 `cards.json`，就是「今天要追的名單」。

### 第②步：抓價格 → `mercari_scraper.py`

拿著名單去 Mercari 抓每張卡的成交價：

```powershell
python mercari_scraper.py --market --cards-file cards.json --search-by name --match rarity --delay 2
```

- `--search-by name`：**用卡名去搜**（賣家多半寫卡名，用卡號搜幾乎搜不到）
- `--match rarity`：只留「標題有寫稀有度」的商品，避免把普卡跟 SSP 的價格混在一起
- `--delay 2`：每張卡之間停 2 秒，**對網站客氣一點，才不會被封**

### 第③步：上傳 → `gsutil`

把成果搬到雲端：

```powershell
gsutil -m rsync -r mercariData gs://divine-vehicle-292507.appspot.com/json/mercariData
```

---

## 🆘 出問題怎麼辦？（常見狀況）

| 你看到 | 可能原因 | 怎麼辦 |
|--------|----------|--------|
| `python 不是內部或外部命令` | 沒裝 Python | 去 python.org 裝，安裝時勾「Add to PATH」 |
| `No module named requests` | 沒裝小工具 | 執行 `pip install requests cryptography` |
| 畫面出現 `RUN ABORTED` | 某一步失敗了 | 打開 `logs\` 最新的檔案看紅字訊息 |
| `gsutil 不是命令` | 沒裝 Google Cloud SDK | 先把 `SKIP_UPLOAD=1`，之後再裝 |
| 網頁圖是空的 | 還沒上傳，或這張卡最近沒人賣 | 確認第③步有跑；換張熱門卡試試 |
| 抓到的價格怪怪的 | 同名卡混價 | 把 `--match` 從 `rarity` 保持著就好；別用 `loose` |

---

## 📌 三個要記住的重點

1. **一切從小開始**：先追一兩個作品的高稀有度卡，順了再慢慢加。
2. **對網站客氣**：`--delay` 不要調太小，卡不要一次追太多，才不會被封。
3. **趨勢是「往前長」的**：機器人今天才開始記，所以線是從今天開始慢慢變長，
   **沒辦法把過去的行情補回來**。耐心等它累積。

---

有看不懂的地方，直接問就好 🙂
