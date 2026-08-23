/* 日本の祝日（1980〜2099年ごろまで有効）
 * 「国民の祝日に関する法律」に基づく計算。振替休日・国民の休日にも対応する。
 * 日付には言語に依存しないキーを持たせ、表示名は NAMES から引く。 */
(function (global) {
  'use strict';

  var NAMES = {
    ja: {
      newYear: '元日', comingOfAge: '成人の日', foundation: '建国記念の日',
      emperor: '天皇誕生日', vernal: '春分の日', showa: '昭和の日',
      constitution: '憲法記念日', greenery: 'みどりの日', children: 'こどもの日',
      marine: '海の日', mountain: '山の日', respectAged: '敬老の日',
      autumnal: '秋分の日', sports: 'スポーツの日', healthSports: '体育の日',
      culture: '文化の日', laborThanks: '勤労感謝の日',
      substitute: '振替休日', national: '国民の休日',
      enthronementDay: '天皇の即位の日', enthronementCeremony: '即位礼正殿の儀の行われる日'
    },
    en: {
      newYear: "New Year's Day", comingOfAge: 'Coming of Age Day', foundation: 'National Foundation Day',
      emperor: "The Emperor's Birthday", vernal: 'Vernal Equinox Day', showa: 'Shōwa Day',
      constitution: 'Constitution Memorial Day', greenery: 'Greenery Day', children: "Children's Day",
      marine: 'Marine Day', mountain: 'Mountain Day', respectAged: 'Respect for the Aged Day',
      autumnal: 'Autumnal Equinox Day', sports: 'Sports Day', healthSports: 'Health and Sports Day',
      culture: 'Culture Day', laborThanks: 'Labor Thanksgiving Day',
      substitute: 'Substitute Holiday', national: 'National Holiday',
      enthronementDay: 'Enthronement Day', enthronementCeremony: 'Enthronement Ceremony Day'
    }
  };

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

    set(1, 1, 'newYear');
    set(1, nthWeekday(y, 1, MON, 2), 'comingOfAge');
    set(2, 11, 'foundation');
    if (y >= 2020) set(2, 23, 'emperor');
    set(3, vernal(y), 'vernal');
    set(4, 29, 'showa');
    set(5, 3, 'constitution');
    set(5, 4, 'greenery');
    set(5, 5, 'children');

    /* 海の日：2021年は五輪特例で 7/22 */
    if (y === 2021) set(7, 22, 'marine');
    else set(7, nthWeekday(y, 7, MON, 3), 'marine');

    /* 山の日：2016年から。2021年は五輪特例で 8/8 */
    if (y === 2021) set(8, 8, 'mountain');
    else if (y >= 2016) set(8, 11, 'mountain');

    set(9, nthWeekday(y, 9, MON, 3), 'respectAged');
    set(9, autumnal(y), 'autumnal');

    /* 体育の日／スポーツの日：2020年は 7/24、2021年は 7/23 の特例 */
    if (y === 2020) set(7, 24, 'sports');
    else if (y === 2021) set(7, 23, 'sports');
    else h[ymd(y, 10, nthWeekday(y, 10, MON, 2))] = (y >= 2020 ? 'sports' : 'healthSports');

    set(11, 3, 'culture');
    set(11, 23, 'laborThanks');
    if (y <= 2018) set(12, 23, 'emperor');
    if (y === 2019) { set(5, 1, 'enthronementDay'); set(10, 22, 'enthronementCeremony'); }

    /* 振替休日：日曜と重なったら、次の平日を休日にする */
    var keys = Object.keys(h).sort();
    keys.forEach(function (k) {
      var p = k.split('-').map(Number);
      if (dow(p[0], p[1], p[2]) !== 0) return;
      var d = new Date(p[0], p[1] - 1, p[2]);
      do { d.setDate(d.getDate() + 1); } while (h[iso(d)]);
      h[iso(d)] = 'substitute';
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
      h[iso(mid)] = 'national';
    });

    cache[y] = h;
    return h;
  }

  function iso(d) { return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()); }

  /* 'YYYY-MM-DD' → 祝日のキー or null */
  function keyOf(dateStr) {
    var y = Number(dateStr.slice(0, 4));
    if (!y) return null;
    return forYear(y)[dateStr] || null;
  }

  /* 'YYYY-MM-DD' → 表示名 or null */
  function nameOf(dateStr, lang) {
    var key = keyOf(dateStr);
    if (!key) return null;
    var table = NAMES[lang] || NAMES.ja;
    return table[key] || NAMES.ja[key] || key;
  }

  global.Holidays = { forYear: forYear, keyOf: keyOf, nameOf: nameOf, NAMES: NAMES };
})(window);
