/* 日本語 / 英語の切り替え。既定は日本語。 */
(function (global) {
  'use strict';

  var DICT = {
    ja: {
      'app.name': 'カレンダー',
      'nav.prev': '前へ',
      'nav.next': '次へ',
      'nav.today': '今日',
      'nav.month': '月を選択',
      'nav.prevTitle': '前へ (←)',
      'nav.nextTitle': '今日 (T)',
      'view.group': '表示の切り替え',
      'view.month': '月',
      'view.week': '週',
      'view.monthTitle': '月表示 (M)',
      'view.weekTitle': '週の時刻表示 (W)',

      'btn.add': '＋',
      'btn.addLabel': ' 予定を追加',
      'btn.addTitle': '予定を追加 (N)',
      'btn.import': 'インポート',
      'btn.export': '書き出し',
      'btn.calendars': 'カレンダー',
      'btn.print': '印刷',
      'btn.printTitle': '印刷 (Ctrl/⌘+P)',
      'btn.menu': 'その他のメニュー',
      'btn.close': '閉じる',

      'cell.more': '他 {n} 件',
      'side.addToDay': '＋ この日に追加',
      'side.empty': '予定はありません。',
      'side.calendars': 'カレンダー',
      'side.edit': '編集',
      'side.delete': '削除',
      'status.storage': 'データはこのブラウザ内（localStorage）に保存されます',

      'ev.add': '予定を追加',
      'ev.edit': '予定を編集',
      'ev.title': 'タイトル',
      'ev.titlePh': '例）打ち合わせ',
      'ev.allDay': '終日',
      'ev.repeat': '繰り返し',
      'ev.start': '開始',
      'ev.end': '終了',
      'ev.repeatSet': '繰り返し設定',
      'ev.until': '終了日',
      'ev.calendar': 'カレンダー',
      'ev.color': '色',
      'ev.location': '場所',
      'ev.notes': 'メモ',
      'ev.delete': '削除',
      'ev.cancel': 'キャンセル',
      'ev.save': '保存',
      'ev.errRange': '終了日時は開始日時より後にしてください。',

      'rep.none': 'なし',
      'rep.daily': '毎日',
      'rep.weekly': '毎週',
      'rep.biweekly': '隔週',
      'rep.monthlyDate': '毎月（同じ日）',
      'rep.monthlyDay': '毎月（同じ曜日）',
      'rep.yearly': '毎年',

      'imp.title': 'カレンダーをインポート',
      'imp.dropLabel': 'ICS ファイルを選択またはドロップ',
      'imp.dropStrong': '.ics ファイルを選ぶ',
      'imp.dropHint': 'タップ／クリックで選択（複数可）。パソコンではここにドロップもできます',
      'imp.howto': 'iPhone のカレンダーを書き出す方法',
      'imp.howtoBody':
        '<ol>' +
        '<li><strong>iCloud から（おすすめ・全予定）</strong><br>' +
        'iPhone の「設定 → Apple ID → iCloud → カレンダー」をオンにし、パソコンの' +
        '<em>Mac のカレンダー.app</em> で「ファイル → 書き出す → 書き出す…」から <code>.ics</code> を保存します。</li>' +
        '<li><strong>iPhone だけで（共有カレンダー）</strong><br>' +
        'カレンダー App → 「カレンダー」→ 対象カレンダーの ⓘ → 「公開カレンダー」をオン → URL をコピー。' +
        'その URL の <code>webcal://</code> を <code>https://</code> に変えてブラウザで開くと <code>.ics</code> が保存できます。' +
        '下の「URL から読み込む」に貼り付けても構いません。</li>' +
        '<li><strong>1 件だけ</strong><br>' +
        '予定を開く → 共有ボタン →「メールで送信」等。添付の <code>.ics</code> をこの画面で選びます。</li>' +
        '</ol>',
      'imp.urlLabel': 'URL から読み込む（webcal:// / https:// の公開カレンダー）',
      'imp.load': '読み込む',
      'imp.corsNote': 'iCloud の公開カレンダーなどは、ブラウザから直接は読み込めません（CORS）。Node の Web Service として動かしている場合は、サーバー経由で取得します。取得できないときは URL をブラウザで開いて .ics を保存し、上で選んでください。',
      'imp.preview': '読み込み内容',
      'imp.name': 'カレンダー名',
      'imp.color': '色',
      'imp.target': '取り込み先',
      'imp.dedupe': '同じ予定（UID）が既にある場合は上書きする',
      'imp.commit': '取り込む',
      'imp.newCal': '新しいカレンダーとして追加',
      'imp.addTo': '{name} に追加',
      'imp.none': '予定が見つかりませんでした。iCalendar 形式（.ics）のファイルか確認してください。',
      'imp.events': '予定 {n} 件',
      'imp.range': '期間 {from} 〜 {to}',
      'imp.recurring': '繰り返し予定 {n} 件',
      'imp.skipped': '読み取れなかった項目 {n} 件',
      'imp.example': '例: {list}',
      'imp.loading': '読み込み中…',
      'imp.fetchError': 'URL から取得できませんでした（{msg}）。URL をブラウザで直接開いて .ics を保存し、この画面で選んでください。',
      'imp.relayTry': 'サーバー経由で取得しています…',
      'imp.noRelay': 'この配信元（{host}）は、ブラウザから直接読み込めません（CORS）。iCloud の公開カレンダーはこの制限があります。\n中継できるサーバー（Node の Web Service）で動かしている場合は取り込めます。今は URL をブラウザで開いて .ics を保存し、この画面で選んでください。',
      'imp.relayHostBlocked': 'この配信元（{host}）は中継の許可一覧にありません。サーバーの環境変数 ICS_PROXY_ALLOW に追加してください。',
      'imp.relayError': 'サーバー経由でも取得できませんでした（{msg}）。URL が公開カレンダーのものか確認してください。',
      'imp.done': 'インポート完了：追加 {added} 件',
      'imp.doneUpdated': ' / 更新 {n} 件',
      'imp.icloudName': 'iCloud カレンダー',

      'cal.title': 'カレンダー',
      'cal.newName': '新しいカレンダー名',
      'cal.add': '追加',
      'cal.lang': '言語 / Language',
      'cal.optHolidays': '日本の祝日を表示する',
      'cal.optWeekStart': '週の開始を月曜にする',
      'cal.wipe': 'すべてのデータを削除',
      'cal.count': '{n} 件',
      'cal.imported': '・インポート',
      'cal.default': 'マイカレンダー',
      'cal.new': '新しいカレンダー',
      'cal.importedName': 'インポートしたカレンダー',
      'cal.exportName': 'カレンダー',
      'cal.autoColor': '自',
      'cal.autoColorTitle': 'カレンダーの色',
      'cal.lastOne': '最後のカレンダーは削除できません。',
      'cal.confirmDelete': '「{name}」と、その中の {n} 件の予定を削除します。よろしいですか？',
      'cal.confirmWipe': '保存されているすべての予定とカレンダーを削除します。元に戻せません。よろしいですか？',
      'cal.visible': '表示',

      'prt.title': '印刷',
      'prt.desc': '表示中の {month} を 1 ページに印刷します。',
      'prt.orient': '用紙の向き',
      'prt.landscape': '横',
      'prt.portrait': '縦',
      'prt.times': '開始時刻を表示する',
      'prt.loc': '場所を表示する',
      'prt.colors': '予定の色を印刷する',
      'prt.mono': '白黒（枠線のみ）で印刷する',
      'prt.note': 'プリンタの設定で「背景のグラフィック」を有効にすると色が印刷されます。',
      'prt.cancel': 'キャンセル',
      'prt.go': '印刷する',
      'prt.printedOn': '出力日: {date}',

      'msg.added': '予定を追加しました',
      'msg.updated': '予定を更新しました',
      'msg.deleted': '予定を削除しました',
      'msg.moved': '「{title}」を {date} に移動しました',
      'msg.noDragRecurring': '繰り返し予定はドラッグで移動できません',
      'msg.exported': '{n} 件を .ics に書き出しました',
      'msg.nothingToExport': '書き出す予定がありません',
      'msg.wiped': 'データを削除しました',

      'cf.deleteRecurring': '繰り返し予定です。\n[OK] すべての回を削除\n[キャンセル] この日（{date}）だけ削除',
      'cf.delete': '「{title}」を削除しますか？',

      'common.untitled': '(タイトルなし)',
      'common.allDay': '終日',
      'common.locationMark': '📍 ',

      'wd': ['日', '月', '火', '水', '木', '金', '土'],
      'lang.name': '日本語',
      'lang.other': 'English'
    },

    en: {
      'app.name': 'Calendar',
      'nav.prev': 'Previous',
      'nav.next': 'Next',
      'nav.today': 'Today',
      'nav.month': 'Choose month',
      'nav.prevTitle': 'Previous (←)',
      'nav.nextTitle': 'Today (T)',
      'view.group': 'Switch view',
      'view.month': 'Month',
      'view.week': 'Week',
      'view.monthTitle': 'Month view (M)',
      'view.weekTitle': 'Week view with times (W)',

      'btn.add': '+',
      'btn.addLabel': ' New event',
      'btn.addTitle': 'New event (N)',
      'btn.import': 'Import',
      'btn.export': 'Export',
      'btn.calendars': 'Calendars',
      'btn.print': 'Print',
      'btn.printTitle': 'Print (Ctrl/⌘+P)',
      'btn.menu': 'More',
      'btn.close': 'Close',

      'cell.more': '{n} more',
      'side.addToDay': '+ Add on this day',
      'side.empty': 'No events.',
      'side.calendars': 'Calendars',
      'side.edit': 'Edit',
      'side.delete': 'Delete',
      'status.storage': 'Your data stays in this browser (localStorage)',

      'ev.add': 'New event',
      'ev.edit': 'Edit event',
      'ev.title': 'Title',
      'ev.titlePh': 'e.g. Team meeting',
      'ev.allDay': 'All-day',
      'ev.repeat': 'Repeat',
      'ev.start': 'Starts',
      'ev.end': 'Ends',
      'ev.repeatSet': 'Repeat settings',
      'ev.until': 'Until',
      'ev.calendar': 'Calendar',
      'ev.color': 'Color',
      'ev.location': 'Location',
      'ev.notes': 'Notes',
      'ev.delete': 'Delete',
      'ev.cancel': 'Cancel',
      'ev.save': 'Save',
      'ev.errRange': 'The end must be after the start.',

      'rep.none': 'None',
      'rep.daily': 'Every day',
      'rep.weekly': 'Every week',
      'rep.biweekly': 'Every 2 weeks',
      'rep.monthlyDate': 'Every month (same date)',
      'rep.monthlyDay': 'Every month (same weekday)',
      'rep.yearly': 'Every year',

      'imp.title': 'Import a calendar',
      'imp.dropLabel': 'Choose or drop an ICS file',
      'imp.dropStrong': 'Choose an .ics file',
      'imp.dropHint': 'Tap or click to choose (multiple files allowed). On a computer you can also drop files here.',
      'imp.howto': 'How to export your iPhone calendar',
      'imp.howtoBody':
        '<ol>' +
        '<li><strong>Through iCloud (recommended, all events)</strong><br>' +
        'On the iPhone turn on Settings → Apple ID → iCloud → Calendars, then on a Mac open ' +
        '<em>Calendar.app</em> and choose File → Export → Export… to save an <code>.ics</code> file.</li>' +
        '<li><strong>From the iPhone alone (public calendar)</strong><br>' +
        'Calendar app → “Calendars” → tap ⓘ next to the calendar → turn on “Public Calendar” → copy the URL. ' +
        'Replace <code>webcal://</code> with <code>https://</code> and open it in a browser to download the ' +
        '<code>.ics</code>, or paste it into “Load from a URL” below.</li>' +
        '<li><strong>A single event</strong><br>' +
        'Open the event → Share → send it by mail, then choose the attached <code>.ics</code> here.</li>' +
        '</ol>',
      'imp.urlLabel': 'Load from a URL (a public webcal:// or https:// calendar)',
      'imp.load': 'Load',
      'imp.corsNote': 'Publishers such as iCloud cannot be read directly by the browser (CORS). When the app runs as a Node Web Service, the server fetches the URL for you. Otherwise, open the URL in a browser, save the .ics file and choose it above.',
      'imp.preview': 'What will be imported',
      'imp.name': 'Calendar name',
      'imp.color': 'Color',
      'imp.target': 'Import into',
      'imp.dedupe': 'Replace events that already exist (same UID)',
      'imp.commit': 'Import',
      'imp.newCal': 'Add as a new calendar',
      'imp.addTo': 'Add to {name}',
      'imp.none': 'No events found. Please check that the file is in iCalendar (.ics) format.',
      'imp.events': '{n} events',
      'imp.range': 'From {from} to {to}',
      'imp.recurring': '{n} repeating events',
      'imp.skipped': '{n} entries could not be read',
      'imp.example': 'For example: {list}',
      'imp.loading': 'Loading…',
      'imp.fetchError': 'Could not load that URL ({msg}). Open the URL directly, save the .ics file and choose it here.',
      'imp.relayTry': 'Trying through the server…',
      'imp.noRelay': 'This publisher ({host}) cannot be read directly by the browser (CORS) — iCloud published calendars work this way.\nRunning the app as a Node Web Service lets the server fetch it for you. For now, open the URL in a browser, save the .ics file and choose it here.',
      'imp.relayHostBlocked': 'This publisher ({host}) is not in the relay allow list. Add it to the ICS_PROXY_ALLOW environment variable on the server.',
      'imp.relayError': 'The server could not load it either ({msg}). Please check that the URL points to a published calendar.',
      'imp.done': 'Imported: {added} added',
      'imp.doneUpdated': ' / {n} updated',
      'imp.icloudName': 'iCloud calendar',

      'cal.title': 'Calendars',
      'cal.newName': 'New calendar name',
      'cal.add': 'Add',
      'cal.lang': '言語 / Language',
      'cal.optHolidays': 'Show Japanese public holidays',
      'cal.optWeekStart': 'Start the week on Monday',
      'cal.wipe': 'Delete all data',
      'cal.count': '{n} events',
      'cal.imported': ' · imported',
      'cal.default': 'My Calendar',
      'cal.new': 'New calendar',
      'cal.importedName': 'Imported calendar',
      'cal.exportName': 'Calendar',
      'cal.autoColor': 'A',
      'cal.autoColorTitle': 'Use the calendar color',
      'cal.lastOne': 'The last calendar cannot be deleted.',
      'cal.confirmDelete': 'Delete “{name}” and the {n} events in it?',
      'cal.confirmWipe': 'This deletes every saved event and calendar. It cannot be undone. Continue?',
      'cal.visible': 'Show',

      'prt.title': 'Print',
      'prt.desc': 'Prints the current view ({month}) on one page.',
      'prt.orient': 'Orientation',
      'prt.landscape': 'Landscape',
      'prt.portrait': 'Portrait',
      'prt.times': 'Show start times',
      'prt.loc': 'Show locations',
      'prt.colors': 'Print event colors',
      'prt.mono': 'Print in black and white (outlines only)',
      'prt.note': 'Turn on “Background graphics” in your printer settings to print the colors.',
      'prt.cancel': 'Cancel',
      'prt.go': 'Print',
      'prt.printedOn': 'Printed: {date}',

      'msg.added': 'Event added',
      'msg.updated': 'Event updated',
      'msg.deleted': 'Event deleted',
      'msg.moved': '“{title}” moved to {date}',
      'msg.noDragRecurring': 'Repeating events cannot be moved by dragging',
      'msg.exported': 'Exported {n} events to .ics',
      'msg.nothingToExport': 'There is nothing to export',
      'msg.wiped': 'All data deleted',

      'cf.deleteRecurring': 'This event repeats.\n[OK] Delete every occurrence\n[Cancel] Delete only {date}',
      'cf.delete': 'Delete “{title}”?',

      'common.untitled': '(No title)',
      'common.allDay': 'All-day',
      'common.locationMark': '📍 ',

      'wd': ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      'lang.name': 'English',
      'lang.other': '日本語'
    }
  };

  var LOCALES = { ja: 'ja-JP', en: 'en-US' };
  var lang = 'ja';   /* 既定は日本語 */

  function t(key, params) {
    var table = DICT[lang] || DICT.ja;
    var v = table[key];
    if (v == null) v = DICT.ja[key];
    if (v == null) return key;
    if (typeof v === 'string' && params) {
      v = v.replace(/\{(\w+)\}/g, function (m, k) {
        return params[k] != null ? params[k] : m;
      });
    }
    return v;
  }

  function setLang(next) {
    lang = DICT[next] ? next : 'ja';
    document.documentElement.setAttribute('lang', lang);
    return lang;
  }

  function getLang() { return lang; }
  function locale() { return LOCALES[lang] || LOCALES.ja; }

  /* data-i18n 属性の付いた要素を、現在の言語で書き換える */
  function applyStatic(root) {
    var scope = root || document;
    each(scope.querySelectorAll('[data-i18n]'), function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    each(scope.querySelectorAll('[data-i18n-html]'), function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    each(scope.querySelectorAll('[data-i18n-placeholder]'), function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    each(scope.querySelectorAll('[data-i18n-title]'), function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    each(scope.querySelectorAll('[data-i18n-aria]'), function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* ---- 言語ごとの日付表記 ---- */

  /* 週の見出し（2026年8月23日〜29日 / Aug 23 – 29, 2026） */
  function weekTitle(start, end) {
    if (lang === 'ja') {
      var head = start.getFullYear() + '年' + (start.getMonth() + 1) + '月' + start.getDate() + '日';
      var tail = (start.getMonth() === end.getMonth())
        ? end.getDate() + '日'
        : (end.getMonth() + 1) + '月' + end.getDate() + '日';
      return head + '〜' + tail;
    }
    var opt = { month: 'short', day: 'numeric' };
    var a = start.toLocaleDateString(locale(), opt);
    var b = (start.getMonth() === end.getMonth())
      ? String(end.getDate())
      : end.toLocaleDateString(locale(), opt);
    return a + ' – ' + b + ', ' + end.getFullYear();
  }

  /* 幅の狭い画面向けの短い週見出し（8/16〜22 / Aug 16 – 22） */
  function weekTitleShort(start, end) {
    if (lang === 'ja') {
      var head = (start.getMonth() + 1) + '/' + start.getDate();
      var tail = (start.getMonth() === end.getMonth())
        ? String(end.getDate())
        : (end.getMonth() + 1) + '/' + end.getDate();
      return head + '〜' + tail;
    }
    var a = start.toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
    var b = (start.getMonth() === end.getMonth())
      ? String(end.getDate())
      : end.toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
    return a + ' – ' + b;
  }

  function monthTitle(date) {
    if (lang === 'ja') return date.getFullYear() + '年' + (date.getMonth() + 1) + '月';
    return date.toLocaleDateString(locale(), { year: 'numeric', month: 'long' });
  }

  function dayTitle(date) {
    if (lang === 'ja') {
      return (date.getMonth() + 1) + '月' + date.getDate() + '日（' + t('wd')[date.getDay()] + '）';
    }
    return date.toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function shortDate(date) {
    if (lang === 'ja') {
      return (date.getMonth() + 1) + '/' + date.getDate();
    }
    return date.toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
  }

  function fullDate(date) {
    return date.toLocaleDateString(locale());
  }

  global.I18n = {
    t: t,
    setLang: setLang,
    getLang: getLang,
    locale: locale,
    applyStatic: applyStatic,
    monthTitle: monthTitle,
    weekTitle: weekTitle,
    weekTitleShort: weekTitleShort,
    dayTitle: dayTitle,
    shortDate: shortDate,
    fullDate: fullDate,
    langs: ['ja', 'en']
  };
})(window);
