#!/usr/bin/env python3
"""Подставляет настоящий скриншот AnyEat на экран телефона в арте героя.

Исходник art-src/hero-raw.png сгенерирован с экраном-плейсхолдером #FF00FF.
Скрипт находит эту область, вписывает в неё скриншот (cover, привязка к верху),
добавляет лёгкий блик стекла и сохраняет assets/hero-cafe.png (затем cwebp).

Запуск: python3 tools/composite_hero.py [скриншот]
"""
import sys
import cv2
import numpy as np

RAW = "art-src/hero-raw.png"
SHOT = sys.argv[1] if len(sys.argv) > 1 else "assets/real/menu.jpg"
OUT = "assets/hero-cafe.png"

raw = cv2.imread(RAW, cv2.IMREAD_COLOR)
shot = cv2.imread(SHOT, cv2.IMREAD_COLOR)
h, w = raw.shape[:2]

b, g, r = [raw[:, :, i].astype(int) for i in range(3)]
magenta = ((r > 170) & (b > 170) & (g < 120)).astype(np.uint8) * 255
magenta = cv2.morphologyEx(magenta, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
contours, _ = cv2.findContours(magenta, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
cnt = max(contours, key=cv2.contourArea)

# Сплошная область экрана (включая вырез Dynamic Island).
region = np.zeros((h, w), np.uint8)
cv2.drawContours(region, [cnt], -1, 255, thickness=cv2.FILLED)

rect = cv2.minAreaRect(cnt)
box = cv2.boxPoints(rect).astype(np.float32)
# порядок: tl, tr, br, bl
s = box.sum(axis=1)
d = np.diff(box, axis=1).ravel()
tl, br = box[np.argmin(s)], box[np.argmax(s)]
tr, bl = box[np.argmin(d)], box[np.argmax(d)]
dst = np.array([tl, tr, br, bl], np.float32)
dw = int(round(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl))))
dh = int(round(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr))))

# cover-вписывание скриншота, привязка к верху.
sh, sw = shot.shape[:2]
scale = max(dw / sw, dh / sh)
resized = cv2.resize(shot, (int(np.ceil(sw * scale)), int(np.ceil(sh * scale))), interpolation=cv2.INTER_AREA)
crop = resized[:dh, :dw]
src = np.array([[0, 0], [dw - 1, 0], [dw - 1, dh - 1], [0, dh - 1]], np.float32)
M = cv2.getPerspectiveTransform(src, dst)
warped = cv2.warpPerspective(crop, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

# Блик стекла: диагональный градиент внутри экрана.
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
x0, y0, x1, y1 = tl[0], tl[1], br[0], br[1]
t = ((xx - x0) * (x1 - x0) + (yy - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2)
glare = np.clip(1.0 - np.abs(t - 0.28) * 4.2, 0, 1) * 0.10
warped = warped.astype(np.float32) * (1 - glare[..., None]) + 255 * glare[..., None]

# Мягкая маска, чуть шире плейсхолдера, чтобы закрыть розовую кайму.
mask = cv2.dilate(region, np.ones((3, 3), np.uint8), iterations=1)
mask = cv2.GaussianBlur(mask, (0, 0), 0.8).astype(np.float32)[..., None] / 255.0
out = raw.astype(np.float32) * (1 - mask) + warped * mask
cv2.imwrite(OUT, np.clip(out, 0, 255).astype(np.uint8))
print("screen rect", dw, "x", dh, "at", tl.tolist(), "->", OUT)
