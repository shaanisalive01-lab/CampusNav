// A tilted ("2.5D") drawing of the campus over the same coordinates and road graph as the app.
// It is a schematic: building shapes and heights are illustrative, not surveyed.
(function () {
    "use strict";

    const NS = "http://www.w3.org/2000/svg";
    const TURN = -26 * Math.PI / 180;   // the campus is turned a little ...
    const SQUASH = 0.7;                 // ... and seen from above at an angle
    const SPREAD = 1.5;                 // stretch north-south so it fills a phone

    const UPPER = Object.keys(mapCoordinates).filter(id => CampusRoutes.level(id) === 1);
    const INDOORS = ["block-a", "block-a-left-entry", "block-a-right-entry", "a105", "stairs-a",
        "science-block", "science-ground", "science-stairs"];
    const GROUND_FLOOR = 16;
    const UPPER_FLOOR = 92;
    const heightOf = id => (UPPER.includes(id) ? UPPER_FLOOR
        : INDOORS.includes(id) ? GROUND_FLOOR
            : id === "library" || id === "cafeteria" ? 34 : 0);

    // world (x, y on the ground, z up) to screen
    function project(x, y, z) {
        const yy = y * SPREAD;
        return {
            x: x * Math.cos(TURN) - yy * Math.sin(TURN),
            y: (x * Math.sin(TURN) + yy * Math.cos(TURN)) * SQUASH - (z || 0)
        };
    }
    const nodeXY = id => project(mapCoordinates[id].x, mapCoordinates[id].y, heightOf(id));
    const text = points => points.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");

    function el(tag, attributes, parent) {
        const node = document.createElementNS(NS, tag);
        Object.keys(attributes || {}).forEach(key => node.setAttribute(key, attributes[key]));
        if (parent) parent.appendChild(node);
        return node;
    }

    window.CampusMap = function (svg, options) {
        const { roads, places, iconOf, nameOf, onPick, onMoved, padding } = options;

        const ground = el("g", {}, svg);
        const scenery = el("g", {}, svg);
        const lower = el("g", {}, svg);
        const upper = el("g", {}, svg);
        const routeLayer = el("g", {}, svg);
        const markLayer = el("g", {}, svg);

        // ---------- roads on the ground ----------
        const OUTDOOR = ["main-gate", "main-road-bottom", "block-a", "left-road-junction", "left-road-mid",
            "library-entrance", "library", "right-road-junction", "right-road-mid", "cafeteria-entrance", "cafeteria",
            "science-block"];
        const edges = [];
        const seen = new Set();
        Object.keys(roads).forEach(a => Object.keys(roads[a]).forEach(b => {
            const key = [a, b].sort().join("|");
            if (!seen.has(key)) { seen.add(key); edges.push([a, b]); }
        }));
        const flat = id => project(mapCoordinates[id].x, mapCoordinates[id].y, 0);
        ["m-kerb", "m-road"].forEach(cls => edges.forEach(([a, b]) => {
            if (OUTDOOR.includes(a) && OUTDOOR.includes(b)) {
                el("polyline", { points: text([flat(a), flat(b)]), class: cls }, ground);
            }
        }));

        // ---------- solid shapes ----------
        // a box from z0 to z1; only the walls that face the viewer are drawn, then the roof
        function prism(parent, x, y, w, d, z0, z1, cls) {
            const group = el("g", { class: cls }, parent);
            const corners = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
            corners.forEach((corner, i) => {
                const next = corners[(i + 1) % 4];
                const a = project(corner[0], corner[1], z0);
                const b = project(next[0], next[1], z0);
                // walking clockwise on screen, an edge faces the viewer when it runs right to left
                if (b.x >= a.x) return;
                const side = i === 2 ? "m-front" : "m-flank";
                el("polygon", { points: text([a, b, project(next[0], next[1], z1), project(corner[0], corner[1], z1)]), class: side }, group);
            });
            el("polygon", { points: text(corners.map(c => project(c[0], c[1], z1))), class: "m-roof" }, group);
            return group;
        }

        function tree(x, y, size) {
            const base = project(x, y, 0);
            const g = el("g", { class: "m-tree" }, scenery);
            el("ellipse", { cx: base.x + size * 0.5, cy: base.y + 2, rx: size, ry: size * 0.45, class: "m-shade" }, g);
            el("circle", { cx: base.x, cy: base.y - size, r: size }, g);
        }

        // soft ground shadows, then back-to-front buildings
        [[84, 214, 96, 56], [624, 214, 96, 56], [226, 322, 350, 56], [570, 466, 175, 38]].forEach(([x, y, w, d]) => {
            el("polygon", {
                points: text([[x + 10, y + 8], [x + w + 18, y + 8], [x + w + 18, y + d + 10], [x + 10, y + d + 10]].map(c => project(c[0], c[1], 0))),
                class: "m-shade"
            }, scenery);
        });
        [[205, 222, 9], [236, 232, 7], [560, 222, 8], [595, 236, 10], [172, 438, 9], [205, 452, 7], [770, 440, 10], [775, 488, 7],
            [300, 456, 8], [505, 456, 9], [96, 320, 8], [708, 322, 9]].forEach(([x, y, r]) => tree(x, y, r));

        prism(scenery, 84, 214, 92, 52, 0, 34, "m-block");
        prism(scenery, 624, 214, 92, 52, 0, 34, "m-block");
        prism(lower, 226, 324, 348, 52, 0, GROUND_FLOOR, "m-block");
        prism(lower, 244, 329, 30, 13, GROUND_FLOOR, GROUND_FLOOR + 18, "m-room");

        // level 1 stands on pillars above the ground floor
        [[308, 210], [492, 210], [308, 270], [492, 270]].forEach(([x, y]) => {
            el("polyline", { points: text([project(x, y, 0), project(x, y, UPPER_FLOOR - 8)]), class: "m-pillar" }, upper);
        });
        prism(upper, 300, 202, 200, 76, UPPER_FLOOR - 8, UPPER_FLOOR, "m-deck");
        prism(upper, 318, 262, 40, 12, UPPER_FLOOR, UPPER_FLOOR + 18, "m-room");
        prism(upper, 442, 262, 40, 12, UPPER_FLOOR, UPPER_FLOOR + 18, "m-room");

        // the Science Block: the same two levels, smaller
        prism(lower, 570, 466, 175, 38, 0, GROUND_FLOOR, "m-block");
        [[634, 424], [734, 424], [634, 454], [734, 454]].forEach(([x, y]) => {
            el("polyline", { points: text([project(x, y, 0), project(x, y, UPPER_FLOOR - 8)]), class: "m-pillar" }, upper);
        });
        prism(upper, 628, 418, 112, 40, UPPER_FLOOR - 8, UPPER_FLOOR, "m-deck");

        // corridors lie on their floors; the stairs climb between them
        edges.forEach(([a, b]) => {
            if (OUTDOOR.includes(a) && OUTDOOR.includes(b)) return;
            const climbs = UPPER.includes(a) !== UPPER.includes(b);
            const parent = UPPER.includes(a) || UPPER.includes(b) ? upper : lower;
            el("polyline", { points: text([nodeXY(a), nodeXY(b)]), class: climbs ? "m-stair" : "m-path" }, parent);
        });

        // ---------- pins ----------
        const pins = places.map(id => {
            const g = el("g", { class: "m-mark", tabindex: 0, role: "button", "aria-label": "Directions to " + campusLocations[id].name }, markLayer);
            const inner = el("g", {}, g);
            el("circle", { r: 17 }, inner);
            el("use", { href: "#i-" + iconOf(id), x: -10, y: -10, width: 20, height: 20 }, inner);
            g.addEventListener("click", () => onPick(id));
            g.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(id); }
            });
            return { id, g, inner };
        });

        const you = el("g", { class: "m-you" }, markLayer);
        const youInner = el("g", {}, you);
        el("circle", { r: 19, class: "pulse" }, youInner);
        el("circle", { r: 9, class: "dot" }, youInner);

        // the destination: a pin that floats above the room, carrying its name
        const flag = el("g", { class: "m-flag" }, markLayer);
        const flagInner = el("g", {}, flag);
        const bob = el("g", { class: "bob" }, flagInner);
        const flagBox = el("rect", { y: -66, height: 34, rx: 17 }, bob);
        el("path", { d: "M-7 -33 L0 -22 L7 -33 Z" }, bob);
        const flagText = el("text", { y: -43 }, bob);

        // ---------- camera ----------
        let view = { x: 0, y: 0, w: 800, h: 600 };
        let animation = 0;
        let wanted = null;
        let userMoved = false;
        let scale = 1; // map units per screen pixel, kept when a panel changes size
        const everywhere = Object.keys(mapCoordinates).map(nodeXY);
        const limits = {
            left: Math.min(...everywhere.map(p => p.x)), right: Math.max(...everywhere.map(p => p.x)),
            top: Math.min(...everywhere.map(p => p.y)), bottom: Math.max(...everywhere.map(p => p.y))
        };
        const between = (value, low, high) => Math.max(low, Math.min(high, value));
        function setMoved(value) {
            if (userMoved === value) return;
            userMoved = value;
            if (onMoved) onMoved(value);
        }

        const place = (node, point) => { node.dataset.at = point.x + "," + point.y; };

        // pins keep the same size on screen at every zoom
        function paint() {
            svg.setAttribute("viewBox", view.x + " " + view.y + " " + view.w + " " + view.h);
            const width = svg.clientWidth || svg.getBoundingClientRect().width;
            const height = svg.clientHeight || svg.getBoundingClientRect().height;
            if (!width || !height) return;
            const unit = Math.max(view.w / width, view.h / height);
            scale = unit;
            markLayer.querySelectorAll("[data-at]").forEach(node => {
                const [x, y] = node.dataset.at.split(",");
                node.setAttribute("transform", "translate(" + x + " " + y + ") scale(" + unit + ")");
            });
        }

        // show these places in the part of the map that no panel is covering
        function frame(ids, instant, wide) {
            const key = ids.join() + "|" + Boolean(wide);
            // a timed refresh of the same route must not undo the student's own panning
            if (userMoved && wanted && wanted.key === key) return;
            cancelAnimationFrame(animation);
            setMoved(false);
            wanted = { ids, wide, key };
            const box = svg.getBoundingClientRect();
            if (!box.width || !box.height) return;
            const pad = padding(box);
            const points = ids.map(nodeXY);
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const w = Math.max(Math.max(...xs) - Math.min(...xs), wide ? 330 : 190);
            const h = Math.max(Math.max(...ys) - Math.min(...ys), wide ? 300 : 170);
            const unit = Math.max(w / Math.max(box.width - pad.left - pad.right, 80), h / Math.max(box.height - pad.top - pad.bottom, 80));
            const target = { w: box.width * unit, h: box.height * unit };
            target.x = (Math.min(...xs) + Math.max(...xs)) / 2 - (pad.left + (box.width - pad.left - pad.right) / 2) * unit;
            target.y = (Math.min(...ys) + Math.max(...ys)) / 2 - (pad.top + (box.height - pad.top - pad.bottom) / 2) * unit;
            cancelAnimationFrame(animation);
            if (instant || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches) {
                view = target;
                paint();
                return;
            }
            const start = { ...view };
            const began = performance.now();
            const tick = stamp => {
                const t = Math.min(1, (stamp - began) / 420);
                const eased = 1 - Math.pow(1 - t, 4);
                view = {};
                ["x", "y", "w", "h"].forEach(k => { view[k] = start[k] + (target[k] - start[k]) * eased; });
                paint();
                if (t < 1) animation = requestAnimationFrame(tick);
            };
            animation = requestAnimationFrame(tick);
        }

        function draw(route, destination, activeStep) {
            routeLayer.replaceChildren();
            const youAt = route ? route.path[activeStep ? activeStep.from : 0] : "main-gate";
            place(youInner, nodeXY(youAt));
            pins.forEach(pin => {
                place(pin.inner, nodeXY(pin.id));
                // the blue dot and the floating flag replace the pins they stand on
                pin.g.style.display = pin.id === youAt || pin.id === destination ? "none" : "";
            });
            flag.style.display = destination ? "" : "none";
            if (destination) {
                const name = nameOf(destination);
                const width = name.length * 11 + 34;
                flagText.textContent = name;
                flagBox.setAttribute("x", -width / 2);
                flagBox.setAttribute("width", width);
                place(flagInner, nodeXY(destination));
                const spot = nodeXY(destination);
                el("ellipse", { cx: spot.x, cy: spot.y, rx: 13, ry: 8, class: "m-target" }, routeLayer);
            }
            if (route) {
                const line = ids => text(ids.map(nodeXY));
                el("polyline", { points: line(route.path), class: "m-glow" }, routeLayer);
                el("polyline", { points: line(route.path), class: "m-route" + (activeStep ? " m-ahead" : "") }, routeLayer);
                const bright = activeStep ? route.path.slice(activeStep.from, activeStep.to + 1) : route.path;
                if (activeStep) el("polyline", { points: line(bright), class: "m-route" }, routeLayer);
                el("polyline", { points: line(bright), class: "m-flow" }, routeLayer);
            }
            paint();
        }

        // ---------- moving the map by hand ----------
        // set the zoom, keeping one point of the map under one point of the screen
        function setView(worldX, worldY, screenX, screenY, unit, box) {
            const w = box.width * unit;
            const h = box.height * unit;
            // the middle of the screen never leaves the campus
            const x = between(worldX - screenX * unit + w / 2, limits.left, limits.right) - w / 2;
            const y = between(worldY - screenY * unit + h / 2, limits.top, limits.bottom) - h / 2;
            view = { x, y, w, h };
        }

        // move by (dx, dy) pixels and zoom by factor around the screen point (cx, cy)
        function adjust(cx, cy, factor, dx, dy) {
            const box = svg.getBoundingClientRect();
            if (!box.width || !box.height) return;
            cancelAnimationFrame(animation);
            const sx = cx - box.left;
            const sy = cy - box.top;
            const unit = between(scale / factor, 0.18, 2.2);
            setView(view.x + (sx - dx) * scale, view.y + (sy - dy) * scale, sx, sy, unit, box);
            setMoved(true);
            paint();
        }

        const pointers = new Map();
        let start = null;
        let dragged = false;
        svg.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;
            if (!pointers.size) { dragged = false; start = { x: event.clientX, y: event.clientY }; }
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        });
        svg.addEventListener("pointermove", event => {
            const last = pointers.get(event.pointerId);
            if (!last) return;
            // a small wobble during a tap is not a drag
            if (!dragged && pointers.size === 1 && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 7) return;
            if (!dragged) {
                dragged = true;
                try { svg.setPointerCapture(event.pointerId); } catch (error) { /* the pointer has already gone */ }
            }
            const now = { x: event.clientX, y: event.clientY };
            const other = [...pointers].find(([id]) => id !== event.pointerId);
            pointers.set(event.pointerId, now);
            if (!other) { adjust(now.x, now.y, 1, now.x - last.x, now.y - last.y); return; }
            const still = other[1];
            const before = Math.hypot(last.x - still.x, last.y - still.y);
            const after = Math.hypot(now.x - still.x, now.y - still.y);
            adjust((now.x + still.x) / 2, (now.y + still.y) / 2, before > 10 ? after / before : 1,
                (now.x - last.x) / 2, (now.y - last.y) / 2);
        });
        const lift = event => pointers.delete(event.pointerId);
        addEventListener("pointerup", lift);
        addEventListener("pointercancel", lift);
        // letting go after a drag must not count as tapping a pin
        svg.addEventListener("click", event => {
            if (!dragged) return;
            event.stopPropagation();
            event.preventDefault();
            dragged = false;
        }, true);
        svg.addEventListener("wheel", event => {
            event.preventDefault();
            adjust(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0015), 0, 0);
        }, { passive: false });

        function zoom(factor) {
            const box = svg.getBoundingClientRect();
            adjust(box.left + box.width / 2, box.top + box.height / 2, factor, 0, 0);
        }

        function recentre() {
            if (!wanted) return;
            setMoved(false);
            frame(wanted.ids, false, wanted.wide);
        }

        const again = () => {
            if (!wanted) return;
            if (!userMoved) { frame(wanted.ids, true, wanted.wide); return; }
            const box = svg.getBoundingClientRect();
            if (!box.width || !box.height) return;
            setView(view.x + view.w / 2, view.y + view.h / 2, box.width / 2, box.height / 2, scale, box);
            paint();
        };
        new ResizeObserver(again).observe(svg);

        return { draw, frame, reframe: again, recentre, zoom, moved: () => userMoved };
    };
})();
