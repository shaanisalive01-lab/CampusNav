# CampusNav design notes

The front end switched to this design on 26 November 2026. The previous one is kept in `old-frontend/`.

## Layout
- One page (`index.html`) with hash routes. Styles and screen scripts are in `app/`; campus data stays at the root.
- Five tabs: Home, Map, My day, Profs, Events. Groups sits beside Events. Campus info, Class rep and Club admin are reached from Home.
- The map is a schematic drawn from `campusData.js`. Building shapes and heights are illustrative.

## Look
- Neutral surfaces and one blue (`#2457d6` light, `#8fadff` dark). Tokens are at the top of `app/app.css`; the dark values appear twice.
- Lexend. Rounded panels; the room number is the largest thing on a screen.
- Little text: icons with short labels.

## Interaction
- Pressable things shrink slightly. Motion respects "reduce motion".
- Removing or changing something offers Undo instead of asking first.
- Saved data stays in the browser. Storage keys are unchanged from the old front end.

## Not done yet
- Self-host the font and the photo reading library.
- Real professor, event, notice and member data, and the campus floor plan (the Science Block is a sample).
- Shared data and sign-in for class reps and club leaders.
