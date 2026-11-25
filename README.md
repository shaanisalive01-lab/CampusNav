# CampusNav

A phone-first campus app for SMVIT students: your next class, the way to it, your timetable and what is on at campus.

**Status: working prototype.** It is ready to be shown, not yet to be relied on. The map and its distances still need checking on campus, and much of the information is sample data.

**Website:** https://shaanisalive01-lab.github.io/CampusNav/

## What it does

- **Home:** your next class with a countdown and when to leave, the rest of today, campus shortcuts and the next event.
- **Map and directions:** a tilted campus map you can drag and zoom. Step-by-step directions from the Main Gate or another listed place, with a **No stairs** option.
- **Timetable scanner:** take or choose a photo of your timetable. It is read in your browser and is not uploaded. Check every class before saving, because photo reading makes mistakes.
- **My day:** your week, free periods and directions to each mapped room.
- **Professors:** room, email and clubs, with search (sample entries for now).
- **Events and groups:** search, filter, join a group and find where it meets.
- **Nearby:** cafes, restaurants, hotels and transport, opened in Google Maps.
- **Campus info:** places, notices and the emergency number 112.
- **Class rep and club admin:** change or cancel a sample class, and publish club events.
- **Themes:** follow the phone, light or dark.

## What is sample data

Made-up information carries a dashed **Sample** label in the app: the starting timetable, built-in events, professors, groups and member counts, notices, and the **Science Block**, whose position, stairs, floors and distances are guesses.

The other campus places, routes and walking distances carry no label, but **they have not been verified on campus**.

## Limits

- There is no server and no sign-in. Anyone can open the class rep and club admin tools, and what is saved stays in that browser. Other students do not see it.
- The photo scanner was tuned on one timetable layout. Other layouts or photos may read worse.
- The app has no offline mode. The font (Google Fonts) and the photo reading library (jsDelivr) load from other websites.
- It has not been tested on a range of real phones.

## Run it on your computer

There is no build step. From the project folder:

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765/

To preview another time of the week, add `?now=Mon@09:48` before the `#`, for example `http://127.0.0.1:8765/?now=Mon@09:48#home`. This changes the class countdowns, not event dates.

## Tests

The timetable reader has automated tests (needs Node.js):

```bash
node --test app/parser.test.js app/parser.stacked.test.js
```

The screens have no automated tests yet.

## Where things are

| Path | What it holds |
| --- | --- |
| `index.html` | The app. Screens are hash routes such as `#map` or `#go/library` |
| `app/` | Styles, screens, routing, map drawing and the timetable reader |
| `campusData.js` | Places, walking graph and map coordinates |
| `timetableData.js` | Sample timetable and class rep changes |
| `eventsData.js` | Sample weekly events and club events |
| `app/professors.js` | Professor entries (samples) |
| `utils.js` | Shared checks and safe browser storage |
| `redirect.js` and the other `.html` files | Keep old page addresses working |
| `DESIGN.md`, `PRODUCT.md` | Design and product notes |

## Adding real information

- **Rooms and buildings:** add them to `campusData.js` with their walking links and map coordinates. A new building also needs drawing in `app/map3d.js`, a level list entry in `app/routing.js` if it has upper floors, and an entry in the place list in `app/app.js`.
- **Professors:** get each person's permission first, use college email addresses, and set `PROFESSORS_ARE_SAMPLES` to `false` only when every entry is real. Anything in this repository is public.

## Before students use it

1. Walk every route and correct the map, distances, floors and stairs.
2. Replace or remove the sample information.
3. Test on real Android phones and iPhones, including the scanner.
4. Get the college's permission to use its name and campus information.
5. Hide the class rep and club admin tools, or add sign-in and shared data.
6. Add a way for students to report wrong directions or scan errors.
