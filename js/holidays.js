/* 日本の祝日（1980〜2099年ごろまで有効）
 * 「国民の祝日に関する法律」に基づく計算。振替休日・国民の休日にも対応する。 */
(function (global) {
  'use strict';

  var MON = 1;

  function ymd(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dow(y, m, d) { return new Date(y, m - 1, d).getDay(); }

  /* その月の n 回目の weekday の日付 */
  function nthWeekday(y, m, weekday, n) {
    var first = dow(y, m, 1);
    return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  }

  /* 春分日・秋分日（近似式：1980-2099 で実用上一致する） */
  function vernal(y) {
    return Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
  }
  function autumnal(y) {
    return Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
  }

  var cache = {};

  /* 指定年の祝日一覧を { 'YYYY-MM-DD': '名称' } で返す */
  function forYear(y) {
    if (cache[y]) return cache[y];
    var h = {};
    function set(m, d, name) { h[ymd(y, m, d)] = name; }

    set(1, 1, '元日');
    set(1, nthWeekday(y, 1, MON, 2), '成人の日');
    set(2, 11, '建国記念の日');
    if (y >= 2020) set(2, 23, '天皇誕生日');
    set(3, vernal(y), '春分の日');
    set(4, 29, '昭和の日');
    set(5, 3, '憲法記念日');
    set(5, 4, 'みどりの日');
    set(5, 5, 'こどもの日');

    /* 海の日：2021年は五輪特例で 7/22 */
    if (y === 2021) set(7, 22, '海の日');
    else set(7, nthWeekday(y, 7, MON, 3), '海の日');

    /* 山の日：2016年から。2021年は五輪特例で 8/8 */
    if (y === 2021) set(8, 8, '山の日');
    else if (y >= 2016) set(8, 11, '山の日');

    set(9, nthWeekday(y, 9, MON, 3), '敬老の日');
    set(9, autumnal(y), '秋分の日');

    /* 体育の日／スポーツの日：2020年は 7/24、2021年は 7/23 の特例 */
    if (y === 2020) set(7, 24, 'スポーツの日');
    else if (y === 2021) set(7, 23, 'スポーツの日');
    else h[ymd(y, 10, nthWeekday(y, 10, MON, 2))] = (y >= 2020 ? 'スポーツの日' : '体育の日');

    set(11, 3, '文化の日');
    set(11, 23, '勤労感謝の日');
    if (y <= 2018) set(12, 23, '天皇誕生日');
    if (y === 2019) { set(5, 1, '天皇の即位の日'); set(10, 22, '即位礼正殿の儀の行われる日'); }

    /* 振替休日：日曜と重なったら、次の平日を休日にする */
    var keys = Object.keys(h).sort();
    keys.forEach(function (k) {
      var p = k.split('-').map(Number);
      if (dow(p[0], p[1], p[2]) !== 0) return;
      var d = new Date(p[0], p[1] - 1, p[2]);
      do { d.setDate(d.getDate() + 1); } while (h[iso(d)]);
      h[iso(d)] = '振替休日';
    });

    /* 国民の休日：祝日に挟まれた平日 */
    Object.keys(h).sort().forEach(function (k) {
      var p = k.split('-').map(Number);
      var prev = new Date(p[0], p[1] - 1, p[2]);
      var mid = new Date(p[0], p[1] - 1, p[2] + 1);
      var next = new Date(p[0], p[1] - 1, p[2] + 2);
      if (h[iso(mid)] || !h[iso(next)]) return;
      if (mid.getDay() === 0 || mid.getDay() === 6) return;
      if (!h[iso(prev)]) return;
      h[iso(mid)] = '国民の休日';
    });

    cache[y] = h;
    return h;
  }

  function iso(d) { return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()); }

  /* 'YYYY-MM-DD' → 祝日名 or null */
  function nameOf(dateStr) {
    var y = Number(dateStr.slice(0, 4));
    if (!y) return null;
    return forYear(y)[dateStr] || null;
  }

  global.Holidays = { forYear: forYear, nameOf: nameOf };
})(window);
