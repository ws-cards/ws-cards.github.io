# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

台灣 Weiss Schwarz（黑白雙翼）玩家是主要使用者。他們來站的第一件事是查單卡價格與漲跌走勢，以便買卡、捨卡或組牌。競技玩家會接著查優勝牌組、算牌組總額、看發售時間軸；店家或賣家會看庫存與價格走勢。這些都是同一產品的使用者，但「查價 + 走勢」是第一任務，其餘工具是加值。

## Product Purpose

卡片雲 / WS-Cards 把 WS 玩家常用的查價、漲幅、庫存、牌組總額、優勝牌組、發售時間軸與收藏收進同一個站，讓人不必在多個日文店家頁與試算表之間跳來跳去。成功意味著玩家能在一次造訪裡完成「這張卡現在值多少、走勢如何、這副牌大概多少錢、這套要不要收進清單」。

線上位置：`https://ws-cards.cloud`（GitHub Pages；預設網域 `ws-cards.github.io`）。

## Positioning

一站整合上述 WS 工作流，而不是只做單一店家搜尋頁的鏡像。使用者確認的差異是「查價、漲幅、庫存、牌組總額、優勝牌組、發售時間軸、收藏」同站完成。

## Operating Context

- 以瀏覽器使用，手機與桌面都要能查；現有頁面偏行動操作（固定版面、抽屜選單、PWA manifest）。
- 介面文案是繁體中文（台灣）；卡號、作品名與店家資料常夾日文原文。
- 查價與走勢目前接遊遊亭（yuyu-tei.jp）報價與庫存歷史，不是本站自營商店。
- 登入用 Google；收藏、戰況與個人資料經 Firebase Auth + Firestore 跨裝置同步。
- 部署是 GitHub Pages 靜態站，沒有自架應用後端。

## Capabilities and Constraints

Confirmed:

- 遊遊亭價格查詢：各卡號漲幅趨勢（WS / WSR）、牌組總額計算機。
- 優勝牌組查詢（標為 Beta）、商品發售時間軸、我的收藏、個人資料。
- Google 登入與 Firebase 雲端同步必須保留。
- 保持 GitHub Pages 靜態 HTML / CSS / JS，不要改成需要自架後端的架構。

Undecided:

- 品牌主名是「卡片雲」還是「WS-Cards」尚未擇一；兩者都在使用，見 Brand Commitments。
- 是否納入遊遊亭以外的店家報價，未確認。
- 產品是否仍應對外標成 β，未確認。

## Brand Commitments

- 中文名「卡片雲」與英文/產品 chrome「WS-Cards」都是正式在用的名稱；側欄、PWA 名稱多用 WS-Cards，行銷／OG 多用卡片雲。尚未指定單一主名，未來文案兩者都可出現，不要擅自廢除其中一個。
- 作者署名現況為 devilFox（見行銷頁 meta）。
- 現有抽屜頁腳標「WS-Cards β」；是否繼續以 β 自稱未鎖定。

## Evidence on Hand

- 產品本身與真實卡號／作品資料、遊遊亭價格與庫存歷史。
- 品牌資產：`dist/img/logo.png`、`favicon.ico`、`assets/og-cover.png`。
- 沒有經確認的外部推薦文、付費方案或第三方評測。未來工作不得編造顧客、成績或授權聲明。

## Product Principles

- 查價是主線：任何新畫面都不該讓「這張卡現在多少錢、怎麼走」變難找。
- 一站完成相關工作：能在本站做的查價、算牌、收藏，就不要把人趕去另一個工具。
- 靜態可部署：功能必須能活在 GitHub Pages + Firebase 這條現況上。
- 雙語名並存：卡片雲與 WS-Cards 都是真名，直到使用者指定主名為止。
- 資料來源要誠實：走勢與庫存是店家報價的呈現，不是本站報價；缺資料就說缺，不要補假數字。
