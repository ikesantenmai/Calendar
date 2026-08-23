/* データ保存（localStorage）と繰り返し予定の展開 */
(function (global) {
  'use strict';

  var KEY = 'calendar-app:v1';

  var PALETTE = [
    '#2f6fed', '#e5484d', '#0f9d58', '#f2a20c', '#8b5cf6',
    '#e2529d', '#0d9488', '#64748b'
  ];

  var DEFAULT_STATE = {
    /* isDefault が立っているカレンダーの名前は、表示時に言語に合わせて差し替える */
    calendars: [{
      id: 'local', name: 'マイカレンダー', color: PALETTE[0],
      visible: true, source: 'local', isDefault: true
    }],
    events: [],
    settings: {
      holidays: true, weekStartMonday: false, defaultCalendar: 'local',
      lang: 'ja', view: 'month'
    }
  };

  var state = null;

  /* ---------- 日付ユーティリティ ---------- */

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function toDate(local) {
    var parts = String(local).split('T');
    var d = parts[0].split('-').map(Number);
    var t = parts[1] ? parts[1].split(':').map(Number) : [0, 0];
    return new Date(d[0], (d[1] || 1) - 1, d[2] || 1, t[0] || 0, t[1] || 0, 0, 0);
  }
  function dateStr(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function addDays(d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function monthDiff(a, b) {
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  }

  /* ---------- 保存・読み込み ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : null;
    } catch (e) { state = null; }
    if (!state || !Array.isArray(state.calendars) || !state.calendars.length) {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    if (!Array.isArray(state.events)) state.events = [];
    state.settings = Object.assign({}, DEFAULT_STATE.settings, state.settings || {});
    return state;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('保存に失敗しました', e);
      return false;
    }
  }

  function get() { return state || load(); }

  function uid() {
    return 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- カレンダー ---------- */

  function calendarById(id) {
    return get().calendars.filter(function (c) { return c.id === id; })[0] || get().calendars[0];
  }

  function addCalendar(name, color, source) {
    var cal = {
      id: 'cal_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name || 'Calendar',
      color: color || PALETTE[get().calendars.length % PALETTE.length],
      visible: true,
      source: source || 'local'
    };
    get().calendars.push(cal);
    save();
    return cal;
  }

  function removeCalendar(id) {
    var s = get();
    if (s.calendars.length <= 1) return false;
    s.calendars = s.calendars.filter(function (c) { return c.id !== id; });
    s.events = s.events.filter(function (e) { return e.calendarId !== id; });
    if (s.settings.defaultCalendar === id) s.settings.defaultCalendar = s.calendars[0].id;
    save();
    return true;
  }

  /* ---------- 予定 ---------- */

  function normalize(ev) {
    var e = Object.assign({}, ev);
    e.id = e.id || uid();
    e.title = (e.title || '').trim() || '(タイトルなし)';
    e.allDay = !!e.allDay;
    e.location = e.location || '';
    e.notes = e.notes || '';
    e.rrule = e.rrule || '';
    e.exdates = e.exdates || [];
    if (e.allDay) {
      e.start = e.start.slice(0, 10);
      e.end = (e.end || e.start).slice(0, 10);
      if (e.end < e.start) e.end = e.start;
    } else {
      if (e.start.length === 10) e.start += 'T00:00';
      if (!e.end || e.end.length === 10) e.end = e.start;
      if (toDate(e.end) < toDate(e.start)) e.end = e.start;
    }
    return e;
  }

  function upsertEvent(ev) {
    var s = get();
    var e = normalize(ev);
    var i = s.events.findIndex(function (x) { return x.id === e.id; });
    if (i >= 0) s.events[i] = e; else s.events.push(e);
    save();
    return e;
  }

  function removeEvent(id) {
    var s = get();
    s.events = s.events.filter(function (e) { return e.id !== id; });
    save();
  }

  /* 繰り返し予定のうち 1 回分だけを除外する */
  function excludeOccurrence(id, occStart) {
    var s = get();
    var ev = s.events.filter(function (e) { return e.id === id; })[0];
    if (!ev) return;
    ev.exdates = ev.exdates || [];
    if (ev.exdates.indexOf(occStart) < 0) ev.exdates.push(occStart);
    save();
  }

  function eventById(id) {
    return get().events.filter(function (e) { return e.id === id; })[0] || null;
  }

  /* ---------- 繰り返しの展開 ---------- */

  var DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  function parseRule(rrule) {
    var r = {};
    String(rrule).replace(/^RRULE:/i, '').split(';').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) r[kv.slice(0, i).toUpperCase()] = kv.slice(i + 1);
    });
    return r;
  }

  function parseByDay(token) {
    var m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(String(token).trim().toUpperCase());
    if (!m) return null;
    return { ord: m[1] ? parseInt(m[1], 10) : 0, day: DAYS[m[2]] };
  }

  function untilToDate(v) {
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(String(v).trim());
    if (!m) return null;
    if (m[7]) {
      var utc = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
      return utc;
    }
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 23), +(m[5] || 59), +(m[6] || 59));
  }

  /* 月内の n 番目（負なら末尾から）の weekday を返す */
  function nthDayOfMonth(year, month, weekday, ord) {
    if (ord > 0) {
      var first = new Date(year, month, 1).getDay();
      var day = 1 + ((weekday - first + 7) % 7) + (ord - 1) * 7;
      var last = new Date(year, month + 1, 0).getDate();
      return day <= last ? new Date(year, month, day) : null;
    }
    var lastDate = new Date(year, month + 1, 0);
    var lastDow = lastDate.getDay();
    var d = lastDate.getDate() - ((lastDow - weekday + 7) % 7) + (ord + 1) * 7;
    return d >= 1 ? new Date(year, month, d) : null;
  }

  /* 指定期間に含まれる開始日時（Date）の配列を返す */
  function occurrenceStarts(ev, rangeStart, rangeEnd) {
    var dtstart = toDate(ev.start);
    if (!ev.rrule) {
      return [dtstart];
    }

    var r = parseRule(ev.rrule);
    var freq = (r.FREQ || '').toUpperCase();
    if (!freq) return [dtstart];

    var interval = Math.max(1, parseInt(r.INTERVAL || '1', 10) || 1);
    var count = r.COUNT ? parseInt(r.COUNT, 10) : null;
    var until = r.UNTIL ? untilToDate(r.UNTIL) : null;
    var byday = r.BYDAY ? r.BYDAY.split(',').map(parseByDay).filter(Boolean) : null;
    var bymonthday = r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number).filter(function (n) { return !!n; }) : null;
    var bymonth = r.BYMONTH ? r.BYMONTH.split(',').map(Number).filter(function (n) { return !!n; }) : null;
    var wkst = r.WKST && DAYS[r.WKST.toUpperCase()] != null ? DAYS[r.WKST.toUpperCase()] : 1;

    var hardEnd = until && until < rangeEnd ? until : rangeEnd;
    var h = dtstart.getHours(), mi = dtstart.getMinutes();

    var out = [];
    var produced = 0;
    var stop = false;
    var MAX_PERIODS = 4000;

    /* COUNT が無い場合は範囲手前まで一気に進める */
    function fastForward() {
      if (count) return 0;
      var k = 0;
      if (freq === 'DAILY') {
        k = Math.floor((startOfDay(rangeStart) - startOfDay(dtstart)) / 86400000 / interval) - 1;
      } else if (freq === 'WEEKLY') {
        k = Math.floor((startOfDay(rangeStart) - startOfDay(dtstart)) / (86400000 * 7 * interval)) - 1;
      } else if (freq === 'MONTHLY') {
        k = Math.floor(monthDiff(dtstart, rangeStart) / interval) - 1;
      } else if (freq === 'YEARLY') {
        k = Math.floor((rangeStart.getFullYear() - dtstart.getFullYear()) / interval) - 1;
      }
      return Math.max(0, k);
    }

    function emit(d) {
      if (stop) return;
      if (d < startOfDay(dtstart)) return;
      var at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi, 0, 0);
      if (at < dtstart) return;
      produced++;
      if (count && produced > count) { stop = true; return; }
      if (until && at > until) { stop = true; return; }
      if (at > rangeEnd) return;
      if (at >= rangeStart) out.push(at);
    }

    var k = fastForward();
    if (k > 0) produced = 0; /* 早送り時は COUNT 未指定なので件数管理は不要 */

    for (var iter = 0; iter < MAX_PERIODS && !stop; iter++, k++) {
      var cands = [];
      if (freq === 'DAILY') {
        var d0 = addDays(startOfDay(dtstart), k * interval);
        if (d0 > hardEnd) break;
        if ((!bymonth || bymonth.indexOf(d0.getMonth() + 1) >= 0) &&
            (!byday || byday.some(function (b) { return b.day === d0.getDay(); }))) cands.push(d0);
      } else if (freq === 'WEEKLY') {
        var base = startOfDay(dtstart);
        var shift = (base.getDay() - wkst + 7) % 7;
        var weekStart = addDays(base, -shift + k * 7 * interval);
        if (weekStart > hardEnd) break;
        var days = byday ? byday.map(function (b) { return b.day; }) : [dtstart.getDay()];
        days.slice().sort().forEach(function (wd) {
          var off = (wd - wkst + 7) % 7;
          var d = addDays(weekStart, off);
          if (!bymonth || bymonth.indexOf(d.getMonth() + 1) >= 0) cands.push(d);
        });
      } else if (freq === 'MONTHLY') {
        var mBase = new Date(dtstart.getFullYear(), dtstart.getMonth() + k * interval, 1);
        if (mBase > hardEnd) break;
        cands = monthCandidates(mBase.getFullYear(), mBase.getMonth(), byday, bymonthday, dtstart);
        if (bymonth) cands = cands.filter(function (d) { return bymonth.indexOf(d.getMonth() + 1) >= 0; });
      } else if (freq === 'YEARLY') {
        var year = dtstart.getFullYear() + k * interval;
        if (new Date(year, 0, 1) > hardEnd) break;
        var months = bymonth || [dtstart.getMonth() + 1];
        months.forEach(function (mo) {
          cands = cands.concat(monthCandidates(year, mo - 1, byday, bymonthday, dtstart));
        });
      } else {
        return [dtstart];
      }

      cands.sort(function (a, b) { return a - b; });
      cands.forEach(emit);
    }

    return out;
  }

  function monthCandidates(year, month, byday, bymonthday, dtstart) {
    var res = [];
    var lastDay = new Date(year, month + 1, 0).getDate();
    if (byday && byday.length) {
      byday.forEach(function (b) {
        if (b.ord) {
          var d = nthDayOfMonth(year, month, b.day, b.ord);
          if (d) res.push(d);
        } else {
          for (var day = 1; day <= lastDay; day++) {
            var dd = new Date(year, month, day);
            if (dd.getDay() === b.day && (!bymonthday || bymonthday.indexOf(day) >= 0)) res.push(dd);
          }
        }
      });
    } else if (bymonthday && bymonthday.length) {
      bymonthday.forEach(function (n) {
        var day = n > 0 ? n : lastDay + 1 + n;
        if (day >= 1 && day <= lastDay) res.push(new Date(year, month, day));
      });
    } else {
      var day2 = dtstart.getDate();
      if (day2 <= lastDay) res.push(new Date(year, month, day2));
    }
    return res;
  }

  function isExcluded(ev, startDate) {
    if (!ev.exdates || !ev.exdates.length) return false;
    var ds = dateStr(startDate);
    var full = ds + 'T' + pad(startDate.getHours()) + ':' + pad(startDate.getMinutes());
    return ev.exdates.some(function (x) {
      return x === full || x === ds || String(x).slice(0, 10) === ds;
    });
  }

  /* 期間内の予定を日付ごとにまとめて返す
   * → { 'YYYY-MM-DD': [occurrence, …] } */
  function occurrencesByDate(from, to) {
    var s = get();
    var visible = {};
    s.calendars.forEach(function (c) { visible[c.id] = c.visible !== false; });

    var rangeStart = startOfDay(from);
    var rangeEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
    var map = {};

    s.events.forEach(function (ev) {
      if (visible[ev.calendarId] === false) return;
      var cal = calendarById(ev.calendarId);
      var startD = toDate(ev.start);
      var endD = toDate(ev.end);
      var spanDays = Math.max(0, Math.round((startOfDay(endD) - startOfDay(startD)) / 86400000));
      /* 期間の長い予定も拾えるよう検索開始を前倒しする */
      var searchStart = addDays(rangeStart, -Math.min(spanDays, 400));

      var starts = occurrenceStarts(ev, searchStart, rangeEnd);
      starts.forEach(function (st) {
        if (isExcluded(ev, st)) return;
        var days = spanDays;
        var occStart = st;
        var occEnd = new Date(st.getFullYear(), st.getMonth(), st.getDate() + days,
          endD.getHours(), endD.getMinutes());

        for (var i = 0; i <= days; i++) {
          var day = addDays(startOfDay(occStart), i);
          if (day < rangeStart || day > rangeEnd) continue;
          var key = dateStr(day);
          (map[key] || (map[key] = [])).push({
            event: ev,
            calendar: cal,
            color: ev.color || (cal && cal.color) || PALETTE[0],
            date: key,
            occStart: occStart,
            occEnd: occEnd,
            occStartLocal: ev.allDay ? dateStr(occStart)
              : dateStr(occStart) + 'T' + pad(occStart.getHours()) + ':' + pad(occStart.getMinutes()),
            allDay: ev.allDay,
            multiDay: days > 0,
            isFirst: i === 0,
            isLast: i === days,
            recurring: !!ev.rrule
          });
        }
      });
    });

    Object.keys(map).forEach(function (k) {
      map[k].sort(function (a, b) {
        var am = (a.allDay || a.multiDay) ? 0 : 1;
        var bm = (b.allDay || b.multiDay) ? 0 : 1;
        if (am !== bm) return am - bm;
        if (am === 0) return (b.occEnd - b.occStart) - (a.occEnd - a.occStart) ||
          a.event.title.localeCompare(b.event.title, 'ja');
        return a.occStart - b.occStart || a.event.title.localeCompare(b.event.title, 'ja');
      });
    });

    return map;
  }

  function reset() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    save();
  }

  global.Store = {
    PALETTE: PALETTE,
    load: load, save: save, get: get, reset: reset,
    uid: uid,
    calendarById: calendarById, addCalendar: addCalendar, removeCalendar: removeCalendar,
    upsertEvent: upsertEvent, removeEvent: removeEvent, eventById: eventById,
    excludeOccurrence: excludeOccurrence,
    occurrencesByDate: occurrencesByDate,
    occurrenceStarts: occurrenceStarts,
    toDate: toDate, dateStr: dateStr, addDays: addDays, startOfDay: startOfDay
  };
})(window);
