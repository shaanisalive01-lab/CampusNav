// Turns the words an OCR engine found in a timetable photo into classes.
// Pure functions: no DOM, so they can be tested with Node.
//   words: [{ text, x0, y0, x1, y1 }]
// Two layouts are understood:
//   grid: time ranges across the top, one row per day
//   list: a day name, then lines such as "10:00-11:00 Maths A204"
(function (root) {
    "use strict";

    const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const DAY_WORD = /^(mon|tue|tues|wed|thu|thur|thurs|fri|sat)(day|sday|nesday|rsday|urday)?[.:,]?$/i;
    const RANGE = /(\d{1,2})(?:[:.](\d{2}))?\s*([ap]\.?m\.?)?\s*(?:-|–|—|~|\bto\b)\s*(\d{1,2})(?:[:.](\d{2}))?\s*([ap]\.?m\.?)?/gi;
    const ROOM = /\b(?:room\s*)?([a-d])\s?-?\s?(\d{3})\b|\broom\s*(\d{3})\b/i;
    const BREAK = /^(lunch|break|recess|free|tea|short break|lunch break|-+)$/i;
    const MAX_SUBJECT = 60;
    const MAX_CLASSES = 60;

    function dayOf(text) {
        const match = DAY_WORD.exec(String(text).trim());
        return match ? DAY_NAMES.find(name => name.toLowerCase().startsWith(match[1].slice(0, 3).toLowerCase())) : null;
    }

    function to24(hour, minute, suffix) {
        let h = Number(hour);
        const m = Number(minute || 0);
        if (h > 23 || m > 59) return null;
        if (suffix) {
            if (h < 1 || h > 12) return null;
            h = (h % 12) + (/^p/i.test(suffix) ? 12 : 0);
        } else if (h >= 1 && h <= 7) {
            h += 12; // college hours: an unmarked 2:00 means 2 PM
        }
        return h * 60 + m;
    }

    const pad = n => String(n).padStart(2, "0");
    const asTime = minutes => pad(Math.floor(minutes / 60)) + ":" + pad(minutes % 60);

    function findRanges(text) {
        const found = [];
        for (const match of String(text).matchAll(RANGE)) {
            const [whole, h1, m1, s1, h2, m2, s2] = match;
            // "9 - 11 AM": the one suffix covers both, unless that would put the start after the end
            let start = to24(h1, m1, s1);
            const end = to24(h2, m2, s2);
            if (!s1 && s2) {
                const shared = to24(h1, m1, s2);
                if (shared !== null && end !== null && shared < end) start = shared;
            }
            if (start === null || end === null || end <= start || end - start > 240) continue;
            found.push({ startTime: asTime(start), endTime: asTime(end), index: match.index, length: whole.length });
        }
        return found;
    }

    // Pulls the room out of a piece of text; what is left is the subject.
    function splitRoom(text) {
        const match = ROOM.exec(text);
        let room = "";
        let rest = text;
        if (match) {
            room = (match[1] ? match[1] : "a").toUpperCase() + (match[2] || match[3]);
            rest = text.slice(0, match.index) + " " + text.slice(match.index + match[0].length);
        }
        const subject = rest.replace(/\(\s*\)/g, " ").replace(/[|[\]{}_=<>]+/g, " ").replace(/\s+/g, " ")
            .replace(/^[\s\-–—:,.()]+|[\s\-–—:,.(]+$/g, "").slice(0, MAX_SUBJECT);
        return { room, subject };
    }

    const midX = w => (w.x0 + w.x1) / 2;
    const midY = w => (w.y0 + w.y1) / 2;

    // Words whose centres sit at about the same height are one line.
    function toLines(words) {
        const lines = [];
        [...words].sort((a, b) => midY(a) - midY(b)).forEach(word => {
            const line = lines[lines.length - 1];
            if (line && Math.abs(midY(word) - line.y) < Math.max(word.y1 - word.y0, line.h) * 0.6) {
                line.words.push(word);
                line.y = line.words.reduce((sum, w) => sum + midY(w), 0) / line.words.length;
            } else {
                lines.push({ y: midY(word), h: word.y1 - word.y0, words: [word] });
            }
        });
        return lines.map(line => {
            line.words.sort((a, b) => a.x0 - b.x0);
            let text = "";
            line.spans = line.words.map(word => {
                if (text) text += " ";
                const from = text.length;
                text += word.text;
                return { from, to: text.length, word };
            });
            line.text = text;
            return line;
        });
    }

    function findHeader(lines) {
        for (const line of lines) {
            const ranges = findRanges(line.text);
            if (ranges.length < 2) continue;
            const columns = ranges.map(range => {
                const covered = line.spans.filter(s => s.from < range.index + range.length && s.to > range.index).map(s => s.word);
                return {
                    startTime: range.startTime,
                    endTime: range.endTime,
                    x: (Math.min(...covered.map(w => w.x0)) + Math.max(...covered.map(w => w.x1))) / 2
                };
            }).sort((a, b) => a.x - b.x);
            return { y: line.y, columns };
        }
        return null;
    }

    function parseGrid(words, header) {
        const columns = header.columns;
        const gap = (columns[columns.length - 1].x - columns[0].x) / (columns.length - 1);
        const left = columns[0].x - gap / 2;
        const labels = words.filter(w => midY(w) > header.y && midX(w) < left && dayOf(w.text))
            .sort((a, b) => midY(a) - midY(b));
        if (!labels.length) return [];
        const rowGap = labels.length > 1 ? (midY(labels[labels.length - 1]) - midY(labels[0])) / (labels.length - 1) : gap;
        const classes = [];
        labels.forEach((label, row) => {
            const top = row ? (midY(labels[row - 1]) + midY(label)) / 2 : midY(label) - rowGap / 2;
            const bottom = row < labels.length - 1 ? (midY(label) + midY(labels[row + 1])) / 2 : midY(label) + rowGap / 2;
            columns.forEach((column, i) => {
                const from = i ? (columns[i - 1].x + column.x) / 2 : left;
                const to = i < columns.length - 1 ? (column.x + columns[i + 1].x) / 2 : column.x + gap / 2;
                const cell = words.filter(w => midX(w) >= from && midX(w) < to && midY(w) >= top && midY(w) < bottom && midY(w) > header.y + 1);
                const text = toLines(cell).map(l => l.text).join(" ");
                const { room, subject } = splitRoom(text);
                if (subject.length < 2 || BREAK.test(subject)) return;
                classes.push({ day: dayOf(label.text), startTime: column.startTime, endTime: column.endTime, subject, room });
            });
        });
        return classes;
    }

    function parseList(lines) {
        const classes = [];
        let day = null;
        lines.forEach(line => {
            let text = line.text;
            const dayToken = text.split(/\s+/).find(token => dayOf(token));
            if (dayToken) {
                day = dayOf(dayToken);
                text = text.replace(dayToken, " ");
            }
            const ranges = findRanges(text);
            if (!day || ranges.length !== 1) return;
            const range = ranges[0];
            const { room, subject } = splitRoom(text.slice(0, range.index) + " " + text.slice(range.index + range.length));
            if (subject.length < 2 || BREAK.test(subject)) return;
            classes.push({ day, startTime: range.startTime, endTime: range.endTime, subject, room });
        });
        return classes;
    }

    // ---------- stacked layout: each column header is "09.00 AM / to / 09.55 AM" ----------
    // Common in college timetables. Copes with a tilted photo, cells that span
    // several periods, break columns and a few misread header times.

    // a header time on its own: 09.00, 1050, 2.40, 03.15PM (never a bare number such as a year)
    const LONE_TIME = /^[^0-9]{0,2}(\d{1,2}[.:]\d{2}|\d{4})\s*([ap]\.?m\.?)?[^0-9a-z]{0,2}$/i;
    const MERIDIEM = /^[ap]\.?\s?m\.?[,.]?$/i;
    const BREAK_MINUTES = 20;

    const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

    function loneTime(word, words) {
        const match = LONE_TIME.exec(word.text);
        if (!match) return null;
        const digits = match[1].replace(/\D/g, "").padStart(4, "0");
        let suffix = match[2];
        let right = word.x1;
        if (!suffix) {
            const height = word.y1 - word.y0;
            const after = words.find(w => MERIDIEM.test(w.text) && w.x0 >= word.x1 - 4 &&
                w.x0 - word.x1 < height * 2.5 && Math.abs(midY(w) - midY(word)) < height);
            if (after) { suffix = after.text; right = after.x1; }
        }
        const minutes = to24(digits.slice(0, 2), digits.slice(2), suffix);
        if (minutes === null || minutes < 6 * 60 || minutes > 21 * 60) return null;
        return { minutes, x: (word.x0 + right) / 2, y: midY(word), weight: word.c || 80 };
    }

    // the columns of the header and the time at every boundary between them
    function stackedHeader(words, firstDayY) {
        const head = words.filter(w => midY(w) < firstDayY);
        const joiners = head.filter(w => /^to$/i.test(w.text));
        if (joiners.length < 2) return null;
        const times = head.map(w => loneTime(w, head)).filter(Boolean);
        if (times.length < 3) return null;

        // how far the header slopes, measured along its row of "to"
        const first = joiners.reduce((a, b) => (a.x0 < b.x0 ? a : b));
        const last = joiners.reduce((a, b) => (a.x0 > b.x0 ? a : b));
        const slope = midX(last) - midX(first) > 100 ? clamp((midY(last) - midY(first)) / (midX(last) - midX(first)), -0.06, 0.06) : 0;
        const base = median(joiners.map(w => midY(w) - slope * midX(w)));
        const lineAt = x => base + slope * x;

        const near = times.filter(t => Math.abs(t.y - lineAt(t.x)) < 40).sort((a, b) => a.x - b.x);
        const columns = [];
        near.forEach(time => {
            const column = columns[columns.length - 1];
            if (column && time.x - column.x < 55) {
                column.times.push(time);
                column.x = column.times.reduce((sum, t) => sum + t.x, 0) / column.times.length;
            } else {
                columns.push({ x: time.x, times: [time] });
            }
        });
        if (columns.length < 2) return null;

        // above the "to" is the start of a column, below it the end
        const options = Array.from({ length: columns.length + 1 }, () => []);
        columns.forEach((column, i) => column.times.forEach(t => {
            options[t.y < lineAt(t.x) ? i : i + 1].push(t);
        }));

        // keep the most trustworthy set of times that only ever moves forward
        const chains = [];
        options.forEach((list, boundary) => list.forEach(option => {
            let best = { score: option.weight, boundary, minutes: option.minutes, previous: null };
            chains.forEach(chain => {
                const gap = option.minutes - chain.minutes;
                const steps = boundary - chain.boundary;
                if (steps > 0 && gap >= 5 * steps && gap <= 75 * steps && chain.score + option.weight > best.score) {
                    best = { score: chain.score + option.weight, boundary, minutes: option.minutes, previous: chain };
                }
            });
            chains.push(best);
        }));
        if (!chains.length) return null;
        const marks = [];
        for (let chain = chains.reduce((a, b) => (a.score >= b.score ? a : b)); chain; chain = chain.previous) {
            marks[chain.boundary] = chain.minutes;
        }

        // fill what could not be read: share the gap evenly, and assume a usual period at the ends
        const known = Object.keys(marks).map(Number);
        const lengths = known.filter(i => marks[i + 1] !== undefined).map(i => marks[i + 1] - marks[i]).filter(n => n > BREAK_MINUTES);
        const period = lengths.length ? median(lengths) : 55;
        for (let i = 0; i <= columns.length; i++) {
            if (marks[i] !== undefined) continue;
            const before = known.filter(k => k < i).pop();
            const after = known.find(k => k > i);
            if (before !== undefined && after !== undefined) {
                marks[i] = Math.round((marks[before] + (marks[after] - marks[before]) * (i - before) / (after - before)) / 5) * 5;
            } else if (before !== undefined) {
                marks[i] = marks[before] + period * (i - before);
            } else {
                marks[i] = marks[after] - period * (after - i);
            }
        }
        return columns.map((column, i) => ({ x: column.x, start: marks[i], end: marks[i + 1] }));
    }

    // rows slope in a photo: find the slope that lines the cells up with the day names best
    function rowSlope(cells, labels, reach) {
        let best = { slope: 0, cost: Infinity };
        for (let step = -25; step <= 25; step++) {
            const slope = step * 0.002;
            const cost = cells.reduce((sum, word) => sum + Math.min(reach, Math.min(...labels.map(label =>
                Math.abs(midY(word) - midY(label) - slope * (midX(word) - midX(label)))))), 0) + Math.abs(slope) * 10;
            if (cost < best.cost) best = { slope, cost };
        }
        return best.slope;
    }

    // course codes such as 1BMATM101 are often misread in small, repeatable ways
    const CODE = /^[1Il|]?B[A-Z]{2,7}[0-9OIlL]{3}[A-Za-z]?$/;
    function tidyCode(text) {
        const bare = text.replace(/^[^A-Za-z0-9(]+|[^A-Za-z0-9)]+$/g, "");
        if (!CODE.test(bare)) return null;
        const body = bare.replace(/^[1Il|]?(?=B)/, "1");
        const parts = /^(1B[A-Z]{2,7}?)([0-9OIlL]{3})([A-Za-z]?)$/.exec(body);
        return parts ? parts[1] + parts[2].replace(/O/g, "0").replace(/[IlL]/g, "1") + parts[3] : null;
    }

    // "B011" is often read as "8011" or "Bo11"
    const tidyRooms = text => text.replace(/\(?\b[B8]([0Oo]\d{2})\b/g, (whole, number) =>
        (whole.startsWith("(") ? "(" : "") + "B" + number.replace(/[Oo]/g, "0"));

    function parseStacked(words) {
        const labelled = words.filter(w => dayOf(w.text));
        if (!labelled.length) return [];
        const leftEdge = Math.min(...labelled.map(midX));
        const labels = labelled.filter(w => midX(w) - leftEdge < 90).sort((a, b) => midY(a) - midY(b));
        if (labels.length < 2) return [];
        const columns = stackedHeader(words, midY(labels[0]) - 8);
        if (!columns) return [];

        const gap = median(columns.slice(1).map((c, i) => c.x - columns[i].x));
        const leftOf = i => (i ? (columns[i - 1].x + columns[i].x) / 2 : columns[0].x - gap / 2);
        const rightOf = i => (i < columns.length - 1 ? (columns[i].x + columns[i + 1].x) / 2 : columns[i].x + gap / 2);
        const isBreak = column => column.end - column.start <= BREAK_MINUTES;

        const rowGap = median(labels.slice(1).map((l, i) => midY(l) - midY(labels[i])));
        const speck = w => w.text.length <= 2 && (w.c || 100) < 60;
        const usable = words.filter(w => (/[A-Za-z0-9].*[A-Za-z0-9]/.test(w.text) || /^[&/]$/.test(w.text)) &&
            !loneTime(w, words) && !MERIDIEM.test(w.text) && !/^to$/i.test(w.text) && !speck(w) &&
            midX(w) > leftOf(0) && midX(w) < rightOf(columns.length - 1) + gap * 0.3 &&
            midY(w) > midY(labels[0]) - rowGap &&
            midY(w) < midY(labels[labels.length - 1]) + rowGap);
        const slope = rowSlope(usable, labels, rowGap);

        // every code seen anywhere in the photo, to settle near misses
        const seen = new Set(words.map(w => tidyCode(w.text)).filter(Boolean));
        const settle = code => {
            const shorter = code.replace(/I(?=1\d\d[A-Za-z]?$)/, "");
            return shorter !== code && seen.has(shorter) ? shorter : code;
        };

        const rows = labels.map(() => []);
        usable.forEach(word => {
            const distances = labels.map(label => Math.abs(midY(word) - midY(label) - slope * (midX(word) - midX(label))));
            const row = distances.indexOf(Math.min(...distances));
            if (distances[row] <= rowGap * 0.7) rows[row].push(word);
        });

        // the room printed above the table is where ordinary classes meet
        const roomWord = words.find((w, i) => /^room$/i.test(w.text) && midY(w) < midY(labels[0]));
        let classRoom = "";
        if (roomWord) {
            const value = words.filter(w => w.x0 > roomWord.x1 && w.x0 - roomWord.x1 < 200 &&
                Math.abs(midY(w) - midY(roomWord)) < 16).map(w => w.text).join(" ");
            const match = /\b([A-D])\s?-?\s?(\d{3})\b/i.exec(value);
            if (match) classRoom = match[1].toUpperCase() + match[2];
        }

        const classes = [];
        rows.forEach((rowWords, rowIndex) => {
            // words with only a small space between them belong to one cell
            const cells = [];
            [...rowWords].sort((a, b) => a.x0 - b.x0).forEach(word => {
                const cell = cells[cells.length - 1];
                if (cell && word.x0 - cell.x1 <= Math.max(18, (word.y1 - word.y0) * 1.1)) {
                    cell.words.push(word);
                    cell.x1 = Math.max(cell.x1, word.x1);
                } else {
                    cells.push({ x0: word.x0, x1: word.x1, words: [word] });
                }
            });
            const nearest = x => columns.reduce((best, c, i) => (Math.abs(c.x - x) < Math.abs(columns[best].x - x) ? i : best), 0);
            cells.forEach(cell => { cell.mid = (cell.x0 + cell.x1) / 2; cell.home = nearest(cell.mid); });

            cells.forEach(cell => {
                if (isBreak(columns[cell.home])) return;
                // the run of periods whose middle best matches the middle of the text
                const taken = new Set(cells.filter(other => other !== cell).map(other => other.home));
                let best = null;
                for (let from = 0; from < columns.length; from++) {
                    for (let to = from; to < Math.min(columns.length, from + 4); to++) {
                        let blocked = false;
                        for (let i = from; i <= to; i++) blocked = blocked || isBreak(columns[i]) || taken.has(i);
                        if (blocked || cell.x0 < leftOf(from) - gap * 0.2 || cell.x1 > rightOf(to) + gap * 0.2) continue;
                        const off = Math.abs((leftOf(from) + rightOf(to)) / 2 - cell.mid) + (to - from);
                        if (!best || off < best.off) best = { from, to, off };
                    }
                }
                if (!best) best = { from: cell.home, to: cell.home };

                let text = cell.words.sort((a, b) => a.x0 - b.x0).map(w => {
                    const code = tidyCode(w.text);
                    return code ? settle(code) : w.text;
                }).join(" ");
                text = tidyRooms(text);
                let room = "";
                // "(B011 & B012)": the rooms of a lab that is split in two
                const listed = /\(\s*([A-D]\d{3})[^)]*\)?/i.exec(text);
                if (listed) {
                    room = listed[1].toUpperCase();
                    text = text.slice(0, listed.index) + text.slice(listed.index + listed[0].length);
                }
                const split = splitRoom(text.replace(/\bB(\d{3})\b/, "B$1"));
                const subject = split.subject.replace(/^[^A-Za-z0-9]+/, "");
                if (subject.length < 2 || !/[A-Z]{2}|[A-Za-z]{3}/.test(subject) || BREAK.test(subject)) return;
                room = room || split.room;
                if (/^lib(rary)?$/i.test(subject)) room = "Library";
                else if (!room && !/\blab\b|forum|club|activit|sport/i.test(subject)) room = classRoom;
                classes.push({
                    day: dayOf(labels[rowIndex].text),
                    startTime: asTime(columns[best.from].start),
                    endTime: asTime(columns[best.to].end),
                    subject,
                    room
                });
            });
        });
        return classes;
    }

    // Two readings of the same photo (cleaned and untouched) each miss different words.
    // Where both saw something in one spot, the surer reading wins.
    function mergeWords(first, second) {
        const merged = [...first];
        second.forEach(word => {
            const clash = merged.findIndex(other =>
                midX(word) > other.x0 && midX(word) < other.x1 && midY(word) > other.y0 && midY(word) < other.y1 ||
                midX(other) > word.x0 && midX(other) < word.x1 && midY(other) > word.y0 && midY(other) < word.y1);
            if (clash === -1) merged.push(word);
            else if ((word.c || 0) > (merged[clash].c || 0) + 10) merged[clash] = word;
        });
        return merged;
    }

    function parseTimetable(words) {
        const clean = (Array.isArray(words) ? words : [])
            .map(w => ({ text: String(w.text || "").trim(), x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1, c: w.c }))
            .filter(w => w.text && [w.x0, w.y0, w.x1, w.y1].every(Number.isFinite));
        const lines = toLines(clean);
        let classes = parseStacked(clean);
        if (!classes.length) {
            const header = findHeader(lines);
            classes = header ? parseGrid(clean, header) : [];
        }
        if (!classes.length) classes = parseList(lines);
        // a lab printed in two neighbouring cells is one long class
        const sorted = classes.sort((a, b) =>
            DAY_NAMES.indexOf(a.day) - DAY_NAMES.indexOf(b.day) || a.startTime.localeCompare(b.startTime));
        const merged = [];
        sorted.forEach(item => {
            const last = merged[merged.length - 1];
            if (last && last.day === item.day && last.subject.toLowerCase() === item.subject.toLowerCase() &&
                last.room === item.room && last.endTime === item.startTime) {
                merged[merged.length - 1] = { ...last, endTime: item.endTime };
            } else {
                merged.push(item);
            }
        });
        return merged.slice(0, MAX_CLASSES);
    }

    const api = { parseTimetable, mergeWords, findRanges, splitRoom, dayOf, DAY_NAMES };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.TimetableParser = api;
})(typeof window !== "undefined" ? window : globalThis);
