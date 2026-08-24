# Calendar Web App

[日本語](README.md)

A month-view calendar for keeping your events. It is plain HTML / CSS / JavaScript — no build step.

- **Events** — add, edit and delete; all-day and multi-day events; repeats; location and notes; several calendars; colors
- **Month view and week view with times** — selecting a day shows that week on a time grid
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

- To switch: the **“日本語 | English”** control in the top right (inside the **⋯** menu on a phone).
  The current language is highlighted, so you can always see which version you are on and switch back.
  The “Calendars” dialog also has a “言語 / Language” setting
- Your choice is stored in this browser and used the next time you open the app
- URLs that pick a language:
  - Japanese … `/` (the default), `/ja/`, or `?lang=ja`
  - English … `/en/` or `?lang=en`

  For example `https://<your-site>.onrender.com/en/` opens the English version.

> If switching seems to do nothing, your browser may be holding an old copy of the JavaScript.
> The asset URLs carry a version (`?v=…`) and are served with `Cache-Control: no-cache`, so this
> normally resolves itself; reload the page if it does not.

Switching changes the interface text as well as month, weekday and date formats and the names of
the Japanese public holidays. Titles of events you already entered or imported are left untouched.

## Using it on a phone

Open the same URL on the phone; the layout follows the screen size.

- The month grid shows events as **dots**, and the selected day's events are listed underneath
  (the same idea as the iPhone Calendar app)
- Selecting a day switches to the week view with times; “Month” in the top right goes back
- **Swipe left or right** on the calendar to move between months
- Import / Export / Calendars / Print move into the **⋯** menu in the top right
- Add an event with **+** in the top right, or “+ Add on this day” in the day list
- Dialogs open as sheets from the bottom of the screen, and inputs are at least 16px so iOS does not zoom
- The layout keeps clear of the notch and the home indicator (safe areas)

**Add to Home Screen** to use it full screen like an app (iPhone: Share → “Add to Home Screen”;
Android Chrome: menu → “Install app”). A `manifest.json` and icons are included.

Dragging an event to another day works with a mouse only. On a phone, open the event and change its date.

## The week view with times

**Selecting a day in the month view shows that week on a time grid.**

- Events are laid out on a 0–24 hour axis; overlapping events are placed side by side
- All-day and multi-day events go into the “All-day” row above the time grid
- A red line marks the current time in the week that contains today; the view opens at the current
  hour (or at 8:00 for other weeks)
- **Clicking an empty slot opens the new-event dialog at that time** (rounded to 30 minutes).
  Clicking an event opens it for editing
- Clicking a weekday heading selects that day (the list on the right follows)
- Move between weeks with `←` `→`, the ‹ › buttons, or a swipe
- Switch views with **“Month | Week”** in the top right, or the `M` and `W` keys
- Printing a week fits it on one page

## Entering events

| Action | How |
| --- | --- |
| Add | the “+ New event” button, click an empty slot in the week view, or the `N` key |
| Edit | click an event, or ✎ in the day list |
| Delete | open the event and choose “Delete”, or 🗑 in the day list |
| Change the date | drag an event onto another day (desktop only; not for repeating events) |
| Switch view | “Month \| Week” in the top right, the `M` / `W` keys, or select a day in the month view |
| Move back and forth | `←` `→` keys, the ‹ › buttons, the month picker, or a swipe (one week at a time in the week view) |
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
   paste the URL into “Load from a URL” in the app — see “Loading from a URL” below.
3. **A single event**
   Open the event → Share → send it by mail, then choose the attached `.ics` file.

### Loading from a URL

iCloud published calendars (`webcal://p*-caldav.icloud.com/published/…`) do not send
`Access-Control-Allow-Origin`, so **a browser cannot fetch them directly** (CORS). Safari reports
this as “Load failed”. Use one of these instead:

1. **Let the server fetch it (a Render Web Service, for example)**
   `server.js` provides a relay at `/api/ics`. When the app runs with `npm start`, pasting the URL
   and pressing “Load” is enough: the app tries a direct fetch first and falls back to the relay.
   **A static site has no relay, so this path is not available there.**
   - By default the relay only accepts iCloud / Apple / Google / Outlook・Office365 / Yahoo hosts
   - Add more publishers with the `ICS_PROXY_ALLOW=host1,host2` environment variable
   - Set `ICS_PROXY=off` to disable the relay
2. **Save the file and choose it (works with any hosting)**
   Replace `webcal://` with `https://`, open it in a desktop browser to download the `.ics`, and
   choose that file in the app.

On import you can either add a new calendar or merge into an existing one. Events whose `UID`
already exists are replaced, so importing the same file again does not create duplicates.

Supported iCalendar pieces: `VEVENT`, `DTSTART` / `DTEND` / `DURATION`, `VALUE=DATE` (all-day),
date-times with `TZID` and in UTC, `SUMMARY` / `LOCATION` / `DESCRIPTION`, `RRULE`, `EXDATE`,
folded lines and escaped characters. `VALARM` (alerts) is skipped.

### Export

“Export” **downloads** the events of the visible calendars as an `.ics` file. On iPhone and iPad it
lands in the Downloads folder of the Files app.

- When the app is opened from the Home Screen, Safari cannot download, so the share sheet opens
  instead (choose “Save to Files”)
- If the download cannot be saved, use **“Export via the share sheet”** in the “Calendars” dialog
  (shown only on devices that support it)
- Mail the saved `.ics` to yourself and open the attachment on the iPhone to load it into Apple
  Calendar

## Printing

“Print” prints the month you are viewing — or that week, when the week view is open. You can choose the orientation (portrait / landscape),
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

> If you want to import an iCloud published calendar through “Load from a URL”, choose the
> **Web Service** below instead — that path needs the server relay. Everything else (importing a
> saved file, printing, entering events) works on a static site.

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
index.html            page structure (shared by both languages)
en/index.html         entry URL for English (redirects to ?lang=en)
ja/index.html         entry URL for Japanese (redirects to ?lang=ja)
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
