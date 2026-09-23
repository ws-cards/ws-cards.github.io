# Firebase（GitHub Pages）設定步驟

搭配 `countingDemoNew.html`：靜態站由 GitHub Pages 託管，登入與戰況同步使用 Firebase Auth + Firestore。

## 1. 建立 Firebase 專案

1. 開啟 [Firebase Console](https://console.firebase.google.com/)
2. 新增專案（或綁定既有 GCP 專案）
3. 新增 **Web** 應用程式，複製設定到 `assets/js/firebase-config.js`
4. **Authentication → Sign-in method** 啟用 **Google**
5. **Authentication → Settings → Authorized domains** 加入：
   - `ws-cards.cloud`
   - `ws-cards.github.io`
   - `localhost`
6. 建立 **Cloud Firestore**（正式環境即可）
7. 將 `firebase/firestore.rules` 內容貼到 Console → Firestore → Rules 並發布

## 2. 資料路徑

```
users/{uid}/countingSessions/default
  state: { version, updatedAt, zones: {...} }
  updatedAt: number
  syncedAt: serverTimestamp
```

登入後會依 `updatedAt` 合併本機與雲端；之後每次儲存會寫本機並 debounce 上傳雲端。

## 3. 未設定時的行為

`firebase-config.js` 仍為 `YOUR_*` 佔位時，頁面只使用 localStorage，「登入同步」會提示尚未設定。
