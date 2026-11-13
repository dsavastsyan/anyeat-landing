(function () {
  'use strict';

  // Ссылки на скачивание. Пока пусто: кнопки показывают подсказку «скоро».
  // Подставить: appstore — страница AnyEat в App Store, apk — файл вида /downloads/anyeat-beta.apk.
  var LINKS = { appstore: '', apk: '' };

  var API = 'https://pd.restaurantsecret.ru/api';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function say(node, msg, kind) {
    if (!node) return;
    node.textContent = msg;
    node.setAttribute('data-kind', kind || '');
  }

  function postJson(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (response) {
      if (!response.ok) throw new Error('http_' + response.status);
      return response;
    });
  }

  // --- Кнопки скачивания -------------------------------------------------
  document.querySelectorAll('[data-store-link]').forEach(function (link) {
    var url = LINKS[link.getAttribute('data-store-link')];
    if (url) {
      link.setAttribute('href', url);
      if (link.getAttribute('data-store-link') === 'appstore') {
        link.setAttribute('rel', 'noopener');
        link.removeAttribute('download');
      }
      return;
    }
    link.removeAttribute('download');
    link.setAttribute('aria-disabled', 'true');
    link.addEventListener('click', function (event) {
      event.preventDefault();
      link.classList.add('is-soon');
      window.setTimeout(function () { link.classList.remove('is-soon'); }, 1800);
    });
  });

  // --- Форма обратной связи ----------------------------------------------
  var fbForm = document.getElementById('feedback-form');
  if (fbForm) {
    var fbStatus = document.getElementById('fb-status');
    var fbEmail = document.getElementById('fb-email');
    var fbConsentRow = document.getElementById('fb-consent-row');
    var fbMessage = document.getElementById('fb-message');
    var hints = {
      problem: 'Что случилось? На каком экране? Что ты ожидал увидеть?',
      suggestion: 'Чего не хватает или что можно сделать удобнее?',
      question: 'О чём хочешь спросить?'
    };

    fbForm.querySelectorAll('input[name="feedback_type"]').forEach(function (radio) {
      radio.addEventListener('change', function () { fbMessage.placeholder = hints[radio.value] || hints.problem; });
    });
    fbEmail.addEventListener('input', function () { fbConsentRow.hidden = !fbEmail.value.trim(); });

    fbForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(fbForm);
      if (data.get('website')) return;
      var message = String(data.get('message') || '').trim();
      var email = String(data.get('email') || '').trim();
      if (!message) { say(fbStatus, 'Напиши пару слов, и мы разберёмся', 'error'); return; }
      if (email && !/^\S+@\S+\.\S+$/.test(email)) { say(fbStatus, 'Проверь адрес email или оставь поле пустым', 'error'); return; }
      if (email && !data.get('consent')) { say(fbStatus, 'Поставь галочку согласия, чтобы мы могли ответить на email', 'error'); return; }

      var button = fbForm.querySelector('button[type="submit"]');
      button.disabled = true;
      say(fbStatus, 'Отправляем…', '');
      var body = {
        feedback_type: String(data.get('feedback_type') || 'problem'),
        message: '[AnyEat beta · anyeat.ru] ' + message,
        contact_allowed: Boolean(email)
      };
      if (email) body.email = email;
      postJson('/feedback', body).then(function () {
        fbForm.reset();
        fbConsentRow.hidden = true;
        fbMessage.placeholder = hints.problem;
        say(fbStatus, 'Спасибо! Мы прочитаем сообщение' + (email ? ' и ответим на email' : ''), 'ok');
      }).catch(function () {
        say(fbStatus, 'Не получилось отправить. Попробуй ещё раз чуть позже', 'error');
      }).then(function () { button.disabled = false; });
    });
  }

  // --- Лист ожидания Google Play / RuStore -------------------------------
  var form = document.getElementById('waitlist-form');
  if (form) {
    var status = document.getElementById('form-status');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var email = String(data.get('email') || '').trim();
      if (data.get('website')) return;
      if (!/^\S+@\S+\.\S+$/.test(email)) { say(status, 'Проверь адрес email', 'error'); return; }
      if (!data.get('consent')) { say(status, 'Поставь галочку согласия, чтобы мы могли написать тебе', 'error'); return; }
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      say(status, 'Отправляем…', '');
      postJson('/anyeat-waitlist', {
        email: email,
        platform: 'android',
        personal_data_consent: true,
        marketing_consent: true,
        consent_version: 'anyeat-waitlist-2026-10-24',
        source: 'anyeat.ru'
      }).then(function () {
        form.reset();
        say(status, 'Готово! Напишем, когда AnyEat появится в сторах', 'ok');
        form.classList.add('is-done');
      }).catch(function () {
        say(status, 'Не получилось отправить. Попробуй ещё раз чуть позже', 'error');
      }).then(function () { button.disabled = false; });
    });
  }

  // --- Объём героя: параллакс карточек и лёгкий наклон сцены -------------
  var stage = document.getElementById('stage');
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (stage && !reduceMotion && finePointer) {
    var floats = stage.querySelectorAll('.float');
    var photo = stage.querySelector('.stage__photo');
    var raf = 0;
    var tx = 0, ty = 0;

    function apply() {
      raf = 0;
      photo.style.transform = 'perspective(1200px) rotateY(' + (tx * 3.5).toFixed(2) + 'deg) rotateX(' + (-ty * 2.5).toFixed(2) + 'deg)';
      floats.forEach(function (node) {
        var depth = parseFloat(node.getAttribute('data-depth')) || 1;
        node.style.setProperty('--px', (tx * depth * 14).toFixed(1) + 'px');
        node.style.setProperty('--py', (ty * depth * 10).toFixed(1) + 'px');
      });
    }

    stage.addEventListener('pointermove', function (event) {
      var rect = stage.getBoundingClientRect();
      tx = ((event.clientX - rect.left) / rect.width - .5) * 2;
      ty = ((event.clientY - rect.top) / rect.height - .5) * 2;
      if (!raf) raf = window.requestAnimationFrame(apply);
    });
    stage.addEventListener('pointerleave', function () {
      tx = 0; ty = 0;
      if (!raf) raf = window.requestAnimationFrame(apply);
    });
  }

  // Плавное появление блоков при прокрутке.
  var revealNodes = document.querySelectorAll('.beta-card, .install-card, .feedback__copy, .feedback__form');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); }
      });
    }, { threshold: .15 });
    revealNodes.forEach(function (node) { node.classList.add('reveal'); observer.observe(node); });
  }
})();
