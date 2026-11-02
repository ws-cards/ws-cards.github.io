# 整桌卡疊偵測：YOLO 預訓練微調教學

用**預訓練 YOLO 微調**做「整桌找疊」的實作教學。  
模型只負責框出每一疊／單卡；**認卡仍用現有 face-index 指紋**，不必重做全系列索引。

---

## 0. 目標先定清楚

| 項目 | 內容 |
|---|---|
| 輸入 | 一整桌攤牌照片 |
| 輸出 | 多個框（每一疊／單卡一個） |
| 類別 | 先只做 1 類：`card_stack` |
| 不做 | 標卡號、認卡（交給 face-index） |

現有頁面（`deckPhotoAnalysisMulti.html`）管線概念：

```text
整桌照片
  → ① 專用模型推斷 → boxes[]
  → ② 每個 box 裁上卡
  → ③ 現有 rgb-grid / face-index 認卡
  → ④ 張數可編輯（v1 先不要叫模型估 qty）
```

也就是：**只替換第①步找疊**，第②步指紋邏輯不動。

---

## 1. 環境

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install ultralytics opencv-python
```

建議有 GPU；沒有也能跑，只是較慢。

---

## 2. 蒐集照片（最重要）

起步建議 **80～150 張**（要穩再加到 200～300）：

- 真實使用情境：木桌／墊布、扇開 2～4 張、多疊
- 變化：不同系列、光線、手機、俯拍角度
- 難題也要收：反光、疊很近、單卡、歪斜
- 長邊約 1280～2048 即可

目錄可先這樣放：

```text
deck-detect/
  images/raw/          # 原始照片
  datasets/stacks/     # 整理後的訓練集（下一步）
```

---

## 3. 標註（bounding box）

每一疊一個框（含扇開露出的邊）；**單卡也標成同一類**。

工具任選：LabelImg、CVAT、Label Studio、Roboflow。

輸出用 **YOLO 格式**（每張圖一個同名 `.txt`）：

```text
# class  x_center  y_center  width  height   （皆 0~1 相對座標）
0 0.42 0.31 0.08 0.18
0 0.55 0.30 0.07 0.17
```

注意：

- 相鄰兩疊要**分開標**，不要框成一個大框
- 不必標卡號
- **不用**每張都標卡號；這一階段只標「這是一疊／一張卡的框」

建議類別先極簡：

- 只做 **1 類：`card_stack`**（單卡也算這一類）
- 之後若需要再拆 `single` / `stack`

---

## 4. 整理成 Ultralytics 資料集

```text
datasets/stacks/
  images/
    train/   xxx.jpg
    val/     yyy.jpg
  labels/
    train/   xxx.txt
    val/     yyy.txt
  data.yaml
```

`data.yaml`：

```yaml
path: datasets/stacks
train: images/train
val: images/val
names:
  0: card_stack
```

切分大約：

- train ~80%
- val ~15%
- 留幾張完全沒見過的當 test（含真實整桌照）

### （可選）張數標註

若還要模型直接估「這疊幾張」：

- 每個框加屬性 `qty = 1~4`，或另訓一個小分類器

**v1 可以不做 qty**，張數先維持 UI 可編輯／緣線估計。

---

## 5. 預訓練微調（核心）

不要從頭訓；直接載 COCO 預訓練權重：

```bash
yolo detect train \
  model=yolov8n.pt \
  data=datasets/stacks/data.yaml \
  epochs=100 \
  imgsz=1280 \
  batch=8 \
  project=runs/stacks \
  name=v1
```

說明：

| 參數 | 意義 |
|---|---|
| `yolov8n.pt` | 最小最快，瀏覽器友善；不夠準再換 `yolov8s.pt` |
| `imgsz=1280` | 整桌小卡較不容易漏 |
| OOM 時 | 把 `imgsz` 降到 960，或 `batch` 降到 4／2 |

訓練完權重通常在：

```text
runs/stacks/v1/weights/best.pt
```

快速看效果：

```bash
yolo detect predict \
  model=runs/stacks/v1/weights/best.pt \
  source=path/to/test_photo.jpg \
  imgsz=1280 \
  conf=0.25 \
  save=True
```

目測：疊數是否接近真實、有無黏框／漏框。

---

## 6. 匯出給網站用

瀏覽器常見兩條路：

### A. ONNX（再接 onnxruntime-web）

```bash
yolo export model=runs/stacks/v1/weights/best.pt format=onnx imgsz=1280 opset=12
```

### B. TF.js

```bash
yolo export model=runs/stacks/v1/weights/best.pt format=tfjs imgsz=1280
```

先選一條走通即可；靜態站（GitHub Pages）用 **ONNX + `onnxruntime-web`** 較常見。

---

## 7. 接到現有頁面（概念）

現在 multi 頁是 OpenCV／色塊找疊。換成專用模型後：

```text
整桌照片
  → 專用模型推斷 → boxes[]
  → 每個 box 裁上卡
  → 現有 rgb-grid / face-index 認卡
  → 張數可編輯
```

指紋模組可繼續只負責認卡，不必重訓。

---

## 8. 迭代（幾乎一定要做）

1. 把漏框／黏框的失敗照加進資料集
2. 補標 → 再 train（可從 `best.pt` 繼續）
3. 用固定 test 照比「偵測疊數 vs 真實疊數」

判斷夠用的粗標準：常見整桌照疊數誤差大約在 ±1～2，且很少大黏框。

---

## 常見問題

| 狀況 | 作法 |
|---|---|
| 小卡漏很多 | `imgsz` 加大；多標遠景小疊 |
| 兩疊黏成一框 | 標註時強制分開；推論 `conf`／NMS 再調 |
| 模型太大、手機慢 | 用 `yolov8n`；輸入先縮圖再把框座標乘回 |
| 想順便估張數 | v1 先別做；維持 UI 改張數較穩 |

---

## 為什麼沒有更大的捷徑？

要「專用、又準」的找疊模型，**沒有真捷徑**——還是得收整桌照、標每疊框，再微調。

能省的只有這些（替代不了標資料）：

- **從預訓練權重微調**（不用從頭訓）← 本教學這條
- **只標框、不標卡號**（認卡繼續用指紋）
- 產品上也可先走修框 UI／傳統視覺，比急著上模型划算

現成通用偵測（COCO-SSD 等）對扇開卡疊幾乎不好用。

---

## 最小可行時程（心智模型）

1. 標完約 **100 張**
2. `yolov8n` 微調一輪
3. 幾張未見照目測
4. export → 接上 multi 頁取代 OpenCV 找疊

---

## 相關檔案

- 找疊（現況）：`assets/js/ws-deck-stack-detect.js`
- 整桌頁：`deckPhotoAnalysisMulti.html`
- 指紋／索引：`assets/js/ws-deck-face.js`、`scripts/build_face_index.py`
