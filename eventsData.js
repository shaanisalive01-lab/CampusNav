// ==========================================
// CAMPUSNAV EVENTS
// Built-in weekly events plus events saved by club-admin.html.
// Needs utils.js (escapeHTML, loadClubEvents, CLUB_EVENT_LOCATIONS).
//
// The built-in events are SAMPLE events until the college shares the
// real ones. They repeat every week on the weekday given
// (0 = Sunday ... 6 = Saturday), so "Today" and "Tomorrow" stay true.
// ==========================================

const staticEvents = [
    { id: "robotics-meeting", name: "Robotics Club Meeting", category: "technical", weekday: 1, time: "15:30", place: "Block A", location: "block-a" },
    { id: "cad-workshop", name: "CAD Design Workshop", category: "technical", weekday: 2, time: "11:00", place: "Room 204", location: "a204" },
    { id: "freshers-meetup", name: "Freshers Meetup", category: "social", weekday: 5, time: "18:00", place: "Main Gate", location: "main-gate" },
    { id: "physics-lab", name: "Physics Lab Session", category: "academic", weekday: 1, time: "14:00", place: "Physics Lab", location: "a105" },
    { id: "motorsport-talk", name: "Motorsport Discussion", category: "social", weekday: 3, time: "16:30", place: "Library", location: "library" },
    { id: "student-hangout", name: "Student Hangout", category: "social", weekday: 6, time: "17:00", place: "Cafeteria", location: "cafeteria" }
];


function formatEventTime(timeString) {

    const hours = Number(timeString.slice(0, 2));

    return (
        (hours % 12 || 12) +
        ":" +
        timeString.slice(3, 5) +
        (hours >= 12 ? " PM" : " AM")
    );
}


// "Today", "Tomorrow", otherwise "Fri 4 Dec"
function formatEventDay(date) {

    const start = new Date();

    start.setHours(0, 0, 0, 0);

    const day = new Date(date.getTime());

    day.setHours(0, 0, 0, 0);

    const days = Math.round((day - start) / 86400000);

    if (days === 0) {
        return "Today";
    }

    if (days === 1) {
        return "Tomorrow";
    }

    return day.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short"
    });
}


// The next time a weekly event happens (today if it has not started).
function nextOccurrence(weekday, time) {

    const now = new Date();

    const when = new Date();

    when.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);

    when.setDate(when.getDate() + ((weekday - now.getDay() + 7) % 7));

    if (when < now) {
        when.setDate(when.getDate() + 7);
    }

    return when;
}


function toBoardEvent(event, when, extra) {

    return Object.assign({
        id: event.id,
        name: event.name,
        category: event.category,
        ts: when.getTime(),
        day: formatEventDay(when),
        time: formatEventTime(
            String(when.getHours()).padStart(2, "0") + ":" +
            String(when.getMinutes()).padStart(2, "0")
        ),
        place: event.place || "Campus",
        location: event.location
    }, extra || {});
}


// Club events that have not happened yet.
function getClubEvents() {

    const now = new Date();

    return loadClubEvents()
        .map(event => ({
            event,
            when: new Date(event.date + "T" + event.time + ":00")
        }))
        .filter(item => item.when >= now)
        .map(item => toBoardEvent(
            {
                id: "club-" + item.event.id,
                name: item.event.name,
                category: "technical",
                place: CLUB_EVENT_LOCATIONS[item.event.location] || "Campus",
                location: item.event.location
            },
            item.when,
            { tag: "Club", description: item.event.description || "" }
        ));
}


// Every upcoming event, soonest first.
function getAllEvents() {

    const builtIn = staticEvents.map(event =>
        toBoardEvent(event, nextOccurrence(event.weekday, event.time))
    );

    return getClubEvents()
        .concat(builtIn)
        .sort((a, b) => a.ts - b.ts);
}


// One board row, with a calendar tile for the date.
// Every value is escaped before it reaches innerHTML.
function eventRowHTML(event) {

    const tag = event.tag || (
        event.category.charAt(0).toUpperCase() + event.category.slice(1)
    );

    const when = new Date(event.ts);

    const weekday = when.toLocaleDateString(undefined, { weekday: "short" });

    return (
        '<li class="board-row event">' +
            '<span class="date-tile' + (event.day === "Today" ? " today" : "") + '" aria-hidden="true">' +
                "<b>" + escapeHTML(weekday) + "</b><span>" + when.getDate() + "</span></span>" +
            '<span class="what">' +
                '<span class="name">' + escapeHTML(event.name) + "</span>" +
                '<span class="leader" aria-hidden="true"></span>' +
            "</span>" +
            '<a class="where sm" href="map.html?destination=' + encodeURIComponent(event.location) +
                '" aria-label="Navigate to ' + escapeHTML(event.place) + '">' + escapeHTML(event.place) + "</a>" +
            '<span class="meta">' + escapeHTML(event.day + " · " + event.time + " · " + tag) + "</span>" +
        "</li>"
    );
}
