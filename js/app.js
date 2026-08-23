/* 画面の描画と操作 */
(function () {
  'use strict';

  var S = window.Store, ICSLib = window.ICS, H = window.Holidays, I = window.I18n;
  var t = I.t;

  var view = new Date();          /* 表示中の月（1日に正規化） */
  var selected = null;            /* 'YYYY-MM-DD' */
  var occMap = {};                /* 表示中の月の予定 */
  var editing = null;             /* 編集中の予定 id */
  var editingColor = '';          /* 予定ダイアログで選択中の色 */
  var importBuffer = null;        /* インポート待ちのデータ */
  var importColor = S.PALETTE[1];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr() { return S.dateStr(new Date()); }
  function wd(i) { return t('wd')[i]; }

  /* 既定のカレンダー名だけは、言語に合わせて表示を差し替える */
  function calName(cal) {
    if (!cal) return '';
    return cal.isDefault ? t('cal.default') : cal.name;
  }

  function holidayName(dateStr) {
    return H.nameOf(dateStr, I.getLang());
  }

  /* ---------- 月の描画 ---------- */

  function firstOfView() { return new Date(view.getFullYear(), view.getMonth(), 1); }

  function weekStart() { return S.get().settings.weekStartMonday ? 1 : 0; }

  function gridRange() {
    var first = firstOfView();
    var offset = (first.getDay() - weekStart() + 7) % 7;
    var start = S.addDays(first, -offset);
    var daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    var weeks = Math.ceil((offset + daysInMonth) / 7);
    return { start: start, weeks: weeks, end: S.addDays(start, weeks * 7 - 1) };
  }

  function render() {
    var r = gridRange();
    occMap = S.occurrencesByDate(r.start, r.end);

    var label = I.monthTitle(view);
    $('title').textContent = label;
    $('monthPicker').value = view.getFullYear() + '-' + pad(view.getMonth() + 1);
    document.title = label + ' | ' + t('app.name');
    $('printTitle').textContent = label;
    $('printMeta').textContent = t('prt.printedOn', { date: I.fullDate(new Date()) });

    renderWeekdays();
    renderGrid(r);
    renderSidebar();
    renderLegend();
  }

  function renderWeekdays() {
    var wrap = $('weekdays');
    wrap.innerHTML = '';
    for (var i = 0; i < 7; i++) {
      var idx = (weekStart() + i) % 7;
      var d = el('div', 'weekdays__cell', wd(idx));
      if (idx === 0) d.classList.add('is-sun');
      if (idx === 6) d.classList.add('is-sat');
      wrap.appendChild(d);
    }
  }

  function renderGrid(r) {
    var grid = $('grid');
    grid.innerHTML = '';
    grid.style.setProperty('--weeks', r.weeks);
    var showHolidays = S.get().settings.holidays !== false;

    for (var i = 0; i < r.weeks * 7; i++) {
      var d = S.addDays(r.start, i);
      var key = S.dateStr(d);
      var cell = el('div', 'cell');
      cell.dataset.date = key;
      if (d.getMonth() !== view.getMonth()) cell.classList.add('is-other');
      if (key === todayStr()) cell.classList.add('is-today');
      if (key === selected) cell.classList.add('is-selected');
      if (d.getDay() === 0) cell.classList.add('is-sun');
      if (d.getDay() === 6) cell.classList.add('is-sat');

      var head = el('div', 'cell__head');
      var num = el('span', 'cell__num', String(d.getDate()));
      head.appendChild(num);

      var hol = showHolidays ? holidayName(key) : null;
      if (hol) {
        cell.classList.add('is-holiday');
        head.appendChild(el('span', 'cell__holiday', hol));
      }
      cell.appendChild(head);

      var list = el('div', 'cell__events');
      (occMap[key] || []).forEach(function (occ) {
        list.appendChild(chip(occ));
      });
      cell.appendChild(list);
      grid.appendChild(cell);
    }
    requestAnimationFrame(markOverflow);
  }

  function chip(occ) {
    var c = el('div', 'chip');
    c.dataset.eventId = occ.event.id;
    c.dataset.occStart = occ.occStartLocal;
    c.draggable = true;
    c.style.setProperty('--chip-color', occ.color);
    if (occ.allDay || occ.multiDay) c.classList.add('chip--block');
    if (occ.multiDay) {
      c.classList.add('chip--span');
      if (!occ.isFirst) c.classList.add('chip--cont');
      if (!occ.isLast) c.classList.add('chip--open');
    }
    if (!occ.allDay && !occ.multiDay) {
      c.appendChild(el('span', 'chip__dot'));
      c.appendChild(el('span', 'chip__time', timeLabel(occ.occStart)));
    } else if (occ.multiDay && !occ.isFirst) {
      c.appendChild(el('span', 'chip__cont', '◀'));
    }
    var title = (occ.multiDay && !occ.isFirst) ? occ.event.title : occ.event.title;
    c.appendChild(el('span', 'chip__title', title));
    if (occ.event.location) {
      c.appendChild(el('span', 'chip__loc', occ.event.location));
    }
    c.title = tooltip(occ);
    return c;
  }

  function timeLabel(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  function tooltip(occ) {
    var txt = occ.event.title;
    if (!occ.allDay) txt += ' ' + timeLabel(occ.occStart) + '–' + timeLabel(occ.occEnd);
    if (occ.event.location) txt += '\n' + t('ev.location') + ': ' + occ.event.location;
    if (occ.event.notes) txt += '\n' + occ.event.notes;
    txt += '\n[' + calName(occ.calendar) + ']';
    return txt;
  }

  /* 入りきらない予定の件数を「+N」で表示する */
  function markOverflow() {
    if (isPhone()) return;   /* 点表示なので「他 N 件」は出さない */
    Array.prototype.forEach.call(document.querySelectorAll('.cell'), function (cell) {
      var old = cell.querySelector('.cell__more');
      if (old) old.remove();
      var list = cell.querySelector('.cell__events');
      if (!list) return;
      var limit = list.clientHeight;
      var hidden = 0;
      Array.prototype.forEach.call(list.children, function (ch) {
        if (ch.offsetTop + ch.offsetHeight > limit + 2) hidden++;
      });
      if (hidden > 0) {
        var more = el('button', 'cell__more', t('cell.more', { n: hidden }));
        more.type = 'button';
        cell.appendChild(more);
      }
    });
  }

  /* ---------- サイドバー ---------- */

  function renderSidebar() {
    var key = selected || todayStr();
    var d = S.toDate(key);
    $('sidebarDate').textContent = I.dayTitle(d);

    var hol = S.get().settings.holidays !== false ? holidayName(key) : null;
    var holBox = $('sidebarHoliday');
    holBox.hidden = !hol;
    holBox.textContent = hol || '';

    var list = $('sidebarList');
    list.innerHTML = '';
    var items = occMap[key] || [];
    $('sidebarEmpty').hidden = items.length > 0;

    items.forEach(function (occ) {
      var li = el('li', 'daylist__item');
      li.style.setProperty('--chip-color', occ.color);
      var main = el('div', 'daylist__main');
      main.appendChild(el('div', 'daylist__title', occ.event.title));
      var meta = occ.allDay ? t('common.allDay')
        : timeLabel(occ.occStart) + ' – ' + timeLabel(occ.occEnd);
      if (occ.multiDay) {
        meta += ' (' + I.shortDate(occ.occStart) + ' – ' + I.shortDate(occ.occEnd) + ')';
      }
      if (occ.recurring) meta += ' ⟳';
      main.appendChild(el('div', 'daylist__meta', meta));
      if (occ.event.location) {
        main.appendChild(el('div', 'daylist__meta', t('common.locationMark') + occ.event.location));
      }
      if (occ.event.notes) main.appendChild(el('div', 'daylist__notes', occ.event.notes));
      main.appendChild(el('div', 'daylist__cal', calName(occ.calendar)));
      li.appendChild(main);

      var edit = el('button', 'iconbtn', '✎');
      edit.title = t('side.edit');
      edit.addEventListener('click', function () { openEvent(occ.event.id, occ.occStartLocal); });
      var del = el('button', 'iconbtn', '🗑');
      del.title = t('side.delete');
      del.addEventListener('click', function () { deleteOccurrence(occ.event, occ.occStartLocal); });
      var acts = el('div', 'daylist__acts');
      acts.appendChild(edit); acts.appendChild(del);
      li.appendChild(acts);
      list.appendChild(li);
    });
  }

  function renderLegend() {
    var ul = $('calLegend');
    ul.innerHTML = '';
    S.get().calendars.forEach(function (c) {
      var li = el('li', 'callegend__item');
      var lab = el('label', 'check');
      var cb = el('input');
      cb.type = 'checkbox';
      cb.checked = c.visible !== false;
      cb.addEventListener('change', function () {
        c.visible = cb.checked;
        S.save();
        render();
      });
      var dot = el('span', 'dot');
      dot.style.background = c.color;
      lab.appendChild(cb);
      lab.appendChild(dot);
      lab.appendChild(document.createTextNode(calName(c)));
      li.appendChild(lab);
      ul.appendChild(li);
    });
  }

  /* 言語を切り替えて、画面全体を描き直す */
  function applyLang(next, save) {
    I.setLang(next);
    I.applyStatic();
    $('langSelect').value = I.getLang();
    document.querySelector('meta[name="apple-mobile-web-app-title"]')
      .setAttribute('content', t('app.name'));
    if (save) {
      S.get().settings.lang = I.getLang();
      S.save();
    }
    render();
  }

  /* URL の ?lang=en / ?lang=ja は保存された設定より優先する */
  function langFromQuery() {
    var m = /[?&]lang=([a-zA-Z-]+)/.exec(location.search);
    if (!m) return null;
    var v = m[1].toLowerCase().slice(0, 2);
    return I.langs.indexOf(v) >= 0 ? v : null;
  }

  /* 画面幅がスマートフォン相当か（CSS のブレークポイントと合わせる） */
  function isPhone() {
    return window.matchMedia('(max-width: 620px)').matches;
  }

  function toggleMenu(open) {
    var m = $('menu'), b = $('menuBtn');
    var next = open != null ? open : !m.classList.contains('is-open');
    m.classList.toggle('is-open', next);
    b.setAttribute('aria-expanded', next ? 'true' : 'false');
  }

  /* 横スワイプで前後の月へ */
  function bindSwipe(target) {
    var x0 = 0, y0 = 0, t0 = 0, tracking = false;
    target.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = Date.now();
      tracking = true;
    }, { passive: true });
    target.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0, dy = t.clientY - y0;
      if (Date.now() - t0 > 700) return;
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      move(dx < 0 ? 1 : -1);
      animateGrid(dx < 0 ? 'left' : 'right');
    }, { passive: true });
  }

  function animateGrid(dir) {
    var g = $('grid');
    g.classList.remove('slide-left', 'slide-right');
    void g.offsetWidth;
    g.classList.add(dir === 'left' ? 'slide-left' : 'slide-right');
  }

  function setStatus(msg) {
    $('status').textContent = msg || '';
    if (msg) setTimeout(function () {
      if ($('status').textContent === msg) $('status').textContent = '';
    }, 4000);
  }

  /* ---------- 予定ダイアログ ---------- */

  function buildSwatches(container, current, onPick) {
    container.innerHTML = '';
    var colors = [''].concat(S.PALETTE);
    colors.forEach(function (col) {
      var b = el('button', 'swatch');
      b.type = 'button';
      if (!col) {
        b.classList.add('swatch--auto');
        b.title = t('cal.autoColorTitle');
        b.textContent = t('cal.autoColor');
      }
      else b.style.background = col;
      if (col === current) b.classList.add('is-on');
      b.addEventListener('click', function () {
        onPick(col);
        Array.prototype.forEach.call(container.children, function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
      container.appendChild(b);
    });
  }

  function fillCalendarSelect(sel, current) {
    sel.innerHTML = '';
    S.get().calendars.forEach(function (c) {
      var o = el('option', null, calName(c));
      o.value = c.id;
      if (c.id === current) o.selected = true;
      sel.appendChild(o);
    });
  }

  function openEvent(id, occStart) {
    var dlg = $('eventDialog');
    var ev = id ? S.eventById(id) : null;
    editing = ev ? ev.id : null;
    $('eventDialogTitle').textContent = ev ? t('ev.edit') : t('ev.add');
    $('evError').hidden = true;
    $('evDelete').hidden = !ev;

    var startLocal, endLocal;
    if (ev) {
      /* 繰り返し予定は、クリックした回の日付を表示する */
      var baseStart = S.toDate(ev.start), baseEnd = S.toDate(ev.end);
      var span = Math.round((S.startOfDay(baseEnd) - S.startOfDay(baseStart)) / 86400000);
      var occ = occStart ? S.toDate(occStart) : baseStart;
      startLocal = occ;
      endLocal = new Date(occ.getFullYear(), occ.getMonth(), occ.getDate() + span,
        baseEnd.getHours(), baseEnd.getMinutes());
    } else {
      var base = selected ? S.toDate(selected) : new Date();
      var now = new Date();
      startLocal = new Date(base.getFullYear(), base.getMonth(), base.getDate(),
        Math.min(now.getHours() + 1, 23), 0);
      endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);
    }

    $('evTitle').value = ev ? ev.title : '';
    $('evAllDay').checked = ev ? ev.allDay : false;
    $('evStartDate').value = S.dateStr(startLocal);
    $('evStartTime').value = timeLabel(startLocal);
    $('evEndDate').value = S.dateStr(endLocal);
    $('evEndTime').value = timeLabel(endLocal);
    $('evLocation').value = ev ? ev.location : '';
    $('evNotes').value = ev ? ev.notes : '';

    editingColor = ev ? (ev.color || '') : '';
    buildSwatches($('evColor'), editingColor, function (c) { editingColor = c; });
    fillCalendarSelect($('evCalendar'), ev ? ev.calendarId : S.get().settings.defaultCalendar);

    var hasRule = !!(ev && ev.rrule);
    $('evRepeatToggle').checked = hasRule;
    $('evRepeatRow').hidden = !hasRule;
    setRepeatSelect(ev ? ev.rrule : '');
    syncAllDay();

    dlg.showModal();
    setTimeout(function () { $('evTitle').focus(); }, 30);
  }

  function setRepeatSelect(rrule) {
    var sel = $('evRepeat');
    var until = '';
    var body = String(rrule || '');
    var m = /UNTIL=(\d{8})/.exec(body);
    if (m) until = m[1].slice(0, 4) + '-' + m[1].slice(4, 6) + '-' + m[1].slice(6, 8);
    var core = body.replace(/;?UNTIL=[^;]*/i, '');
    var byday = /BYDAY=([^;]*)/i.exec(core);
    var found = false;
    Array.prototype.forEach.call(sel.options, function (o) {
      if (o.value === 'FREQ=MONTHLY;BYDAY=') {
        if (/FREQ=MONTHLY/.test(core) && byday) { o.selected = true; found = true; }
      } else if (o.value && o.value === core) { o.selected = true; found = true; }
    });
    if (!found) sel.value = core ? '' : '';
    $('evRepeatUntil').value = until;
  }

  function repeatValue(startDate) {
    if (!$('evRepeatToggle').checked) return '';
    var v = $('evRepeat').value;
    if (!v) return '';
    if (v === 'FREQ=MONTHLY;BYDAY=') {
      var d = S.toDate(startDate);
      var ord = Math.ceil(d.getDate() / 7);
      var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      if (d.getDate() + 7 > last) ord = -1;
      v = 'FREQ=MONTHLY;BYDAY=' + (ord === -1 ? '-1' : ord) +
        ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d.getDay()];
    }
    var until = $('evRepeatUntil').value;
    if (until) v += ';UNTIL=' + until.replace(/-/g, '') + 'T235959';
    return v;
  }

  function syncAllDay() {
    var all = $('evAllDay').checked;
    $('evStartTime').disabled = all;
    $('evEndTime').disabled = all;
    $('evStartTime').classList.toggle('is-off', all);
    $('evEndTime').classList.toggle('is-off', all);
  }

  function saveEvent(e) {
    e.preventDefault();
    var allDay = $('evAllDay').checked;
    var sd = $('evStartDate').value, ed = $('evEndDate').value;
    var st = $('evStartTime').value || '00:00', et = $('evEndTime').value || '00:00';
    if (!sd) return;
    if (!ed) ed = sd;

    var start = allDay ? sd : sd + 'T' + st;
    var end = allDay ? ed : ed + 'T' + et;
    if (S.toDate(end) < S.toDate(start)) {
      var err = $('evError');
      err.textContent = t('ev.errRange');
      err.hidden = false;
      return;
    }

    var prev = editing ? S.eventById(editing) : null;
    S.upsertEvent({
      id: editing || undefined,
      uid: prev ? prev.uid : '',
      calendarId: $('evCalendar').value,
      title: $('evTitle').value,
      location: $('evLocation').value,
      notes: $('evNotes').value,
      allDay: allDay,
      start: start,
      end: end,
      color: editingColor,
      rrule: repeatValue(start),
      exdates: prev && prev.rrule ? prev.exdates : []
    });
    S.get().settings.defaultCalendar = $('evCalendar').value;
    S.save();
    selected = start.slice(0, 10);
    $('eventDialog').close();
    render();
    setStatus(editing ? t('msg.updated') : t('msg.added'));
    editing = null;
  }

  function deleteOccurrence(ev, occStart) {
    if (ev.rrule) {
      var all = window.confirm(t('cf.deleteRecurring', { date: String(occStart).slice(0, 10) }));
      if (all) S.removeEvent(ev.id);
      else S.excludeOccurrence(ev.id, occStart);
    } else {
      if (!window.confirm(t('cf.delete', { title: ev.title }))) return;
      S.removeEvent(ev.id);
    }
    render();
    setStatus(t('msg.deleted'));
  }

  /* ---------- インポート ---------- */

  function openImport() {
    importBuffer = null;
    $('importPreview').hidden = true;
    $('importError').hidden = true;
    $('importCommit').disabled = true;
    $('urlInput').value = '';
    $('fileInput').value = '';
    fillImportTarget();
    buildSwatches($('importColor'), importColor, function (c) { importColor = c || S.PALETTE[1]; });
    $('importDialog').showModal();
  }

  function fillImportTarget() {
    var sel = $('importTarget');
    sel.innerHTML = '';
    var o = el('option', null, t('imp.newCal'));
    o.value = '';
    sel.appendChild(o);
    S.get().calendars.forEach(function (c) {
      var x = el('option', null, t('imp.addTo', { name: calName(c) }));
      x.value = c.id;
      sel.appendChild(x);
    });
  }

  function importError(msg) {
    var p = $('importError');
    p.textContent = msg;
    p.hidden = false;
  }

  function handleIcsText(texts, suggestedName) {
    var all = [];
    var names = [];
    var skipped = 0;
    texts.forEach(function (t) {
      if (!/BEGIN:VCALENDAR/i.test(t)) return;
      var res = ICSLib.parse(t);
      skipped += res.skipped;
      if (res.name) names.push(res.name);
      all = all.concat(res.events);
    });

    if (!all.length) {
      importError(t('imp.none'));
      $('importCommit').disabled = true;
      $('importPreview').hidden = true;
      return;
    }

    importBuffer = all;
    $('importError').hidden = true;
    $('importPreview').hidden = false;
    $('importCommit').disabled = false;
    $('importName').value = names[0] || suggestedName || t('cal.importedName');

    var dates = all.map(function (e) { return e.start.slice(0, 10); }).sort();
    var recurring = all.filter(function (e) { return !!e.rrule; }).length;
    var ul = $('importSummary');
    ul.innerHTML = '';
    ul.appendChild(el('li', null, t('imp.events', { n: all.length })));
    ul.appendChild(el('li', null, t('imp.range', { from: dates[0], to: dates[dates.length - 1] })));
    if (recurring) ul.appendChild(el('li', null, t('imp.recurring', { n: recurring })));
    if (skipped) ul.appendChild(el('li', null, t('imp.skipped', { n: skipped })));
    ul.appendChild(el('li', null, t('imp.example', {
      list: all.slice(0, 3).map(function (e) { return e.title; }).join(' / ')
    })));
  }

  function readFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    var texts = [];
    var done = 0;
    list.forEach(function (f) {
      var fr = new FileReader();
      fr.onload = function () {
        texts.push(String(fr.result));
        if (++done === list.length) handleIcsText(texts, list[0].name.replace(/\.[^.]+$/, ''));
      };
      fr.onerror = function () {
        if (++done === list.length) handleIcsText(texts, list[0].name.replace(/\.[^.]+$/, ''));
      };
      fr.readAsText(f, 'utf-8');
    });
  }

  function loadFromUrl() {
    var url = $('urlInput').value.trim();
    if (!url) return;
    var https = url.replace(/^webcal:\/\//i, 'https://');
    $('importError').hidden = true;
    setStatus(t('imp.loading'));
    fetch(https, { mode: 'cors' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) { handleIcsText([text], t('imp.icloudName')); setStatus(''); })
      .catch(function (err) {
        setStatus('');
        importError(t('imp.fetchError', { msg: err.message }));
      });
  }

  function commitImport() {
    if (!importBuffer) return;
    var targetId = $('importTarget').value;
    var cal;
    if (targetId) {
      cal = S.calendarById(targetId);
    } else {
      cal = S.addCalendar($('importName').value.trim() || t('cal.importedName'), importColor, 'ics');
    }
    var dedupe = $('importDedupe').checked;
    var st = S.get();
    var added = 0, updated = 0;

    importBuffer.forEach(function (raw) {
      var existing = null;
      if (dedupe && raw.uid) {
        existing = st.events.filter(function (e) {
          return e.uid && e.uid === raw.uid && e.calendarId === cal.id;
        })[0];
      }
      var ev = {
        id: existing ? existing.id : undefined,
        uid: raw.uid,
        calendarId: cal.id,
        title: raw.title,
        location: raw.location,
        notes: raw.notes,
        allDay: raw.allDay,
        start: raw.start,
        end: raw.end,
        rrule: raw.rrule,
        exdates: raw.exdates,
        color: ''
      };
      S.upsertEvent(ev);
      if (existing) updated++; else added++;
    });

    $('importDialog').close();
    render();
    setStatus(t('imp.done', { added: added }) + (updated ? t('imp.doneUpdated', { n: updated }) : ''));
    importBuffer = null;
  }

  /* ---------- 書き出し ---------- */

  function exportIcs() {
    var st = S.get();
    var vis = {};
    st.calendars.forEach(function (c) { vis[c.id] = c.visible !== false; });
    var events = st.events.filter(function (e) { return vis[e.calendarId] !== false; });
    if (!events.length) { setStatus(t('msg.nothingToExport')); return; }
    var text = ICSLib.build(events, t('cal.exportName'));
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'calendar-' + S.dateStr(new Date()) + '.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    setStatus(t('msg.exported', { n: events.length }));
  }

  /* ---------- カレンダー管理 ---------- */

  function openCals() {
    renderCalsList();
    $('langSelect').value = I.getLang();
    $('optHolidays').checked = S.get().settings.holidays !== false;
    $('optWeekStart').checked = !!S.get().settings.weekStartMonday;
    $('calsDialog').showModal();
  }

  function renderCalsList() {
    var ul = $('calsList');
    ul.innerHTML = '';
    S.get().calendars.forEach(function (c) {
      var li = el('li', 'cals__item');

      var vis = el('input');
      vis.type = 'checkbox';
      vis.checked = c.visible !== false;
      vis.title = t('cal.visible');
      vis.addEventListener('change', function () { c.visible = vis.checked; S.save(); render(); });

      var name = el('input', 'cals__name');
      name.type = 'text';
      name.value = calName(c);
      name.addEventListener('change', function () {
        var v = name.value.trim();
        if (v && v !== calName(c)) {
          c.name = v;
          delete c.isDefault;   /* 名前を変えたら、言語による差し替えをやめる */
        }
        S.save(); renderCalsList(); render();
      });

      var colors = el('div', 'swatches swatches--tight');
      buildSwatches(colors, c.color, function (col) {
        if (!col) return;
        c.color = col; S.save(); render();
      });
      Array.prototype.forEach.call(colors.children, function (b, i) {
        if (i === 0) b.remove();
      });

      var count = S.get().events.filter(function (e) { return e.calendarId === c.id; }).length;
      var meta = el('span', 'muted small',
        t('cal.count', { n: count }) + (c.source === 'ics' ? t('cal.imported') : ''));

      var del = el('button', 'btn btn--small btn--danger', t('side.delete'));
      del.type = 'button';
      del.addEventListener('click', function () {
        if (!window.confirm(t('cal.confirmDelete', { name: calName(c), n: count }))) return;
        if (!S.removeCalendar(c.id)) { window.alert(t('cal.lastOne')); return; }
        renderCalsList(); render();
      });

      li.appendChild(vis);
      li.appendChild(name);
      li.appendChild(colors);
      li.appendChild(meta);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  /* ---------- 印刷 ---------- */

  var printStyle = null;

  function applyPrintOptions() {
    var root = document.documentElement;
    root.classList.toggle('print-times', $('printTimes').checked);
    root.classList.toggle('print-loc', $('printLocation').checked);
    root.classList.toggle('print-color', $('printColors').checked && !$('printMono').checked);
    root.classList.toggle('print-mono', $('printMono').checked);

    var orient = document.querySelector('input[name="orient"]:checked').value;
    if (!printStyle) {
      printStyle = document.createElement('style');
      document.head.appendChild(printStyle);
    }
    /* 1 ページに収まるようグリッドの高さを用紙に合わせて指定する
     * （vh の解釈はブラウザ差があるため mm で固定する） */
    var gridHeight = orient === 'portrait' ? '252mm' : '167mm';
    printStyle.textContent =
      '@page { size: A4 ' + orient + '; margin: 8mm; }\n' +
      '@media print { .grid { height: ' + gridHeight + '; } }';
  }

  function doPrint() {
    applyPrintOptions();
    $('printDialog').close();
    setTimeout(function () { window.print(); }, 60);
  }

  /* ---------- 操作 ---------- */

  function move(delta) {
    view = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    render();
  }

  function selectDate(key) {
    selected = key;
    Array.prototype.forEach.call(document.querySelectorAll('.cell'), function (c) {
      c.classList.toggle('is-selected', c.dataset.date === key);
    });
    renderSidebar();
    if (isPhone()) $('sidebar').scrollTop = 0;
  }

  function moveEventToDate(id, newDateStr) {
    var ev = S.eventById(id);
    if (!ev) return;
    if (ev.rrule) { setStatus(t('msg.noDragRecurring')); return; }
    var oldStart = S.toDate(ev.start);
    var delta = Math.round((S.toDate(newDateStr) - S.startOfDay(oldStart)) / 86400000);
    if (!delta) return;
    var ns = S.addDays(S.toDate(ev.start), delta);
    var ne = S.addDays(S.toDate(ev.end), delta);
    ev.start = ev.allDay ? S.dateStr(ns) : S.dateStr(ns) + 'T' + timeLabel(ns);
    ev.end = ev.allDay ? S.dateStr(ne) : S.dateStr(ne) + 'T' + timeLabel(ne);
    S.upsertEvent(ev);
    render();
    setStatus(t('msg.moved', { title: ev.title, date: newDateStr }));
  }

  /* ---------- 初期化 ---------- */

  function bind() {
    $('prevBtn').addEventListener('click', function () { move(-1); });
    $('nextBtn').addEventListener('click', function () { move(1); });
    $('todayBtn').addEventListener('click', function () {
      view = new Date();
      selected = todayStr();
      render();
    });
    $('monthPicker').addEventListener('change', function (e) {
      var v = e.target.value;
      if (!v) return;
      view = new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, 1);
      render();
    });

    $('addBtn').addEventListener('click', function () { openEvent(null); });
    $('sidebarAdd').addEventListener('click', function () {
      if (!selected) selected = todayStr();
      openEvent(null);
    });
    $('importBtn').addEventListener('click', openImport);
    $('exportBtn').addEventListener('click', exportIcs);
    $('calsBtn').addEventListener('click', openCals);
    $('printBtn').addEventListener('click', function () {
      $('printDesc').textContent = t('prt.desc', { month: I.monthTitle(view) });
      $('printDialog').showModal();
    });

    /* グリッド操作 */
    var grid = $('grid');
    grid.addEventListener('click', function (e) {
      var chipEl = e.target.closest('.chip');
      var cell = e.target.closest('.cell');
      if (!cell) return;
      selectDate(cell.dataset.date);
      /* スマートフォンでは予定が点表示なので、下の一覧から開いてもらう */
      if (chipEl && !isPhone()) openEvent(chipEl.dataset.eventId, chipEl.dataset.occStart);
    });
    grid.addEventListener('dblclick', function (e) {
      /* スマートフォンのダブルタップは拡大や誤操作になりやすいので使わない */
      if (isPhone()) return;
      var cell = e.target.closest('.cell');
      if (!cell || e.target.closest('.chip')) return;
      selected = cell.dataset.date;
      openEvent(null);
    });
    grid.addEventListener('dragstart', function (e) {
      var chipEl = e.target.closest('.chip');
      if (!chipEl) return;
      e.dataTransfer.setData('text/plain', chipEl.dataset.eventId);
      e.dataTransfer.effectAllowed = 'move';
      chipEl.classList.add('is-dragging');
    });
    grid.addEventListener('dragend', function (e) {
      var chipEl = e.target.closest('.chip');
      if (chipEl) chipEl.classList.remove('is-dragging');
      Array.prototype.forEach.call(document.querySelectorAll('.cell'), function (c) {
        c.classList.remove('is-over');
      });
    });
    grid.addEventListener('dragover', function (e) {
      var cell = e.target.closest('.cell');
      if (!cell) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      cell.classList.add('is-over');
    });
    grid.addEventListener('dragleave', function (e) {
      var cell = e.target.closest('.cell');
      if (cell) cell.classList.remove('is-over');
    });
    grid.addEventListener('drop', function (e) {
      var cell = e.target.closest('.cell');
      if (!cell) return;
      e.preventDefault();
      cell.classList.remove('is-over');
      var id = e.dataTransfer.getData('text/plain');
      if (id) moveEventToDate(id, cell.dataset.date);
    });

    /* 予定ダイアログ */
    $('eventForm').addEventListener('submit', saveEvent);
    $('evAllDay').addEventListener('change', syncAllDay);
    $('evRepeatToggle').addEventListener('change', function () {
      $('evRepeatRow').hidden = !$('evRepeatToggle').checked;
      if ($('evRepeatToggle').checked && !$('evRepeat').value) $('evRepeat').value = 'FREQ=WEEKLY';
    });
    $('evStartDate').addEventListener('change', function () {
      if ($('evEndDate').value < $('evStartDate').value) $('evEndDate').value = $('evStartDate').value;
    });
    $('evDelete').addEventListener('click', function () {
      var ev = S.eventById(editing);
      if (!ev) return;
      var occ = $('evStartDate').value + ($('evAllDay').checked ? '' : 'T' + $('evStartTime').value);
      $('eventDialog').close();
      deleteOccurrence(ev, occ);
    });

    /* インポート */
    var dz = $('dropzone');
    dz.addEventListener('click', function () { $('fileInput').click(); });
    dz.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('fileInput').click(); }
    });
    ['dragenter', 'dragover'].forEach(function (t) {
      dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove('is-over'); });
    });
    dz.addEventListener('drop', function (e) { readFiles(e.dataTransfer.files); });
    $('fileInput').addEventListener('change', function (e) { readFiles(e.target.files); });
    $('urlLoad').addEventListener('click', loadFromUrl);
    $('importCommit').addEventListener('click', commitImport);

    /* カレンダー管理 */
    $('newCalAdd').addEventListener('click', function () {
      var n = $('newCalName').value.trim();
      if (!n) return;
      S.addCalendar(n);
      $('newCalName').value = '';
      renderCalsList(); render();
    });
    $('langSelect').addEventListener('change', function (e) {
      applyLang(e.target.value, true);
      renderCalsList();
    });
    $('optHolidays').addEventListener('change', function (e) {
      S.get().settings.holidays = e.target.checked; S.save(); render();
    });
    $('optWeekStart').addEventListener('change', function (e) {
      S.get().settings.weekStartMonday = e.target.checked; S.save(); render();
    });
    $('wipeBtn').addEventListener('click', function () {
      if (!window.confirm(t('cal.confirmWipe'))) return;
      S.reset();
      $('calsDialog').close();
      render();
      setStatus(t('msg.wiped'));
    });

    /* 印刷 */
    $('printGo').addEventListener('click', doPrint);
    window.addEventListener('beforeprint', applyPrintOptions);

    /* ダイアログ共通 */
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', function () { b.closest('dialog').close(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('dialog'), function (d) {
      d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    });

    /* キーボード */
    document.addEventListener('keydown', function (e) {
      if (document.querySelector('dialog[open]')) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') { move(-1); }
      else if (e.key === 'ArrowRight') { move(1); }
      else if (e.key === 't' || e.key === 'T') { view = new Date(); selected = todayStr(); render(); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openEvent(null); }
    });

    /* 「⋯」メニュー（スマートフォン） */
    $('menuBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleMenu();
    });
    $('menu').addEventListener('click', function () { toggleMenu(false); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#menu') && !e.target.closest('#menuBtn')) toggleMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') toggleMenu(false);
    });

    /* 横スワイプで月を移動（スマートフォン・タブレット） */
    bindSwipe(document.querySelector('.calendar'));

    window.addEventListener('resize', function () { requestAnimationFrame(markOverflow); });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { requestAnimationFrame(markOverflow); }, 250);
    });
  }

  S.load();
  selected = todayStr();
  var startLang = langFromQuery() || S.get().settings.lang || 'ja';
  I.setLang(startLang);
  I.applyStatic();
  bind();
  applyLang(startLang, startLang !== S.get().settings.lang);
  applyPrintOptions();
})();
