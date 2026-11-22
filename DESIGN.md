---
name: CampusNav
description: A calm navy and blue campus app: your next class, the route to it, and what is on.
colors:
  navy-black: "#080b12"
  navy-surface: "#111824"
  navy-surface-2: "#182130"
  navy-rule: "#223049"
  snow: "#f3f6fb"
  mist: "#c5cfdd"
  slate: "#93a0b5"
  blue: "#4f8cff"
  blue-ink: "#06101f"
  daylight: "#f4f6fa"
  daylight-surface: "#ffffff"
  ink: "#111827"
  daylight-blue: "#326fe8"
typography:
  display:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.25
  room:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "3.2rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "4px"
  md: "8px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.blue-ink}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 24px"
  board-row:
    backgroundColor: "{colors.navy-black}"
    textColor: "{colors.snow}"
    padding: "14px 12px"
  board-row-lit:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.blue-ink}"
    rounded: "{rounded.md}"
  hero-card:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.snow}"
    rounded: "{rounded.lg}"
    padding: "16px"
  tab-bar:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.mist}"
    height: "64px"
---

# Design System: CampusNav

## Overview

**Creative North Star: "The Next Step."** Every screen answers one question: where do I need to be, and how do I get there? The deep navy ground and a single bright blue keep the eye on the next class, the room number and the route. The layout is a working product, not a poster: header and top menu on desktop, a bottom tab bar on phones, standard buttons and inputs.

The signature is the **board row**: time, name, an optional dotted leader, and the room number set large on the right. The next class is the one lit row, filled blue. Around it sit a live "up next" card with a countdown and a mini route map, quick destination chips, and date-tile event rows.

Two first-class themes: **navy** (the default at night) and **daylight** (white and cool grey). Both follow the phone's setting until the student chooses. The map screen is the v2 map, shown inside the same header and tab bar.

## Colors

- **Blue `#4f8cff`** (`#326fe8` in daylight): the lit row, primary buttons, links, the route line and the active tab. The only accent.
- **Navy black `#080b12`, navy surface `#111824`, surface 2 `#182130`**: grounds and cards. Rules use `#223049`, strong rules `#4a5b78`.
- **Snow `#f3f6fb`, mist `#c5cfdd`, slate `#93a0b5`**: text, second text, quiet text.
- **Daylight** swaps in `#f4f6fa`, `#ffffff`, ink `#111827`.
- The wordmark's "Nav" is the brand blue; nothing else is blue except the accent above.

## Typography

Barlow throughout: 700 for the page title and room numbers, 600 for row names, section titles and buttons, 400 for body. Sentence case, no all-caps display. Times and room numbers use tabular numerals so a column lines up like a timetable.

## Layout

Mobile first at 390px, content width 1080px on desktop. Home: greeting, up-next card, search with suggestions, quick chips, then two columns from 860px (Classes and Groups left, Events right). Safe-area insets pad the header and tab bar. Every tap target is at least 44px.

## Elevation & Depth

Flat. Depth comes from tone and hairline borders, never shadows. The one moving thing is the route line on the mini map and the live countdown.

## Shapes

8px corners on controls and the lit row, 14px on the up-next card, 4px on tags and focus rings. Pills only for the countdown label.

## Components

- **Up-next card**: a live pill (countdown or "Now, 20 min left"), class name, big room number, Navigate and Week buttons, a progress bar while a class is on, and a mini route map with a Level 1 badge.
- **Board row**: time, name, leader (desktop), room link. Lit, past and cancelled states.
- **Event row**: a date tile (weekday over day number, filled blue for today), name, place link, and a meta line.
- **Tab bar**: five tabs on the navy surface, the active tab tinted blue.
- **Chips**: quick destinations with a drawn icon.
- **Search**: input with live place suggestions.
- **List row** (Groups, Explore, Campus info): a drawn icon tile, name, one line of detail, and an action (a Join toggle, a Navigate button, or a whole-row link with an arrow).
- **Form panel** (CR dashboard, Club admin): one bordered panel per task; labelled fields at 48px; the primary action in blue, destructive actions outlined in red; editors and notifications open inline, never as modals.
- **Empty state**: dashed outline, a plain-language reason, never blank.

## Do's and Don'ts

- **Do** keep the room number the biggest thing on a class row, and light only one row.
- **Do** keep blue for what is next and what is tappable.
- **Don't** use emoji as icons, or put cards inside cards.
- **Don't** put an eyebrow above a heading, or a one-sided colour bar on a box.
- **Don't** hide actions behind hover; everything must work by tap.
