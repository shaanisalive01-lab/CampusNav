// Run: node --test app/parser.test.js
const test = require("node:test");
const assert = require("node:assert");
const { parseTimetable, findRanges, splitRoom } = require("./parser.js");

// lays text out as an OCR engine would report it: 10px per character, one box per word
const words = (text, x, y) => text.split(" ").reduce((out, part) => {
    const from = out.length ? out[out.length - 1].x1 + 10 : x;
    return out.concat({ text: part, x0: from, y0: y, x1: from + part.length * 10, y1: y + 20 });
}, []);
const brief = list => list.map(c => [c.day.slice(0, 3), c.startTime, c.endTime, c.subject, c.room].join("|"));

test("times: 24h, am/pm, bare afternoon hours and shared suffix", () => {
    const one = text => findRanges(text).map(r => r.startTime + "-" + r.endTime)[0];
    assert.strictEqual(one("10:00-11:00"), "10:00-11:00");
    assert.strictEqual(one("2.00 - 4.00"), "14:00-16:00");
    assert.strictEqual(one("12:00 to 1:00"), "12:00-13:00");
    assert.strictEqual(one("9 - 11 AM"), "09:00-11:00");
    assert.strictEqual(one("11:00 AM – 12:00 PM"), "11:00-12:00");
    assert.strictEqual(one("25:00-26:00"), undefined);
    assert.strictEqual(one("11:00-10:00"), undefined);
});

test("rooms are separated from the subject", () => {
    assert.deepStrictEqual(splitRoom("Engineering Maths A-204"), { room: "A204", subject: "Engineering Maths" });
    assert.deepStrictEqual(splitRoom("Physics (Room 201)"), { room: "A201", subject: "Physics" });
    assert.deepStrictEqual(splitRoom("| Chemistry |"), { room: "", subject: "Chemistry" });
});

test("list layout: day headings followed by class lines", () => {
    const input = [
        ...words("MONDAY", 0, 0),
        ...words("10:00-11:00 Engineering Maths A204", 0, 40),
        ...words("1:00-2:00 LUNCH", 0, 80),
        ...words("2:00-4:00 Physics Lab A105", 0, 120),
        ...words("Tuesday", 0, 160),
        ...words("9:00-10:00 Chemistry A201", 0, 200)
    ];
    assert.deepStrictEqual(brief(parseTimetable(input)), [
        "Mon|10:00|11:00|Engineering Maths|A204",
        "Mon|14:00|16:00|Physics Lab|A105",
        "Tue|09:00|10:00|Chemistry|A201"
    ]);
});

test("grid layout: times across the top, days down the side, two-line cells", () => {
    const input = [
        ...words("DAY", 10, 0), ...words("9:00-10:00", 200, 0), ...words("10:00-11:00", 400, 0), ...words("11:00-12:00", 600, 0),
        ...words("MON", 10, 100), ...words("Maths", 220, 85), ...words("A204", 225, 115),
        ...words("Lab", 440, 85), ...words("A105", 435, 115), ...words("Lab", 640, 85), ...words("A105", 635, 115),
        ...words("TUE", 10, 200), ...words("BREAK", 425, 200), ...words("Physics", 625, 185), ...words("A201", 640, 215)
    ];
    assert.deepStrictEqual(brief(parseTimetable(input)), [
        "Mon|09:00|10:00|Maths|A204",
        "Mon|10:00|12:00|Lab|A105",
        "Tue|11:00|12:00|Physics|A201"
    ]);
});

test("unreadable or hostile input gives no classes and never throws", () => {
    for (const bad of [null, undefined, [], [{ text: "hello" }], words("random words with no times", 0, 0), words("10:00-11:00 no day above", 0, 0)]) {
        assert.deepStrictEqual(parseTimetable(bad), []);
    }
    const long = parseTimetable([...words("Monday", 0, 0), ...words("10:00-11:00 " + "x".repeat(500), 0, 40)]);
    assert.strictEqual(long[0].subject.length, 60);
});
