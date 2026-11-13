# AnyEat landing

Лендинг anyeat.ru (GitHub Pages): бета-страница с кнопками скачивания, объяснением беты и формой обратной связи.

- `beta.js` — ссылки скачивания (`LINKS.appstore`, `LINKS.apk`), формы (обратная связь → `/api/feedback`, лист ожидания → `/api/anyeat-waitlist`), параллакс героя.
- `art-src/hero-raw.png` — сгенерированный арт героя с экраном-плейсхолдером `#FF00FF`.
- `tools/composite_hero.py` — вставляет скриншот приложения на экран телефона (`assets/hero-cafe.png`), затем `cwebp -q 88 assets/hero-cafe.png -o assets/hero-cafe.webp`. Нужны `opencv-python-headless`, `numpy`.
