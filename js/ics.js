/* iCalendar (RFC 5545) の読み書き。
 * iPhone / iCloud / Google カレンダー等が書き出す .ics を対象にした軽量実装。 */
(function (global) {
  'use strict';

  /* ---------- 文字列ユーティリティ ---------- */

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* 折り返し（行頭の空白による継続行）を戻して 1 行にする */
  function unfold(text) {
    return String(text)
      .replace(/^﻿/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n[ \t]/g, '');
  }

  /* TEXT 値のエスケープ解除 */
  function unescapeText(v) {
    return v.replace(/\\([\;,nN])/g, function (_, c) {
      return (c === 'n' || c === 'N') ? '\n' : c;
    });
  }

  function escapeText(v) {
    return String(v == null ? '' : v)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /* 75 オクテットで折り返す（実用上は文字数で十分） */
  function fold(line) {
    if (line.length <= 73) return line;
    var out = line.slice(0, 73);
    var rest = line.slice(73);
    while (rest.length > 72) {
      out += '\r\n ' + rest.slice(0, 72);
      rest = rest.slice(72);
    }
    return out + (rest ? '\r\n ' + rest : '');
  }

  /* "DTSTART;TZID=Asia/Tokyo:20260101T090000" を分解する */
  function parseLine(line) {
    var i = 0, inQuote = false;
    for (; i < line.length; i++) {
      var c = line[i];
      if (c === '"') inQuote = !inQuote;
      else if (c === ':' && !inQuote) break;
    }
    if (i >= line.length) return null;
    var head = line.slice(0, i);
    var value = line.slice(i + 1);
    var parts = splitUnquoted(head, ';');
    var name = parts.shift().toUpperCase();
    var params = {};
    parts.forEach(function (p) {
      var eq = p.indexOf('=');
      if (eq < 0) return;
      var k = p.slice(0, eq).toUpperCase();
      var v = p.slice(eq + 1).replace(/^"|"$/g, '');
      params[k] = v;
    });
    return { name: name, params: params, value: value };
  }

  function splitUnquoted(s, sep) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '"') { q = !q; cur += c; }
      else if (c === sep && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }

  /* ---------- 日時の解釈 ---------- */

  /* タイムゾーン tz における「その瞬間」の UTC からのオフセット(ms) */
  function tzOffset(tz, date) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var p = {};
    dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day,
      (+p.hour) % 24, +p.minute, +p.second);
    return asUTC - date.getTime();
  }

  /* tz の壁時計時刻 → Date（実時刻） */
  function zonedToDate(y, mo, d, h, mi, s, tz) {
    var guess = Date.UTC(y, mo - 1, d, h, mi, s);
    var off = tzOffset(tz, new Date(guess));
    off = tzOffset(tz, new Date(guess - off));
    return new Date(guess - off);
  }

  function knownZone(tz) {
    if (!tz) return false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; }
    catch (e) { return false; }
  }

  /* ICS の日時値 → { date:Date|null, allDay:bool, local:'YYYY-MM-DD[THH:MM]' } */
  function parseDateValue(value, params) {
    var v = String(value).trim();
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var isDate = !m[4] || (params && params.VALUE === 'DATE');
    if (isDate) {
      return { allDay: true, local: y + '-' + pad(mo) + '-' + pad(d), date: new Date(y, mo - 1, d) };
    }
    var h = +m[4], mi = +m[5], s = +m[6];
    var date;
    if (m[7]) {
      date = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
    } else if (params && params.TZID && knownZone(params.TZID)) {
      date = zonedToDate(y, mo, d, h, mi, s, params.TZID);
    } else {
      /* フローティング時刻・未知の TZID は端末のローカル時刻として扱う */
      date = new Date(y, mo - 1, d, h, mi, s);
    }
    return { allDay: false, date: date, local: localString(date) };
  }

  function localString(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }
  function localDateString(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  /* ---------- パース本体 ---------- */

  /* .ics テキスト → { name, events:[…], skipped } */
  function parse(text) {
    var lines = unfold(text).split('\n');
    var stack = [];
    var calName = '';
    var events = [];
    var cur = null;
    var skipped = 0;
    var alarmDepth = 0;

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!raw.trim()) continue;
      var ln = parseLine(raw);
      if (!ln) continue;

      if (ln.name === 'BEGIN') {
        stack.push(ln.value.toUpperCase());
        if (ln.value.toUpperCase() === 'VEVENT') cur = { props: {}, exdates: [] };
        if (ln.value.toUpperCase() === 'VALARM') alarmDepth++;
        continue;
      }
      if (ln.name === 'END') {
        var ended = stack.pop();
        if (ended === 'VALARM') alarmDepth--;
        if (ended === 'VEVENT' && cur) {
          var ev = toEvent(cur);
          if (ev) events.push(ev); else skipped++;
          cur = null;
        }
        continue;
      }
      if (alarmDepth > 0) continue;

      var top = stack[stack.length - 1];
      if (top === 'VCALENDAR' && (ln.name === 'X-WR-CALNAME' || ln.name === 'NAME')) {
        calName = unescapeText(ln.value);
      }
      if (top !== 'VEVENT' || !cur) continue;

      if (ln.name === 'EXDATE') {
        splitUnquoted(ln.value, ',').forEach(function (v) {
          var p = parseDateValue(v, ln.params);
          if (p) cur.exdates.push(p.local);
        });
      } else {
        cur.props[ln.name] = { value: ln.value, params: ln.params };
      }
    }

    return { name: calName, events: events, skipped: skipped };
  }

  function prop(c, name) { return c.props[name] ? c.props[name].value : ''; }

  function toEvent(c) {
    var dtstartProp = c.props.DTSTART;
    if (!dtstartProp) return null;
    var start = parseDateValue(dtstartProp.value, dtstartProp.params);
    if (!start) return null;

    var end = null;
    if (c.props.DTEND) end = parseDateValue(c.props.DTEND.value, c.props.DTEND.params);
    else if (c.props.DURATION) end = applyDuration(start, c.props.DURATION.value);

    var allDay = start.allDay;
    var startLocal = start.local;
    var endLocal;

    if (allDay) {
      /* DTEND は排他的なので 1 日戻して「最終日」にする */
      if (end) {
        var e = new Date(end.date.getTime());
        if (end.allDay) e.setDate(e.getDate() - 1);
        endLocal = localDateString(e < start.date ? start.date : e);
      } else {
        endLocal = startLocal;
      }
    } else {
      endLocal = end ? (end.allDay ? start.local : end.local) : start.local;
      if (endLocal < startLocal) endLocal = startLocal;
    }

    var rrule = '';
    if (c.props.RRULE) rrule = String(c.props.RRULE.value).trim().toUpperCase();

    return {
      uid: unescapeText(prop(c, 'UID')) || '',
      title: unescapeText(prop(c, 'SUMMARY')) || '(タイトルなし)',
      location: unescapeText(prop(c, 'LOCATION')),
      notes: unescapeText(prop(c, 'DESCRIPTION')),
      allDay: allDay,
      start: startLocal,
      end: endLocal,
      rrule: rrule,
      exdates: c.exdates,
      recurrenceId: c.props['RECURRENCE-ID'] ? String(c.props['RECURRENCE-ID'].value) : ''
    };
  }

  /* DURATION（P1DT2H 等）を開始に足して終了を求める */
  function applyDuration(start, dur) {
    var m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(dur).trim());
    if (!m || !start.date) return null;
    var sign = m[1] === '-' ? -1 : 1;
    var ms = ((+m[2] || 0) * 604800 + (+m[3] || 0) * 86400 +
      (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0)) * 1000 * sign;
    var d = new Date(start.date.getTime() + ms);
    return start.allDay
      ? { allDay: true, date: d, local: localDateString(d) }
      : { allDay: false, date: d, local: localString(d) };
  }

  /* ---------- 書き出し ---------- */

  function icsStamp(local, allDay) {
    if (allDay) return local.replace(/-/g, '');
    return local.replace(/[-:]/g, '') + '00';
  }

  function build(events, calName) {
    var out = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Calendar Web App//JA//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + escapeText(calName || 'カレンダー'),
      'X-WR-TIMEZONE:' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo')
    ];
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) +
      'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    events.forEach(function (ev) {
      var lines = ['BEGIN:VEVENT'];
      lines.push('UID:' + (ev.uid || ev.id + '@calendar-web-app'));
      lines.push('DTSTAMP:' + stamp);
      if (ev.allDay) {
        var endEx = new Date(ev.end + 'T00:00:00');
        endEx.setDate(endEx.getDate() + 1);
        lines.push('DTSTART;VALUE=DATE:' + icsStamp(ev.start, true));
        lines.push('DTEND;VALUE=DATE:' + localDateString(endEx).replace(/-/g, ''));
      } else {
        var p = tz ? ';TZID=' + tz : '';
        lines.push('DTSTART' + p + ':' + icsStamp(ev.start, false));
        lines.push('DTEND' + p + ':' + icsStamp(ev.end, false));
      }
      lines.push('SUMMARY:' + escapeText(ev.title));
      if (ev.location) lines.push('LOCATION:' + escapeText(ev.location));
      if (ev.notes) lines.push('DESCRIPTION:' + escapeText(ev.notes));
      if (ev.rrule) lines.push('RRULE:' + ev.rrule);
      (ev.exdates || []).forEach(function (x) {
        lines.push('EXDATE' + (ev.allDay ? ';VALUE=DATE' : '') + ':' + icsStamp(x, ev.allDay));
      });
      lines.push('END:VEVENT');
      out = out.concat(lines);
    });

    out.push('END:VCALENDAR');
    return out.map(fold).join('\r\n') + '\r\n';
  }

  global.ICS = {
    parse: parse,
    build: build,
    unfold: unfold,
    escapeText: escapeText,
    localString: localString,
    localDateString: localDateString
  };
})(window);
