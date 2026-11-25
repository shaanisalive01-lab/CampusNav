// Routes over the campus road graph in campusData.js: shortest path and walking steps.
(function () {
    "use strict";

    const WALK_METRES_PER_SECOND = 1.3;
    const STAIR_SECONDS = 20;
    const UPPER = ["first-floor-stairs", "first-floor-corridor", "first-floor-left-corridor", "first-floor-right-corridor", "a201", "a204", "science-first-stairs", "science-first"];
    const level = id => (UPPER.includes(id) ? 1 : 0);

    const roads = {};
    Object.keys(campusGraph).forEach(a => Object.keys(campusGraph[a]).forEach(b => {
        // listed in the data, but there is no such road
        if (a + b === "librarycafeteria" || a + b === "cafeterialibrary") return;
        (roads[a] = roads[a] || {})[b] = campusGraph[a][b];
        (roads[b] = roads[b] || {})[a] = campusGraph[a][b];
    }));

    // stepFree leaves out every road that changes level
    function findPath(from, to, stepFree) {
        if (!Object.hasOwn(roads, from) || !Object.hasOwn(roads, to)) return null;
        const best = new Map([[from, 0]]);
        const previous = new Map();
        const open = new Set([from]);
        while (open.size) {
            const current = [...open].reduce((a, b) => (best.get(a) <= best.get(b) ? a : b));
            open.delete(current);
            if (current === to) break;
            Object.keys(roads[current]).forEach(next => {
                if (stepFree && level(current) !== level(next)) return;
                const length = best.get(current) + roads[current][next];
                if (!best.has(next) || length < best.get(next)) {
                    best.set(next, length);
                    previous.set(next, current);
                    open.add(next);
                }
            });
        }
        if (!best.has(to)) return null;
        const path = [to];
        while (path[0] !== from) path.unshift(previous.get(path[0]));
        const stairs = path.some((id, i) => i > 0 && level(id) !== level(path[i - 1]));
        const metres = best.get(to);
        const seconds = metres / WALK_METRES_PER_SECOND + (stairs ? STAIR_SECONDS : 0);
        return { path, metres, stairs, minutes: Math.max(1, Math.round(seconds / 60)) };
    }

    // headings come from the flat campus coordinates, stretched the same way the drawing is
    const point = id => ({ x: mapCoordinates[id].x, y: mapCoordinates[id].y * 1.5 });
    const heading = (a, b) => Math.atan2(point(b).y - point(a).y, point(b).x - point(a).x);

    // nameOf returns "" for a point that is only a bend in a road
    function buildSteps(path, nameOf) {
        const steps = [];
        let from = 0;
        let metres = 0;
        let facing = null;
        for (let i = 1; i < path.length; i++) {
            metres += roads[path[i - 1]][path[i]];
            const last = i === path.length - 1;
            const climbs = level(path[i - 1]) !== level(path[i]);
            const climbsNext = !last && level(path[i]) !== level(path[i + 1]);
            const bends = !last && Math.abs(Math.sin((heading(path[i], path[i + 1]) - heading(path[i - 1], path[i])) / 2)) > 0.24;
            const target = nameOf(path[i]);
            if (!(last || climbs || climbsNext || bends || target)) continue;
            let kind = "up";
            let word = "Go straight";
            if (climbs) {
                kind = "stairs";
                word = level(path[i]) > level(path[i - 1]) ? "Stairs up" : "Stairs down";
            } else if (facing !== null) {
                let turn = heading(path[from], path[from + 1]) - facing;
                turn = Math.atan2(Math.sin(turn), Math.cos(turn));
                if (Math.abs(turn) > 2.6) { kind = "left"; word = "Turn around"; }
                else if (Math.abs(turn) > 0.4) {
                    kind = turn > 0 ? "right" : "left";
                    word = turn > 0 ? "Turn right" : "Turn left";
                }
            }
            steps.push({ kind, word, metres, target, from, to: i });
            if (!climbs) facing = heading(path[i - 1], path[i]);
            from = i;
            metres = 0;
        }
        return steps;
    }

    window.CampusRoutes = { roads, level, findPath, buildSteps };
})();
