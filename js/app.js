/**
 * RE:VIVE STUDIO — app.js
 * Meny, scroll-animationer, tidsväljare för släpp, bokning (4 steg),
 * bokningsbekräftelse med hemlig adress, formulär och bloggfilter.
 * Släppdata (datum, tider, status) ligger i js/data.js.
 */
(function () {
  'use strict';

  var DATA = window.REVIVE || { drops: {}, slots: [], locations: {} };
  var DAYS = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function parseDate(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(iso, long) {
    var d = parseDate(iso);
    return (long ? DAYS[d.getDay()] + ' ' : '') + d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  // Skenbar beläggning så att vissa tider syns som fullbokade (byt mot riktig data från bokningssystemet).
  function isTaken(dropId, date, slot) {
    var s = dropId + date + slot, h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    var limit = DATA.drops[dropId] && DATA.drops[dropId].status === 'few' ? 55 : 28;
    return (h % 100) < limit;
  }
  function freeSlots(dropId, date) {
    return DATA.slots.filter(function (s) { return !isTaken(dropId, date, s); });
  }

  function store(key, val) { try { sessionStorage.setItem(key, JSON.stringify(val)); localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function load(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  function toast(msg) {
    var t = $('#siteToast');
    if (!t) { t = document.createElement('div'); t.id = 'siteToast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 4200);
  }

  /* ---------- Meny & aktiv länk ---------- */
  function initNav() {
    var btn = $('.menu-toggle'), menu = $('#mobileMenu');
    if (btn && menu) {
      btn.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? 'Stäng' : 'Meny';
        updateHeader();
      });
    }
    // Startsidan: menyn är transparent över heron och blir fylld när man scrollar
    var header = $('.site-header');
    function updateHeader() {
      if (!header) return;
      var solid = window.scrollY > 40 || (menu && menu.classList.contains('open'));
      header.classList.toggle('solid', solid);
    }
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
    var page = location.pathname.split('/').pop() || 'index.html';
    if (page.indexOf('tema-') === 0) page = 'slapp.html#teman';
    $all('.nav-link').forEach(function (a) {
      if (a.getAttribute('href') === page) a.classList.add('active');
    });
  }

  /* ---------- Scroll-animationer ---------- */
  function initReveal() {
    var els = $all('.reveal-up');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- Tidsväljare ---------- */
  function renderPicker(el, dropId, opts) {
    opts = opts || {};
    var drop = DATA.drops[dropId];
    if (!drop) { el.innerHTML = '<p class="muted small">Välj ett släpp ovan för att se lediga tider.</p>'; return; }

    if (drop.status === 'soon') {
      el.innerHTML =
        '<div class="picker-soon"><span class="picker-label">Bokningen öppnar ' + (drop.opens || 'snart') + '</span>' +
        '<p>Släppet hålls ' + drop.dates.map(function (d) { return fmtDate(d, true); }).join(' och ') + '. Skriv upp dig så får du ett mejl 24 timmar innan bokningen öppnar.</p>' +
        '<form class="js-notify"><label class="sr-only" for="n-' + dropId + '">E-post</label><input id="n-' + dropId + '" class="input" type="email" placeholder="Din e-post" required><button class="btn btn-wine btn-sm" type="submit">Bevaka släppet</button></form></div>';
      bindNotify(el);
      if (opts.onSelect) opts.onSelect(null, null);
      return;
    }

    var state = { date: null, time: null };
    var startIdx = 0;
    if (opts.date && drop.dates.indexOf(opts.date) > -1) startIdx = drop.dates.indexOf(opts.date);
    state.date = drop.dates[startIdx];
    if (opts.time && !isTaken(dropId, state.date, opts.time) && DATA.slots.indexOf(opts.time) > -1) state.time = opts.time;

    function draw() {
      var tabs = drop.dates.map(function (d) {
        var left = freeSlots(dropId, d).length;
        var dd = parseDate(d);
        return '<button type="button" class="date-tab' + (d === state.date ? ' active' : '') + '" data-date="' + d + '" aria-pressed="' + (d === state.date) + '">' +
          '<span class="w">' + DAYS[dd.getDay()] + '</span><span class="d">' + dd.getDate() + ' ' + MONTHS[dd.getMonth()] + '</span>' +
          '<span class="left">' + (left ? left + ' tider kvar' : 'Fullbokat') + '</span></button>';
      }).join('');
      var slots = DATA.slots.map(function (s) {
        var taken = isTaken(dropId, state.date, s);
        return '<button type="button" class="slot' + (s === state.time ? ' active' : '') + '" data-time="' + s + '"' + (taken ? ' disabled aria-label="' + s + ' fullbokad"' : '') + '>' + s + '</button>';
      }).join('');
      var foot = opts.mode === 'booking' ? '' :
        '<div class="picker-foot"><div class="price">99 kr<small>per bokning · 1–3 personer</small></div>' +
        '<a class="btn btn-wine js-book" href="#">' + (state.time ? 'Boka ' + fmtDate(state.date) + ' kl ' + state.time.split('–')[0] : 'Välj en tid') + '</a></div>';
      el.innerHTML = '<span class="picker-label">Datum</span><div class="date-tabs">' + tabs + '</div>' +
        '<span class="picker-label">Tid (75 min)</span><div class="slots">' + slots + '</div>' + foot;

      var bookBtn = $('.js-book', el);
      if (bookBtn) {
        if (state.time) {
          bookBtn.href = 'boka.html?drop=' + dropId + '&date=' + state.date + '&time=' + encodeURIComponent(state.time);
          bookBtn.removeAttribute('aria-disabled');
        } else {
          bookBtn.setAttribute('aria-disabled', 'true');
          bookBtn.classList.add('is-disabled');
        }
        bookBtn.addEventListener('click', function (e) {
          if (!state.time) { e.preventDefault(); toast('Välj en tid först.'); var s = $('.slot:not([disabled])', el); if (s) s.focus(); }
        });
      }
      if (opts.onSelect) opts.onSelect(state.date, state.time);
    }

    el.addEventListener('click', function (e) {
      var tab = e.target.closest('.date-tab');
      var slot = e.target.closest('.slot');
      if (tab) { state.date = tab.dataset.date; state.time = null; draw(); $('[data-date="' + state.date + '"]', el).focus(); }
      if (slot && !slot.disabled) { state.time = slot.dataset.time; draw(); var f = $('[data-time="' + state.time + '"]', el); if (f) f.focus(); }
    });
    draw();
  }

  function bindNotify(root) {
    $all('.js-notify', root).forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); toast('Klart! Vi mejlar dig innan bokningen öppnar.'); f.reset(); });
    });
  }

  function initPickers() {
    $all('[data-picker]').forEach(function (el) {
      if (el.dataset.mode === 'booking') return;
      renderPicker(el, el.dataset.picker);
    });
  }

  /* ---------- Bokning ---------- */
  function initBooking() {
    var form = $('#bookingForm');
    if (!form) return;
    var params = new URLSearchParams(location.search);
    var st = { drop: null, date: null, time: null, guests: 2, pay: 'swish' };
    var pickerEl = $('[data-mode="booking"]', form);

    function summary() {
      var d = DATA.drops[st.drop];
      $('#sumDrop').textContent = d ? d.name : 'Välj ett släpp';
      $('#sumDate').textContent = st.date ? fmtDate(st.date, true) : '–';
      $('#sumTime').textContent = st.time || '–';
      $('#sumGuests').textContent = st.guests + (st.guests === 1 ? ' person' : ' personer');
      if (d) { $('#sumImg').src = d.portrait; $('#sumImg').alt = d.name; }
    }

    function chooseDrop(id, date, time) {
      var d = DATA.drops[id];
      if (!d || d.status === 'soon') return;
      st.drop = id; st.date = null; st.time = null;
      $all('.drop-choice', form).forEach(function (b) {
        var on = b.dataset.drop === id; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on);
      });
      renderPicker(pickerEl, id, {
        mode: 'booking', date: date, time: time,
        onSelect: function (dt, tm) { st.date = dt; st.time = tm; summary(); }
      });
      summary();
    }

    $all('.drop-choice', form).forEach(function (b) {
      b.addEventListener('click', function () { chooseDrop(b.dataset.drop); });
    });
    $all('.guest-choice', form).forEach(function (b) {
      b.addEventListener('click', function () {
        st.guests = +b.dataset.guests;
        $all('.guest-choice', form).forEach(function (x) { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
        summary();
      });
    });
    var cardWrap = $('#cardFields');
    $all('.pay-method', form).forEach(function (b) {
      b.addEventListener('click', function () {
        st.pay = b.dataset.pay;
        $all('.pay-method', form).forEach(function (x) { x.classList.toggle('active', x === b); });
        var card = st.pay === 'card';
        cardWrap.hidden = !card;
        $all('input', cardWrap).forEach(function (i) { i.required = card; });
      });
    });

    var g = +params.get('guests');
    if (g >= 1 && g <= 3) { var gb = $('.guest-choice[data-guests="' + g + '"]', form); if (gb) gb.click(); }

    var first = params.get('drop');
    if (!DATA.drops[first] || DATA.drops[first].status === 'soon') {
      first = Object.keys(DATA.drops).filter(function (k) { return DATA.drops[k].status !== 'soon'; })[0];
    }
    chooseDrop(first, params.get('date'), params.get('time'));

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('#formError');
      err.textContent = '';
      if (!st.drop || !st.date || !st.time) {
        err.textContent = 'Välj släpp, datum och tid i steg 1.';
        $('#step-1').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      var invalid = $all('input[required], select[required]', form).filter(function (i) { return !i.checkValidity(); })[0];
      if (invalid) {
        err.textContent = invalid.type === 'checkbox' ? 'Godkänn bokningsvillkoren för att fortsätta.' : 'Kontrollera de markerade fälten.';
        invalid.focus();
        invalid.reportValidity && invalid.reportValidity();
        return;
      }
      var btn = $('#payBtn');
      btn.disabled = true;
      btn.textContent = st.pay === 'swish' ? 'Öppna Swish och godkänn …' : 'Behandlar betalning …';

      var ref = 'RV-' + Math.floor(1000 + Math.random() * 9000);
      var booking = {
        ref: ref, drop: st.drop, date: st.date, time: st.time, guests: st.guests,
        first: $('#bf-first').value.trim(), email: $('#bf-email').value.trim()
      };
      store('revive-booking', booking);
      // OBS: demo. Koppla till riktig betalning (t.ex. Stripe eller Swish Handel) innan sidan går live.
      setTimeout(function () {
        location.href = 'bekraftelse.html?ref=' + ref + '&drop=' + st.drop + '&date=' + st.date +
          '&time=' + encodeURIComponent(st.time) + '&g=' + st.guests;
      }, 1400);
    });
  }

  /* ---------- Bekräftelse ---------- */
  function initConfirmation() {
    if (!$('#ticket')) return;
    var p = new URLSearchParams(location.search);
    var saved = load('revive-booking') || {};
    var b = {
      ref: p.get('ref') || saved.ref, drop: p.get('drop') || saved.drop, date: p.get('date') || saved.date,
      time: p.get('time') || saved.time, guests: +(p.get('g') || saved.guests || 1)
    };
    var d = DATA.drops[b.drop];
    if (!d || !b.date || !b.time) {
      $('#ticket').hidden = true; $('#noBooking').hidden = false;
      $('#confTitle').textContent = 'Ingen bokning att visa';
      return;
    }
    var same = saved.ref === b.ref;
    var loc = DATA.locations[b.drop] || {};
    if (same && saved.first) $('#confTitle').textContent = 'Din plats är säkrad, ' + saved.first;
    if (same && saved.email) $('#confEmail').textContent = saved.email;
    $('#confRef').textContent = b.ref;
    $('#confDrop').textContent = d.name;
    $('#confDate').textContent = fmtDate(b.date, true);
    $('#confTime').textContent = b.time;
    $('#confGuests').textContent = b.guests + (b.guests === 1 ? ' person' : ' personer');
    $('#confAddr').textContent = (loc.address || '') + (loc.area ? ', ' + loc.area : '');
    $('#confCode').textContent = loc.code || '–';
    $('#confImg').src = d.img; $('#confImg').alt = d.name;

    $('#icsBtn').addEventListener('click', function () {
      var t = b.time.split('–');
      function stamp(time) { return b.date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00'; }
      var ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RE:VIVE Studio//SV', 'BEGIN:VEVENT',
        'UID:' + b.ref + '@revivestudio.se',
        'DTSTART;TZID=Europe/Stockholm:' + stamp(t[0]),
        'DTEND;TZID=Europe/Stockholm:' + stamp(t[1]),
        'SUMMARY:RE:VIVE – ' + d.name,
        'LOCATION:' + (loc.address || '') + ', ' + (loc.area || ''),
        'DESCRIPTION:Bokning ' + b.ref + '. Portkod ' + (loc.code || '') + '. Kom 5 minuter innan.',
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = 'revive-' + b.ref + '.ics';
      document.body.appendChild(a); a.click(); a.remove();
    });
  }

  /* ---------- Formulär & blogg ---------- */
  function initForms() {
    $all('.js-newsletter').forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); toast('Välkommen! Du får nästa släpp före alla andra.'); f.reset(); });
    });
    var c = $('#contactForm');
    if (c) c.addEventListener('submit', function (e) { e.preventDefault(); toast('Tack! Vi svarar inom 24 timmar.'); c.reset(); });
    var s = $('#consignForm');
    if (s) s.addEventListener('submit', function (e) { e.preventDefault(); toast('Tack! Vi går igenom dina plagg och hör av oss.'); s.reset(); });
    bindNotify(document);
  }

  function initBlogFilter() {
    var bar = $('#blogFilters');
    if (!bar) return;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      $all('[data-cat]', bar).forEach(function (x) { x.classList.toggle('active', x === b); });
      var cat = b.dataset.cat;
      $all('.article-card[data-cat]').forEach(function (a) {
        a.hidden = !(cat === 'Alla' || a.dataset.cat === cat);
        a.classList.add('visible');
      });
    });
    // Öppna artikeln om man kommer via länk (#id)
    if (location.hash) {
      var art = document.getElementById(location.hash.slice(1));
      var det = art && $('details', art);
      if (det) det.open = true;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initReveal();
    initPickers();
    initBooking();
    initConfirmation();
    initForms();
    initBlogFilter();
  });
})();
