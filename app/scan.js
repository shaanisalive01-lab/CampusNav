// "Scan my timetable": read a photo on the device, then let the student check it before saving.
// The photo is never uploaded. The OCR library and its English data are downloaded on first use.
(function () {
    "use strict";

    // pinned version; self-host it with the font before this goes into the real app
    const OCR_SCRIPT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    const MAX_BYTES = 12 * 1024 * 1024;
    const READ_WIDTH = 3200;
    const MAX_SIDE = 3600;
    const WEEK = TimetableParser.DAY_NAMES;

    let library = null;
    let job = 0;
    // classes being checked, so a stray tap on another tab does not throw the work away
    let draft = null;

    function loadLibrary() {
        if (window.Tesseract) return Promise.resolve();
        if (!library) {
            library = new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = OCR_SCRIPT;
                script.crossOrigin = "anonymous";
                script.onload = resolve;
                script.onerror = () => { library = null; script.remove(); reject(new Error("offline")); };
                document.head.appendChild(script);
            });
        }
        return library;
    }

    // OCR reads small text badly, so the photo is drawn large and in grey
    async function prepare(file) {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(READ_WIDTH / bitmap.width, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.imageSmoothingQuality = "high";
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.filter = "grayscale(1)";
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return canvas;
    }

    // Turns the photo so the table's rows run level. Ruled lines and rows of text pile up
    // into sharp bands only at the right angle, so that angle is the one that is kept.
    function straighten(source) {
        const width = 900;
        const height = Math.round(source.height * width / source.width);
        const small = document.createElement("canvas");
        small.width = width;
        small.height = height;
        const context = small.getContext("2d", { willReadFrequently: true });
        context.drawImage(source, 0, 0, width, height);
        const data = context.getImageData(0, 0, width, height).data;
        // dark pixels that differ from the one just above: the edges of lines and letters
        const edges = [];
        for (let y = 2; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[(y - 2) * width * 4 + x * 4] - data[y * width * 4 + x * 4] > 30) edges.push(x, y);
            }
        }
        let best = { degrees: 0, score: 0 };
        for (let step = -16; step <= 16; step++) {
            const degrees = step * 0.25;
            const slope = Math.tan(degrees * Math.PI / 180);
            const bands = new Float64Array(height * 2);
            for (let i = 0; i < edges.length; i += 2) {
                bands[Math.round(edges[i + 1] - edges[i] * slope + height / 2)]++;
            }
            const score = bands.reduce((sum, count) => sum + count * count, 0);
            if (score > best.score) best = { degrees, score };
        }
        if (Math.abs(best.degrees) < 0.4) return source;
        const turned = document.createElement("canvas");
        turned.width = source.width;
        turned.height = source.height;
        const out = turned.getContext("2d", { willReadFrequently: true });
        out.imageSmoothingQuality = "high";
        out.fillStyle = "#fff";
        out.fillRect(0, 0, turned.width, turned.height);
        out.translate(turned.width / 2, turned.height / 2);
        out.rotate(-best.degrees * Math.PI / 180);
        out.drawImage(source, -source.width / 2, -source.height / 2);
        return turned;
    }

    // A second copy in pure black and white with the table's ruled lines rubbed out.
    // Lines touching letters are the main reason whole cells go unread.
    function withoutLines(source) {
        const W = source.width;
        const H = source.height;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(source, 0, 0);
        const image = context.getImageData(0, 0, W, H);
        const data = image.data;

        // running totals, so the average brightness around any pixel is cheap
        const sums = new Float64Array((W + 1) * (H + 1));
        for (let y = 0; y < H; y++) {
            let row = 0;
            for (let x = 0; x < W; x++) {
                row += data[(y * W + x) * 4];
                sums[(y + 1) * (W + 1) + x + 1] = sums[y * (W + 1) + x + 1] + row;
            }
        }
        // ink is anything darker than its surroundings, which copes with uneven light
        const reach = Math.round(W / 100);
        const ink = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) {
            const top = Math.max(0, y - reach);
            const bottom = Math.min(H, y + reach + 1);
            for (let x = 0; x < W; x++) {
                const left = Math.max(0, x - reach);
                const right = Math.min(W, x + reach + 1);
                const average = (sums[bottom * (W + 1) + right] - sums[top * (W + 1) + right] -
                    sums[bottom * (W + 1) + left] + sums[top * (W + 1) + left]) / ((right - left) * (bottom - top));
                if (data[(y * W + x) * 4] < average - 12) ink[y * W + x] = 1;
            }
        }
        // a long unbroken run of ink is a ruled line, not part of a letter
        const clean = ink.slice();
        const erase = (outer, inner, limit, index) => {
            for (let a = 0; a < outer; a++) {
                let run = 0;
                for (let b = 0; b <= inner; b++) {
                    if (b < inner && ink[index(a, b)]) { run++; continue; }
                    if (run > limit) {
                        for (let k = b - run; k < b; k++) {
                            for (let side = -1; side <= 1; side++) {
                                if (a + side >= 0 && a + side < outer) clean[index(a + side, k)] = 0;
                            }
                        }
                    }
                    run = 0;
                }
            }
        };
        erase(H, W, Math.round(W / 36), (y, x) => y * W + x);
        erase(W, H, Math.round(W / 55), (x, y) => y * W + x);

        for (let i = 0; i < W * H; i++) {
            const value = clean[i] ? 0 : 255;
            data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value;
            data[i * 4 + 3] = 255;
        }
        context.putImageData(image, 0, 0);
        return canvas;
    }

    async function readWords(canvas, onProgress) {
        await loadLibrary();
        let pass = 0;
        const worker = await window.Tesseract.createWorker("eng", 1, {
            logger: message => { if (message.status === "recognizing text") onProgress((pass + message.progress) / 2); }
        });
        // positions are reported as if the picture were 1800 wide, whatever its real size
        const unit = 1800 / canvas.width;
        try {
            // "sparse text": find words wherever they are, which suits a table
            await worker.setParameters({ tessedit_pageseg_mode: "11" });
            const read = async picture => {
                const { data } = await worker.recognize(picture);
                return (data.words || []).filter(w => w.confidence > 20).map(w => ({
                    text: w.text, c: w.confidence,
                    x0: w.bbox.x0 * unit, y0: w.bbox.y0 * unit, x1: w.bbox.x1 * unit, y1: w.bbox.y1 * unit
                }));
            };
            const cleaned = await read(withoutLines(canvas));
            pass = 1;
            // each reading catches words the other misses
            return TimetableParser.mergeWords(cleaned, await read(canvas));
        } finally {
            await worker.terminate();
        }
    }

    // ---------- screens ----------

    function start(ctx, message) {
        ctx.sheet.innerHTML =
            '<h1 class="title">Scan</h1>' +
            '<div class="finder" aria-hidden="true"><b></b><b></b><b></b><b></b><div class="sample">' +
            [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1].map(on => "<i" + (on ? ' class="on"' : "") + "></i>").join("") + "</div></div>" +
            '<p class="lead">Keep days and times in the picture</p>' +
            '<p class="problem" role="alert"></p>' +
            (draft ? '<button type="button" class="btn primary wide" id="resume">Continue checking ' + draft.items.length +
                (draft.items.length === 1 ? " class" : " classes") + "</button>" : "") +
            '<label class="btn wide' + (draft ? "" : " primary") + '">' + ctx.icon("camera") + 'Choose photo<input type="file" id="photo" accept="image/*"></label>' +
            '<button type="button" class="btn wide" id="byHand">Type it instead</button>' +
            '<a class="btn plain wide" href="#day">Cancel</a>' +
            '<p class="note">Your photo stays on this device. First use needs internet.</p>';
        ctx.sheet.querySelector(".problem").textContent = message || "";
        ctx.sheet.querySelector("#byHand").addEventListener("click", () => review(ctx, [], ""));
        const resume = ctx.sheet.querySelector("#resume");
        if (resume) resume.addEventListener("click", () => review(ctx, draft.items, draft.preview));
        ctx.sheet.querySelector("#photo").addEventListener("change", event => {
            const file = event.target.files[0];
            if (file) read(ctx, file);
        });
    }

    async function read(ctx, file) {
        if (!file.type.startsWith("image/")) return start(ctx, "That file is not a picture.");
        if (file.size > MAX_BYTES) return start(ctx, "That picture is over 12 MB. Try a smaller one.");
        const mine = ++job;
        ctx.sheet.innerHTML =
            '<h1 class="title">Reading photo</h1>' +
            '<p class="lead" role="status">It reads the photo twice. This can take a minute or two.</p>' +
            '<progress max="1" aria-label="Reading progress"></progress>' +
            '<a class="btn wide" href="#day">Cancel</a>';
        // leaving the screen, or choosing another photo, makes this result unwanted
        const stillWanted = () => mine === job && location.hash === "#scan";
        try {
            const canvas = straighten(await prepare(file));
            const words = await readWords(canvas, progress => {
                const bar = stillWanted() && ctx.sheet.querySelector("progress");
                if (bar) bar.value = progress;
            });
            if (!stillWanted()) return;
            const small = document.createElement("canvas");
            small.width = 900;
            small.height = Math.round(canvas.height * 900 / canvas.width);
            small.getContext("2d").drawImage(canvas, 0, 0, small.width, small.height);
            review(ctx, TimetableParser.parseTimetable(words), small.toDataURL("image/jpeg", 0.7));
        } catch (error) {
            console.warn("CampusNav: could not read the photo", error);
            if (!stillWanted()) return;
            start(ctx, error.message === "offline"
                ? "Could not load the reader. Check your internet and try again."
                : "Could not read that picture. Try another one, or type it instead.");
        }
    }

    function row(ctx, item) {
        const known = ctx.places.find(place => place.name === item.room || (place.rooms || []).includes(item.room));
        const option = (value, label, selected) =>
            '<option value="' + escapeHTML(value) + '"' + (selected ? " selected" : "") + ">" + escapeHTML(label) + "</option>";
        const field = (label, control, wide) => '<label class="field' + (wide ? " full-row" : "") + '">' + label + control + "</label>";
        return '<li class="edit" data-room="' + escapeHTML(item.room) + '">' +
            field("Subject", '<input name="subject" maxlength="60" value="' + escapeHTML(item.subject) + '">', true) +
            field("Day", '<select name="day">' + WEEK.map(day => option(day, day, day === item.day)).join("") + "</select>") +
            field("Room", '<select name="location">' +
                (known ? "" : option("", item.room ? item.room + " (not on map)" : "Not on map", true)) +
                ctx.places.map(place => option(place.id, place.name, known && known.id === place.id)).join("") + "</select>") +
            field("Starts", '<input type="time" name="startTime" value="' + escapeHTML(item.startTime) + '">') +
            field("Ends", '<input type="time" name="endTime" value="' + escapeHTML(item.endTime) + '">') +
            '<button type="button" class="remove">Remove this class</button></li>';
    }

    function review(ctx, found, preview) {
        const blank = { subject: "", day: "Monday", startTime: "09:00", endTime: "10:00", room: "" };
        const items = found.length ? found : [blank];
        const heading = found.length ? "Check " + found.length + (found.length === 1 ? " class" : " classes") : "Add your classes";
        ctx.sheet.innerHTML =
            '<h1 class="title">' + heading + "</h1>" +
            '<p class="lead">' + (found.length ? "Photo reading makes mistakes. Compare each class before saving."
                : preview ? "No classes could be read from that photo. Add them below, or try a clearer photo." : "Fill in one box per class.") + "</p>" +
            (preview ? '<img class="preview" alt="The photo you chose" src="' + preview + '">' : "") +
            '<ul class="rows-edit" style="list-style:none;margin:12px 0 0;padding:0">' + items.map(item => row(ctx, item)).join("") + "</ul>" +
            '<button type="button" class="btn wide" id="add">Add a class</button>' +
            '<p class="problem" role="alert"></p>' +
            '<button type="button" class="btn primary wide" id="save">Save my timetable</button>' +
            '<a class="btn wide" id="discard" href="#day">Cancel</a>';
        const list = ctx.sheet.querySelector(".rows-edit");
        const remember = () => {
            const kept = [...list.querySelectorAll(".edit")].map(readCard.bind(null, ctx));
            draft = kept.length ? { items: kept, preview } : null;
        };
        // a photo's results are worth keeping even before the first edit
        if (found.length) remember();
        list.addEventListener("input", remember);
        list.addEventListener("change", remember);
        // Cancel means the checking is over
        ctx.sheet.querySelector("#discard").addEventListener("click", () => { draft = null; });
        ctx.sheet.scrollTop = 0;
        list.addEventListener("click", event => {
            if (!event.target.closest(".remove")) return;
            const card = event.target.closest(".edit");
            const after = card.nextElementSibling;
            card.remove();
            remember();
            ctx.toast("Class removed", {
                label: "Undo",
                run: () => {
                    if (!list.isConnected) return;
                    list.insertBefore(card, after && after.isConnected ? after : null);
                    remember();
                }
            });
        });
        ctx.sheet.querySelector("#add").addEventListener("click", () => {
            list.insertAdjacentHTML("beforeend", row(ctx, blank));
            list.lastElementChild.querySelector("input").focus();
        });
        ctx.sheet.querySelector("#save").addEventListener("click", () => save(ctx, list));
    }

    // one card of the checking screen, as it stands now
    function readCard(ctx, card) {
        const value = name => card.querySelector('[name="' + name + '"]').value.trim();
        const location = value("location");
        const place = ctx.places.find(p => p.id === location);
        return {
            day: value("day"),
            startTime: value("startTime"),
            endTime: value("endTime"),
            subject: value("subject").slice(0, 60),
            location,
            // keep a room number such as B212 when the chosen place is the floor it is on
            room: place && !(place.rooms || []).includes(card.dataset.room) ? place.name : (card.dataset.room || "").slice(0, 12)
        };
    }

    function save(ctx, list) {
        const problem = ctx.sheet.querySelector(".problem");
        const classes = [];
        let bad = null;
        list.querySelectorAll(".edit").forEach((card, index) => {
            const item = { id: "mine-" + index, ...readCard(ctx, card) };
            const ok = item.subject && isValidTime(item.startTime) && isValidTime(item.endTime) && item.startTime < item.endTime;
            card.classList.toggle("bad", !ok);
            if (!ok && !bad) bad = card;
            classes.push(item);
        });
        if (bad) {
            problem.textContent = "The outlined class needs a subject, and it must end after it starts.";
            bad.querySelector("input").focus();
            return;
        }
        if (!classes.length) {
            problem.textContent = "Add at least one class before saving.";
            return;
        }
        if (!ctx.save(classes)) {
            problem.textContent = "This browser would not save it. It will last only until you close the page.";
            return;
        }
        draft = null;
        window.location.hash = "day";
    }

    window.ScanScreen = {
        show: ctx => { job++; start(ctx, ""); }
    };
})();
