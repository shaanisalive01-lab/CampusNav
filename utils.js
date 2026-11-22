// ==========================================
// CAMPUSNAV SHARED HELPERS
// Load this before every other CampusNav script.
// ==========================================

// Escape text before it is placed inside innerHTML.
function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char])
    );
}


// Read JSON from localStorage safely.
// Returns `fallback` if the key is missing, the JSON is broken,
// storage is blocked, or `isValid(parsed)` says the shape is wrong.
function readJSON(key, fallback, isValid) {

    try {

        const raw = localStorage.getItem(key);

        if (raw === null) {
            return fallback;
        }

        const parsed = JSON.parse(raw);

        if (typeof isValid === "function" && !isValid(parsed)) {
            console.warn(`CampusNav: ignored invalid data in "${key}"`);
            return fallback;
        }

        return parsed;

    } catch (error) {

        console.warn(`CampusNav: could not read "${key}"`, error);
        return fallback;
    }
}


// Write JSON to localStorage safely. Returns false if storage is
// blocked or full instead of throwing.
function writeJSON(key, value) {

    try {

        localStorage.setItem(key, JSON.stringify(value));

        return true;

    } catch (error) {

        console.warn(`CampusNav: could not save "${key}"`, error);
        return false;
    }
}


// "HH:MM" with a real hour (00-23) and minute (00-59).
function isValidTime(value) {

    const match = /^(\d{2}):(\d{2})$/.exec(value);

    return (
        match !== null &&
        Number(match[1]) < 24 &&
        Number(match[2]) < 60
    );
}


// "YYYY-MM-DD" that is a real calendar date (rejects 2026-02-31).
function isValidDate(value) {

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (match === null) {
        return false;
    }

    const date = new Date(`${value}T00:00:00`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === Number(match[1]) &&
        date.getMonth() + 1 === Number(match[2]) &&
        date.getDate() === Number(match[3])
    );
}


// True only for ids that exist in campusData.js.
function isLocationId(id) {

    return (
        typeof id === "string" &&
        typeof campusLocations !== "undefined" &&
        Object.prototype.hasOwnProperty.call(campusLocations, id)
    );
}


// ==========================================
// CLUB EVENTS (written by club-admin.html,
// shown on events.html)
// ==========================================

const CLUB_EVENTS_KEY = "campusnav-club-events";

const CLUB_EVENT_LOCATIONS = {
    "block-a": "Block A",
    "a201": "Block A · Room 201",
    "a204": "Block A · Room 204",
    "a105": "Block A · Room 105",
    "library": "Library",
    "cafeteria": "Cafeteria"
};


function isValidClubEvent(event) {

    return (
        event !== null &&
        typeof event === "object" &&
        (
            typeof event.id === "string" ||
            typeof event.id === "number"
        ) &&
        typeof event.name === "string" &&
        event.name.trim() !== "" &&
        isValidDate(event.date) &&
        isValidTime(event.time) &&
        Object.prototype.hasOwnProperty.call(
            CLUB_EVENT_LOCATIONS,
            event.location
        ) &&
        (
            event.description === undefined ||
            typeof event.description === "string"
        )
    );
}


function loadClubEvents() {

    return readJSON(
        CLUB_EVENTS_KEY,
        [],
        Array.isArray
    ).filter(isValidClubEvent);
}
