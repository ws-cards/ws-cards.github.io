# Firebase 逐步設定教學（countingDemoNew）

本站是 **GitHub Pages 靜態站**（`ws-cards.cloud`）。登入與雲端戰況同步走 **Firebase Auth + Firestore**，不需要自架後端。

完成後，在 `countingDemoNew.html` 點「登入同步」即可用 Google 帳號跨裝置保存戰況。

---

## 你會用到的檔案

| 檔案 | 用途 |
|------|------|
| `assets/js/firebase-config.js` | 貼上 Firebase Web 設定（你要改的檔） |
| `assets/js/ws-firebase.js` | Auth / Firestore 封裝（已寫好，通常不用改） |
| `firebase/firestore.rules` | 安全規則（要貼到 Console 並發布） |
| `countingDemoNew.html` | 已接好登入按鈕與同步邏輯 |
| `account.html` | Auth + Firestore 個人資料頁 |

---

## 資料模型（摘要）

```
users/{uid}                              ← 個人資料（account.html）
  displayName, email, photoURL
  nickname, bio
  createdAt, updatedAt

users/{uid}/countingSessions/default     ← 戰況（countingDemoNew）
  state, updatedAt, syncedAt
```

> 請將最新 `firebase/firestore.rules` 發布到 Console（需允許 `users/{uid}` 本體讀寫，不只子集合）。

---

## Step 1：建立 Firebase 專案

1. 開啟 [Firebase Console](https://console.firebase.google.com/)，用 Google 帳號登入。
2. 點 **新增專案（Create a project）**。
3. 輸入專案名稱（例如 `ws-cards`），繼續。
4. Google Analytics 可開可關（本功能不依賴它），完成建立。

> 若你已有 GCP 專案（例如曾用 `storage.googleapis.com/...appspot.com`），也可在建立時選擇「新增至現有 Google Cloud 專案」。

---

## Step 2：註冊 Web 應用程式

1. 進入剛建立的專案。
2. 專案總覽點 **</>**（Web）圖示新增應用程式。
3. App nickname 例如：`ws-cards-web`。
4. **不必**勾選 Firebase Hosting（你已用 GitHub Pages）。
5. 點註冊後，畫面會出現類似這樣的設定：

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "你的專案.firebaseapp.com",
  projectId: "你的專案",
  storageBucket: "你的專案.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. 打開 repo 裡的 `assets/js/firebase-config.js`，把上面六個值填進去，取代所有 `YOUR_*`：

```js
window.WS_FIREBASE_CONFIG = {
  apiKey: "AIza...",                    // 貼上你的
  authDomain: "你的專案.firebaseapp.com",
  projectId: "你的專案",
  storageBucket: "你的專案.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

7. 存檔、commit、push（合併 PR 後 GitHub Pages 才會更新線上設定）。

> `apiKey` 出現在前端是正常的，真正的防護靠 **Firestore Security Rules**（Step 5）。

---

## Step 3：啟用 Google 登入

1. 左側選單 → **Build** → **Authentication**。
2. 第一次會要求「開始使用（Get started）」。
3. 到 **Sign-in method** 分頁。
4. 點 **Google** → 啟用（Enable）→ 選支援電子郵件 → **儲存**。

（之後若要加 Email/密碼登入可再回來開，目前程式只接 Google popup。）

---

## Step 4：允許你的網域（很重要）

登入彈窗只允許白名單網域，漏加會出現 `auth/unauthorized-domain`。

1. 仍在 **Authentication** → **Settings**（或「設定」）。
2. 找到 **Authorized domains（授權網域）**。
3. 確認或新增：

| 網域 | 用途 |
|------|------|
| `localhost` | 本機測試（通常預設就有） |
| `ws-cards.cloud` | 正式自訂網域 |
| `ws-cards.github.io` | GitHub Pages 預設網域 |

4. 儲存。

---

## Step 5：建立 Firestore 資料庫

1. 左側選單 → **Build** → **Firestore Database**。
2. 點 **建立資料庫（Create database）**。
3. 位置選離使用者近的（例如 `asia-east1`）；建好後不能輕易改位置。
4. 一開始可選 **以測試模式啟動**，但 **務必立刻改成正式規則**（下一步），否則任何人都能寫你的資料。

---

## Step 6：發布安全規則

1. Firestore → **Rules** 分頁。
2. 整段換成 repo 裡 `firebase/firestore.rules` 的內容：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    match /public/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

3. 點 **Publish（發布）**。

規則意思：

- `users/{自己的 uid}/...`：只有登入且 uid 相符才能讀寫（戰況存在這裡）。
- `public/...`：之後若要放公開資料可唯讀；前端不能寫。

---

## Step 7：本機或線上驗證

### 7-1 確認設定已生效

- 線上：合併 PR 後打開  
  `https://ws-cards.cloud/countingDemoNew.html`
- 本機：在 repo 根目錄執行 `python3 -m http.server 8765`，打開  
  `http://localhost:8765/countingDemoNew.html`

### 7-2 測登入

1. 右上應看到「登入同步」。
2. 點擊 → Google 帳號彈窗 → 選帳號。
3. 成功後：
   - 顯示你的名稱／Email
   - 出現「登出」
   - 狀態列可能顯示「已上傳本機戰況到雲端」或「已載入雲端戰況」

### 7-3 在 Console 確認資料

1. Firestore → **Data**。
2. 應出現：

```
users
  └─ {你的 uid}
       └─ countingSessions
            └─ default
                 ├─ state      （整份戰況 JSON）
                 ├─ updatedAt
                 └─ syncedAt
```

### 7-4 測跨裝置／跨瀏覽器

1. 在 A 瀏覽器登入並操作幾步（抽牌等）。
2. 等狀態變成「已同步雲端」。
3. 在 B 瀏覽器（或無痕）開同一頁 → 登入同一帳號 → 應載入雲端戰況。

---

## 常見錯誤

| 現象 | 可能原因 | 處理 |
|------|----------|------|
| 點登入仍提示「請填入 Firebase 設定」 | `firebase-config.js` 還是 `YOUR_*`，或 Pages 尚未部署最新 commit | 確認檔案已填真實值並已 push／部署 |
| `auth/unauthorized-domain` | 網域未加入白名單 | Step 4 加入 `ws-cards.cloud` 等 |
| `auth/popup-blocked` | 瀏覽器擋彈窗 | 允許本站彈窗後再試 |
| `permission-denied` | Rules 未發布或太嚴／測試模式過期 | 重新發布 Step 6 規則 |
| 登入成功但不寫入 | 網路錯誤或 Rules 不符路徑 | Console → Firestore → 看是否有 `users/{uid}/countingSessions/default`；瀏覽器 F12 → Console 看錯誤 |

---

## 資料怎麼合併（程式已內建）

1. 未登入：只寫 `localStorage`（key：`ws-battle-counter-v1`）。
2. 登入當下：比較本機與雲端的 `updatedAt`，取較新的；雲端沒資料則上傳本機。
3. 之後每次操作：先存本機，約 0.8 秒後 debounce 上傳 Firestore。

---

## 檢查清單（做完請打勾）

- [ ] Firebase 專案已建立
- [ ] Web App 已註冊，`firebase-config.js` 已填真實值並部署
- [ ] Authentication → Google 已啟用
- [ ] Authorized domains 含 `ws-cards.cloud`、`ws-cards.github.io`、`localhost`
- [ ] Firestore 資料庫已建立
- [ ] Security Rules 已依 `firestore.rules` 發布
- [ ] `countingDemoNew.html` 可 Google 登入並在 Console 看到 `users/.../countingSessions/default`
