# Calendar Web App

[日本語](README.md)

A month-view calendar for keeping your events. It is plain HTML / CSS / JavaScript — no build step.

- **Events** — add, edit and delete; all-day and multi-day events; repeats; location and notes; several calendars; colors
- **Import from an iPhone calendar** — reads iCalendar (`.ics`) files, and can fetch a published calendar URL
- **Printing** — prints the month you are viewing on a single A4 page (portrait / landscape, times, locations, black and white)
- **Phones** — a layout made for iPhone and Android, swipe to change months, can be added to the home screen
- **日本語 / English** — the interface language can be switched (Japanese is the default)

## Getting started

Open `index.html` in a browser. Double-clicking the file works, and so does serving it over HTTP.

```sh
# for example
npx http-server -p 8080 .
# → http://127.0.0.1:8080/index.html
```

Browsers: current Chrome / Edge / Safari / Firefox, including iOS Safari and Android Chrome.
To use it from a phone, serve the folder from your computer and open it over the local network,
or put the files on any static host.

## Language (日本語 / English)

The default is **Japanese**, whatever the browser's language setting is.

- To switch: open the “Calendars” dialog → “言語 / Language”
- Your choice is stored in this browser and used the next time you open the app
- Adding `?lang=en` or `?lang=ja` to the URL opens the app in that language (and stores it)

Switching changes the interface text as well as month, weekday and date formats and the names of
the Japanese public holidays. Titles of events you already entered or imported are left untouched.

## Using it on a phone

Open the same URL on the phone; the layout follows the screen size.

- The month grid shows events as **dots**, and the selected day's events are listed underneath
  (the same idea as the iPhone Calendar app)
- **Swipe left or right** on the calendar to move between months
- Import / Export / Calendars / Print move into the **⋯** menu in the top right
- Add an event with **+** in the top right, or “+ Add on this day” in the day list
- Dialogs open as sheets from the bottom of the screen, and inputs are at least 16px so iOS does not zoom
- The layout keeps clear of the notch and the home indicator (safe areas)

**Add to Home Screen** to use it full screen like an app (iPhone: Share → “Add to Home Screen”;
Android Chrome: menu → “Install app”). A `manifest.json` and icons are included.

Dragging an event to another day works with a mouse only. On a phone, open the event and change its date.

## Entering events

| Action | How |
| --- | --- |
| Add | the “+ New event” button, double-click a day cell (desktop), or the `N` key |
| Edit | click an event, or ✎ in the day list |
| Delete | open the event and choose “Delete”, or 🗑 in the day list |
| Change the date | drag an event onto another day (desktop only; not for repeating events) |
| Change month | `←` `→` keys, the ‹ › buttons, the month picker, or a swipe |
| Jump to today | the `T` key or the “Today” button |

Repeats can be every day, every week, every 2 weeks, every month (same date or same weekday) or
every year, with an optional end date. When you delete a repeating event you can choose between
**every occurrence** and **only that day**.

Japanese public holidays (including substitute and national holidays) are shown automatically.
You can turn them off in the “Calendars” dialog.

## Importing an iPhone calendar

Choose an `.ics` file with the “Import” button. To get one out of an iPhone:

1. **Through iCloud (recommended, all events)**
   Turn on Settings → Apple ID → iCloud → Calendars on the iPhone, then on a Mac signed in with the
   same Apple ID open Calendar.app and choose File → Export → Export… to save an `.ics` file.
2. **From the iPhone alone (public calendar)**
   Calendar app → “Calendars” → tap ⓘ next to the calendar → turn on “Public Calendar” → copy the URL.
   Replace `webcal://` with `https://` and open it in a browser to download the `.ics`. You can also
   paste the URL into “Load from a URL” in the app — if the publisher does not allow cross-origin
   requests the browser blocks it (CORS), and you need to save the file and choose it instead.
3. **A single event**
   Open the event → Share → send it by mail, then choose the attached `.ics` file.

On import you can either add a new calendar or merge into an existing one. Events whose `UID`
already exists are replaced, so importing the same file again does not create duplicates.

Supported iCalendar pieces: `VEVENT`, `DTSTART` / `DTEND` / `DURATION`, `VALUE=DATE` (all-day),
date-times with `TZID` and in UTC, `SUMMARY` / `LOCATION` / `DESCRIPTION`, `RRULE`, `EXDATE`,
folded lines and escaped characters. `VALARM` (alerts) is skipped.

“Export” saves the events of the visible calendars as an `.ics` file. Mail it to yourself and open
the attachment on the iPhone to load it there.

## Printing

“Print” prints the month you are viewing. You can choose the orientation (portrait / landscape),
whether start times and locations are shown, and color or black and white. The page is sized to fit
on one A4 sheet. To get the colors on paper, enable “Background graphics” in the printer settings.
`Ctrl` / `⌘` + `P` prints the same layout.

## Deploying to Render.com

The app is made of static files only, so publishing it as a **Static Site** is the best fit —
and then **no start command is needed**.

| Setting | Value |
| --- | --- |
| Language / Runtime | **Static Site** |
| Build Command | (leave empty) |
| Publish Directory | `.` |
| Start Command | **not needed** (the field does not exist) |

The same setup is described in `render.yaml` (a Render Blueprint) in the repository root.

### Running it as a Web Service

If you pick a Render **Web Service** (Node) instead, use the values below. A dependency-free static
file server, `server.js`, is included.

| Setting | Value |
| --- | --- |
| Language / Runtime | **Node** |
| Build Command | `npm install` |
| **Start Command** | **`npm start`** (which runs `node server.js`) |

If you would rather give a single command instead of `npm start`, either of these works:

```sh
node server.js
# or, without adding anything to the repository
npx --yes http-server . -p $PORT -a 0.0.0.0
```

Render passes the port in the `PORT` environment variable and requires the server to listen on
`0.0.0.0`; `server.js` does both (and falls back to port 3000 when `PORT` is not set).

## Where the data lives

Events are never sent to a server. They are kept in the browser's `localStorage`
(key `calendar-app:v1`), so they are not shared between browsers or devices. Use “Export” to back
them up or move them. “Delete all data” in the “Calendars” dialog clears everything.

## Files

```
index.html            page structure
manifest.json         settings for adding to the home screen
icons/                app icons
css/styles.css        styles for screen (desktop / phone) and print
js/i18n.js            Japanese / English strings and date formats
js/holidays.js        Japanese public holiday calculation
js/ics.js             reading and writing iCalendar (.ics)
js/store.js           localStorage persistence and recurrence expansion
js/app.js             rendering and interaction
server.js             static file server for a Render Web Service
render.yaml           Render Blueprint (static site)
package.json          npm start (= node server.js)
samples/iphone-sample.ics  sample file for trying the import
```
