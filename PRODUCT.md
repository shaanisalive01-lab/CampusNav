# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Existing static HTML, CSS and JavaScript with no build step or backend. Meant to run in a browser first and later be wrapped as an Android and iOS app (one codebase). The wrapper does not change the design language: it stays a mobile-first web app.

## Users
Students at SMVIT (Bangalore), the only audience for now. Primary job: find the way to a room or facility on campus, know where to be next, and see what is happening today, usually on a phone between classes. Secondary users: class representatives (CRs) who change timetable details, and club admins who post events.

The creator plans to pitch the product to other colleges if students at SMVIT like it. Design for SMVIT first, without hard-coding the college into the system's structure.

## Product Purpose
CampusNav is a campus companion: indoor navigation, the student's timetable, events, student groups, and campus information in one app. Success is a student reaching the right room on time without asking anyone, and the college wanting it.

## Positioning
Walk-by-walk indoor navigation: it routes to a real room (block, floor, stairs, room) and gives the steps, rather than dropping a pin on a map. A generic maps app cannot give this.

## Operating Context
Used on a phone, on the move, often by someone unfamiliar with the buildings. Also used on a desktop browser. Today all saved data (timetable edits, club events) lives only in the user's own browser; there is no backend and no login. Pages state this as a local demo.

## Capabilities and Constraints
- Campus map with floors and route finding to named places (Main Gate, Block A, Block A stairs and first floor, Rooms 105, 201 and 204, Library, Cafeteria).
- Timetable with a next-class view; CRs can change room, time or cancel a class (saved locally).
- Events page; club admins can add events (saved locally and shown on Events).
- Groups (clubs and study groups), Explore (places near campus via Google Maps links), Campus Info.
- Light and dark themes, saved per browser.
- Constraints: no backend, no accounts, static files only. Real shared data, backend integration, fuller campus mapping and 3D campus mapping are future roadmap items, not current capabilities.
- Terminology: "CR" means class representative; "Blocks", "Rooms", "Groups", "Events".

## Brand Commitments
Name: CampusNav. The only existing logo is the wordmark "Campus" + "Nav" in blue, which the creator wants kept as the rough logo. Everything else about the visual identity is open and the creator wants to be surprised.

## Evidence on Hand
- Real campus place data in `campusData.js` (9 locations) and sample timetable data in `timetableData.js`.
- A roadmap from the creator's pitch decks: backend integration, shared data management, campus mapping, 3D campus mapping.
- Absences future work must not fabricate: no real photographs of the campus, no student testimonials, no user numbers, no official college logo or approval, no live data.

## Product Principles
1. The route is the product: every screen leads back to "how do I get there, and when".
2. Phone first, one thumb, one hand, on the move: the web layout must also work as an Android and iOS app.
3. Glanceable before explorable: the next class and the next turn come before everything else.
4. Honest about what is real: local-only features say so; nothing implies live college data.
5. Designed to be pitched: it should look credible enough to show another college.

## Accessibility & Inclusion
No product-specific requirement stated by the creator. Engineering default: WCAG 2.2 AA contrast, 44 by 44 px minimum touch targets (48 dp on Android), reduced-motion support, dark and light themes, and text that survives larger system font sizes.
