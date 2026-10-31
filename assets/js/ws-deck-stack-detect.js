/*!
 * Card-stack detection for whole-deck photos (wood table + fanned WS cards).
 * Prefers OpenCV.js when available; falls back to canvas ImageData heuristics.
 */
(function (global) {
  'use strict';

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function iou(a, b) {
    var x1 = Math.max(a.x, b.x);
    var y1 = Math.max(a.y, b.y);
    var x2 = Math.min(a.x + a.w, b.x + b.w);
    var y2 = Math.min(a.y + a.h, b.y + b.h);
    var iw = Math.max(0, x2 - x1);
    var ih = Math.max(0, y2 - y1);
    var inter = iw * ih;
    var union = a.w * a.h + b.w * b.h - inter;
    return union ? inter / union : 0;
  }

  function nms(boxes, thr) {
    var sorted = boxes.slice().sort(function (a, b) { return b.area - a.area; });
    var kept = [];
    for (var i = 0; i < sorted.length; i++) {
      var b = sorted[i];
      var hit = false;
      for (var j = 0; j < kept.length; j++) {
        if (iou(b, kept[j]) > thr) { hit = true; break; }
      }
      if (!hit) kept.push(b);
    }
    return kept;
  }

  function estimateQty(box, imgW, imgH) {
    // Prefer geometric estimate from card aspect (~63:88 => 0.716)
    var cardH = box.w / 0.72;
    var cardW = box.h * 0.72;
    var byH = box.h / Math.max(cardH, 1);
    var byW = box.w / Math.max(cardW, 1);
    var q = Math.max(Math.round(byH), Math.round(byW), 1);
    // fan stacks are often only modestly larger than one card; bump when clearly elongated
    var ar = box.w / Math.max(box.h, 1);
    if (byH >= 1.25 && byH < 1.6) q = Math.max(q, 2);
    if (byH >= 1.6 && byH < 2.2) q = Math.max(q, 3);
    if (byH >= 2.2) q = Math.max(q, 4);
    if (byW >= 1.25 && byW < 1.6) q = Math.max(q, 2);
    if (byW >= 1.6 && byW < 2.2) q = Math.max(q, 3);
    if (byW >= 2.2) q = Math.max(q, 4);
    // single-ish boxes
    if (ar > 0.58 && ar < 0.9 && byH < 1.2 && byW < 1.2) q = 1;
    return clamp(q, 1, 4);
  }

  function splitLargeBox(box, mask, width, strideY) {
    // If box is much larger than one stack, split on low-mask projection valleys.
    var ar = box.w / Math.max(box.h, 1);
    var tooWide = box.w > box.h * 1.55 || box.w > width * 0.28;
    var tooTall = box.h > box.w * 1.7;
    if (!tooWide && !tooTall) return [box];

    var out = [];
    if (tooWide) {
      var cols = new Float32Array(box.w);
      for (var x = 0; x < box.w; x++) {
        var s = 0;
        for (var y = 0; y < box.h; y++) {
          if (mask[(box.y + y) * width + (box.x + x)]) s++;
        }
        cols[x] = s;
      }
      // smooth
      for (var i = 1; i < cols.length - 1; i++) {
        cols[i] = (cols[i - 1] + cols[i] + cols[i + 1]) / 3;
      }
      var max = 0;
      for (var j = 0; j < cols.length; j++) if (cols[j] > max) max = cols[j];
      var thr = max * 0.16;
      var splits = [0];
      var minGap = Math.floor(box.w * 0.18);
      for (var k = Math.floor(box.w * 0.12); k < Math.floor(box.w * 0.88); k++) {
        if (cols[k] < thr && cols[k] <= cols[k - 1] && cols[k] <= cols[k + 1]) {
          if (k - splits[splits.length - 1] >= minGap) splits.push(k);
        }
      }
      splits.push(box.w);
      if (splits.length <= 2) return [box];
      for (var s = 0; s < splits.length - 1; s++) {
        var x0 = splits[s];
        var x1 = splits[s + 1];
        if (x1 - x0 < minGap * 0.8) continue;
        var area = 0;
        for (var yy = 0; yy < box.h; yy++) {
          for (var xx = x0; xx < x1; xx++) {
            if (mask[(box.y + yy) * width + (box.x + xx)]) area++;
          }
        }
        if (area < box.area * 0.08) continue;
        out.push({
          x: box.x + x0,
          y: box.y,
          w: x1 - x0,
          h: box.h,
          area: area
        });
      }
      return out.length ? out : [box];
    }

    // tooTall: horizontal valleys
    var rows = new Float32Array(box.h);
    for (var ry = 0; ry < box.h; ry++) {
      var rs = 0;
      for (var rx = 0; rx < box.w; rx++) {
        if (mask[(box.y + ry) * width + (box.x + rx)]) rs++;
      }
      rows[ry] = rs;
    }
    for (var ri = 1; ri < rows.length - 1; ri++) {
      rows[ri] = (rows[ri - 1] + rows[ri] + rows[ri + 1]) / 3;
    }
    var rmax = 0;
    for (var rj = 0; rj < rows.length; rj++) if (rows[rj] > rmax) rmax = rows[rj];
    var rthr = rmax * 0.16;
    var rsplits = [0];
    var rgap = Math.floor(box.h * 0.18);
    for (var rk = Math.floor(box.h * 0.12); rk < Math.floor(box.h * 0.88); rk++) {
      if (rows[rk] < rthr && rows[rk] <= rows[rk - 1] && rows[rk] <= rows[rk + 1]) {
        if (rk - rsplits[rsplits.length - 1] >= rgap) rsplits.push(rk);
      }
    }
    rsplits.push(box.h);
    if (rsplits.length <= 2) return [box];
    for (var t = 0; t < rsplits.length - 1; t++) {
      var y0 = rsplits[t];
      var y1 = rsplits[t + 1];
      if (y1 - y0 < rgap * 0.8) continue;
      out.push({
        x: box.x,
        y: box.y + y0,
        w: box.w,
        h: y1 - y0,
        area: box.w * (y1 - y0)
      });
    }
    return out.length ? out : [box];
  }

  function detectWithOpenCv(sourceCanvas, opts) {
    var cv = global.cv;
    if (!cv || !cv.Mat) throw new Error('OpenCV not ready');
    opts = opts || {};
    var maxSide = opts.maxSide || 1280;
    var src = cv.imread(sourceCanvas);
    var scale = Math.min(1, maxSide / Math.max(src.cols, src.rows));
    var sized = new cv.Mat();
    cv.resize(src, sized, new cv.Size(Math.round(src.cols * scale), Math.round(src.rows * scale)), 0, 0, cv.INTER_AREA);

    var hsv = new cv.Mat();
    cv.cvtColor(sized, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
    var channels = new cv.MatVector();
    cv.split(hsv, channels);
    var h = channels.get(0);
    var s = channels.get(1);
    var v = channels.get(2);

    // wood-ish mask (HSV): keep non-wood as cards
    var wood = new cv.Mat();
    var low = new cv.Mat(sized.rows, sized.cols, cv.CV_8UC1);
    var high = new cv.Mat(sized.rows, sized.cols, cv.CV_8UC1);
    // approximate: 8<=H<=35, 25<S<160, 70<V<230 using inRange on merged? do stepwise
    var mask = new cv.Mat(sized.rows, sized.cols, cv.CV_8UC1);
    mask.setTo(new cv.Scalar(255));
    // Build wood mask with JS loop on uchar data for clarity/control
    var hData = h.data;
    var sData = s.data;
    var vData = v.data;
    var mData = mask.data;
    var n = sized.rows * sized.cols;
    for (var i = 0; i < n; i++) {
      var hh = hData[i];
      var ss = sData[i];
      var vv = vData[i];
      var isWood = hh >= 8 && hh <= 35 && ss > 25 && ss < 160 && vv > 70 && vv < 230;
      mData[i] = isWood ? 0 : 255;
    }

    var openK = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
    var closeK = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(11, 11));
    var closeV = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 15));
    var closeH = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 5));
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, openK);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, closeK);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, closeV);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, closeH);

    var contours = new cv.MatVector();
    var hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    var minArea = sized.cols * sized.rows * 0.0035;
    var boxes = [];
    for (var c = 0; c < contours.size(); c++) {
      var cnt = contours.get(c);
      var a = cv.contourArea(cnt);
      if (a < minArea) continue;
      var rect = cv.boundingRect(cnt);
      var ar = rect.width / Math.max(rect.height, 1);
      var fill = a / Math.max(rect.width * rect.height, 1);
      if (ar < 0.3 || ar > 1.85) continue;
      if (rect.width < sized.cols * 0.045 || rect.height < sized.rows * 0.055) continue;
      if (fill < 0.28) continue;
      boxes.push({
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
        area: a
      });
    }

    // binary mask for splitting
    var bin = new Uint8Array(sized.rows * sized.cols);
    for (var p = 0; p < bin.length; p++) bin[p] = mData[p] > 0 ? 1 : 0;

    boxes = nms(boxes, 0.28);
    var split = [];
    for (var b = 0; b < boxes.length; b++) {
      var parts = splitLargeBox(boxes[b], bin, sized.cols);
      for (var q = 0; q < parts.length; q++) split.push(parts[q]);
    }
    split = nms(split, 0.28);

    var inv = 1 / scale;
    var out = split.map(function (box, idx) {
      var xb = {
        id: 's' + (idx + 1),
        x: Math.round(box.x * inv),
        y: Math.round(box.y * inv),
        w: Math.round(box.w * inv),
        h: Math.round(box.h * inv),
        area: Math.round(box.area * inv * inv)
      };
      xb.qtyHint = estimateQty(xb, sourceCanvas.width, sourceCanvas.height);
      return xb;
    });

    src.delete(); sized.delete(); hsv.delete();
    channels.delete(); h.delete(); s.delete(); v.delete();
    wood.delete(); low.delete(); high.delete(); mask.delete();
    openK.delete(); closeK.delete(); closeV.delete(); closeH.delete();
    contours.delete(); hierarchy.delete();

    return out;
  }

  function detectWithCanvas(sourceCanvas, opts) {
    opts = opts || {};
    var maxSide = opts.maxSide || 960;
    var sw = sourceCanvas.width;
    var sh = sourceCanvas.height;
    var scale = Math.min(1, maxSide / Math.max(sw, sh));
    var w = Math.round(sw * scale);
    var h = Math.round(sh * scale);
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    var img = ctx.getImageData(0, 0, w, h);
    var d = img.data;
    var mask = new Uint8Array(w * h);

    // RGB->HSV wood filter
    for (var i = 0, p = 0; i < d.length; i += 4, p++) {
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var diff = max - min;
      var hh = 0;
      if (diff > 1e-6) {
        if (max === r) hh = 60 * (((g - b) / diff) % 6);
        else if (max === g) hh = 60 * ((b - r) / diff + 2);
        else hh = 60 * ((r - g) / diff + 4);
      }
      if (hh < 0) hh += 360;
      // OpenCV HSV H is 0..180
      var h8 = hh / 2;
      var s8 = max === 0 ? 0 : (diff / max) * 255;
      var v8 = max * 255;
      var isWood = h8 >= 8 && h8 <= 35 && s8 > 25 && s8 < 160 && v8 > 70 && v8 < 230;
      mask[p] = isWood ? 0 : 1;
    }

    // crude morphological close via box dilate/erode
    function morph(maskArr, ww, hh, rx, ry, mode) {
      var out = new Uint8Array(maskArr.length);
      for (var y = 0; y < hh; y++) {
        for (var x = 0; x < ww; x++) {
          var acc = mode === 'erode' ? 1 : 0;
          for (var dy = -ry; dy <= ry; dy++) {
            for (var dx = -rx; dx <= rx; dx++) {
              var xx = x + dx, yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= ww || yy >= hh) continue;
              var v = maskArr[yy * ww + xx];
              if (mode === 'dilate') acc = acc || v;
              else acc = acc && v;
            }
          }
          out[y * ww + x] = acc ? 1 : 0;
        }
      }
      return out;
    }
    mask = morph(mask, w, h, 2, 2, 'erode');
    mask = morph(mask, w, h, 2, 2, 'dilate');
    mask = morph(mask, w, h, 5, 5, 'dilate');
    mask = morph(mask, w, h, 5, 5, 'erode');

    // connected components
    var labels = new Int32Array(w * h);
    var boxes = [];
    var label = 0;
    var stackx = new Int32Array(w * h);
    var stacky = new Int32Array(w * h);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = y * w + x;
        if (!mask[idx] || labels[idx]) continue;
        label++;
        var top = 0;
        stackx[top] = x; stacky[top] = y; top++;
        labels[idx] = label;
        var minx = x, maxx = x, miny = y, maxy = y, area = 0;
        while (top) {
          top--;
          var cx = stackx[top], cy = stacky[top];
          area++;
          if (cx < minx) minx = cx;
          if (cx > maxx) maxx = cx;
          if (cy < miny) miny = cy;
          if (cy > maxy) maxy = cy;
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              var nx = cx + dx, ny = cy + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              var nidx = ny * w + nx;
              if (!mask[nidx] || labels[nidx]) continue;
              labels[nidx] = label;
              stackx[top] = nx; stacky[top] = ny; top++;
            }
          }
        }
        var bw = maxx - minx + 1, bh = maxy - miny + 1;
        var ar = bw / Math.max(bh, 1);
        var fill = area / Math.max(bw * bh, 1);
        var minArea = w * h * 0.0035;
        if (area < minArea) continue;
        if (ar < 0.3 || ar > 1.85) continue;
        if (bw < w * 0.045 || bh < h * 0.055) continue;
        if (fill < 0.28) continue;
        boxes.push({ x: minx, y: miny, w: bw, h: bh, area: area });
      }
    }

    boxes = nms(boxes, 0.28);
    var split = [];
    for (var b = 0; b < boxes.length; b++) {
      var parts = splitLargeBox(boxes[b], mask, w);
      for (var q = 0; q < parts.length; q++) split.push(parts[q]);
    }
    split = nms(split, 0.28);
    var inv = 1 / scale;
    return split.map(function (box, idx) {
      var xb = {
        id: 's' + (idx + 1),
        x: Math.round(box.x * inv),
        y: Math.round(box.y * inv),
        w: Math.round(box.w * inv),
        h: Math.round(box.h * inv),
        area: Math.round(box.area * inv * inv)
      };
      xb.qtyHint = estimateQty(xb, sw, sh);
      return xb;
    });
  }

  function detectStacks(sourceCanvas, opts) {
    opts = opts || {};
    try {
      if (global.cv && global.cv.Mat) return detectWithOpenCv(sourceCanvas, opts);
    } catch (e) {
      console.warn('OpenCV detect failed, fallback canvas', e);
    }
    return detectWithCanvas(sourceCanvas, opts);
  }

  /**
   * Crop likely top-card faces from a stack box.
   * Returns array of {sx,sy,sw,sh,tag} in source image coords.
   */
  function topCardCropCandidates(box) {
    var cardH = Math.min(box.h, Math.round(box.w / 0.72));
    var cardW = Math.min(box.w, Math.round(box.h * 0.72));
    var crops = [];
    // bottom-aligned (common when fan peeks upward)
    crops.push({
      tag: 'bottom',
      sx: box.x + Math.round((box.w - Math.min(box.w, cardW)) / 2),
      sy: box.y + Math.max(0, box.h - cardH),
      sw: Math.min(box.w, cardW || box.w),
      sh: cardH
    });
    // top-aligned
    crops.push({
      tag: 'top',
      sx: box.x + Math.round((box.w - Math.min(box.w, cardW)) / 2),
      sy: box.y,
      sw: Math.min(box.w, cardW || box.w),
      sh: cardH
    });
    // full box fallback
    crops.push({ tag: 'full', sx: box.x, sy: box.y, sw: box.w, sh: box.h });
    // right-aligned (horizontal fan)
    crops.push({
      tag: 'right',
      sx: box.x + Math.max(0, box.w - cardW),
      sy: box.y + Math.round((box.h - Math.min(box.h, cardH)) / 2),
      sw: cardW,
      sh: Math.min(box.h, cardH)
    });
    return crops;
  }

  global.WsDeckStackDetect = {
    detectStacks: detectStacks,
    topCardCropCandidates: topCardCropCandidates,
    estimateQty: estimateQty,
    iou: iou
  };
})(window);
