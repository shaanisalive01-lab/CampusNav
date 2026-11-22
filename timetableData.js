// ==========================================
// CAMPUSNAV TIMETABLE DATA
// ==========================================

// Original timetable supplied by the college / prototype
const baseTimetable = [
    {
        id: "mon-maths",
        day: "Monday",
        startTime: "10:00",
        endTime: "11:00",
        subject: "Engineering Mathematics",
        location: "a204"
    },

    {
        id: "mon-physics",
        day: "Monday",
        startTime: "11:00",
        endTime: "12:00",
        subject: "Engineering Physics",
        location: "a201"
    },

    {
        id: "mon-lab",
        day: "Monday",
        startTime: "14:00",
        endTime: "16:00",
        subject: "Physics Lab",
        location: "a105"
    },

    {
        id: "tue-chemistry",
        day: "Tuesday",
        startTime: "09:00",
        endTime: "10:00",
        subject: "Engineering Chemistry",
        location: "a201"
    },

    {
        id: "tue-maths",
        day: "Tuesday",
        startTime: "11:00",
        endTime: "12:00",
        subject: "Engineering Mathematics",
        location: "a204"
    }
];


// ==========================================
// LOAD SAVED CR CHANGES (validated)
// ==========================================

const TIMETABLE_OVERRIDES_KEY = "campusnav-timetable-overrides";

// Keep only the fields a class rep is allowed to change,
// and only if they have the right type.
function sanitizeOverride(override) {

    if (override === null || typeof override !== "object") {
        return null;
    }

    const clean = {};

    if (typeof override.location === "string" && isLocationId(override.location)) {
        clean.location = override.location;
    }

    if (isValidTime(override.startTime)) {
        clean.startTime = override.startTime;
    }

    if (isValidTime(override.endTime)) {
        clean.endTime = override.endTime;
    }

    // A class cannot end before it starts: drop both times if so.
    if (
        clean.startTime &&
        clean.endTime &&
        clean.startTime >= clean.endTime
    ) {
        delete clean.startTime;
        delete clean.endTime;
    }

    if (typeof override.cancelled === "boolean") {
        clean.cancelled = override.cancelled;
    }

    return clean;
}


// Shared by the timetable pages and the CR editor (cr.html).
function loadOverrides() {

    const saved = readJSON(
        TIMETABLE_OVERRIDES_KEY,
        {},
        value =>
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
    );

    const knownIds = new Set(baseTimetable.map(item => item.id));

    const overrides = {};

    Object.keys(saved).forEach(id => {

        if (!knownIds.has(id)) {
            return;
        }

        const clean = sanitizeOverride(saved[id]);

        if (clean) {
            overrides[id] = clean;
        }
    });

    return overrides;
}


function saveOverrides(overrides) {

    return writeJSON(
        TIMETABLE_OVERRIDES_KEY,
        overrides
    );
}


// ==========================================
// APPLY CR CHANGES
// ==========================================

function getEffectiveTimetable() {

    const overrides = loadOverrides();

    return baseTimetable.map(classItem => {

        const override =
            overrides[classItem.id];

        if (!override) {
            return { ...classItem };
        }

        return {
            ...classItem,
            ...override
        };

    });
}


// ==========================================
// ACTIVE TIMETABLE
// ==========================================

const timetable = getEffectiveTimetable();