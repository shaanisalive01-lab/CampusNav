---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["timetable.html","events.html"]
---

# Surface brief: Today, Timetable, Events (first pass)

Scope: mode Operate. Home (Today), Timetable and Events. Map is left as it was on purpose; other pages roll out next.

Audience and job: SMVIT students on a phone between classes. Find the next room, know where to be, see what is on. Class reps and club admins are secondary.

Constraints: static HTML, CSS and JavaScript; mobile first; later wrapped as Android and iOS apps; light and dark themes both first-class.

## Direction contract

THESIS: A campus day set like a painted Bengaluru darshini menu board: strict rows, dotted leaders, one big number that matters. Refuses the card-grid campus app with emoji tiles.

OWN-WORLD: Black enamel board (#14110f) with chalk cream (#f4ead2), turmeric (#f2b705) as the lit row and the heading colour, chilli red (#d1361b) for the tab bar. Light mode is cream paper (#f5ecd6) with ink text. Barlow Condensed uppercase for headings and rows, Barlow for text. Dotted leaders, hairline rules, 8px corners. The wordmark stays Campus plus Nav, with Nav in the brand blue.

STORY: A student opens the app and sees today's classes as a board, the next one lit with its room number huge on the right. They tap the room to get the route, or search for another room.

FIRST VIEWPORT: Phone 390x844. Header with wordmark and theme switch; title TODAY with the date under it; a search field with a Go button; then the CLASSES board with the next class lit in turmeric, room number at the right; red bottom tab bar (Today, Map, Timetable, Events, Groups). Primary action: tapping the room or Navigate.

FORM: Operate board. Assigned by the roll, seed:01e68d8dc472d238, list position 6 (Darshini board), chosen by the user.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
