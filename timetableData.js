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
// LOAD SAVED CR CHANGES
// ==========================================

function loadTimetableChanges() {

    try {

        const saved =
            localStorage.getItem("campusnav-timetable-overrides");

        if (!saved) {
            return {};
        }

        return JSON.parse(saved);

    } catch (error) {

        console.error(
            "Could not load timetable changes:",
            error
        );

        return {};
    }
}


// ==========================================
// APPLY CR CHANGES
// ==========================================

function getEffectiveTimetable() {

    const overrides = loadTimetableChanges();

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