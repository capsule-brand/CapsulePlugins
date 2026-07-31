/*
 * ColorProof engine for Adobe Illustrator (ExtendScript / ES3-safe)
 */

function cpHome() {
    var h = $.getenv("HOME");
    if (!h) { h = Folder.myDocuments.fsName; }
    return h;
}

function readTextFile(path) {
    var f = new File(path);
    if (!f.exists) { return null; }
    f.encoding = "UTF-8";
    f.open("r");
    var s = f.read();
    f.close();
    return s;
}

function writeTextFile(path, text) {
    var f = new File(path);
    f.encoding = "UTF-8";
    f.open("w");
    f.write(text);
    f.close();
}

function inArray(arr, val) {
    for (var i = 0; i < arr.length; i++) { if (arr[i] === val) { return true; } }
    return false;
}

function pad2(n) { n = Math.round(n).toString(16); return n.length < 2 ? "0" + n : n; }
function trim(s) { return String(s).replace(/^\s+/, "").replace(/\s+$/, ""); }
function round(n) { return Math.round(Number(n)); }

function jsonEscape(s) {
    s = String(s);
    var out = "";
    for (var i = 0; i < s.length; i++) {
        var c = s.charAt(i);
        if (c === '"') { out += '\\"'; }
        else if (c === '\\') { out += '\\\\'; }
        else if (c === '\n') { out += '\\n'; }
        else if (c === '\r') { out += '\\r'; }
        else if (c === '\t') { out += '\\t'; }
        else { out += c; }
    }
    return out;
}

function jsonStringify(v) {
    if (v === null || v === undefined) { return "null"; }
    var t = typeof v;
    if (t === "number") { return isFinite(v) ? String(v) : "null"; }
    if (t === "boolean") { return v ? "true" : "false"; }
    if (t === "string") { return '"' + jsonEscape(v) + '"'; }
    if (v instanceof Array) {
        var parts = [];
        for (var i = 0; i < v.length; i++) { parts.push(jsonStringify(v[i])); }
        return "[" + parts.join(",") + "]";
    }
    var op = [];
    for (var k in v) {
        if (v.hasOwnProperty(k)) { op.push('"' + jsonEscape(k) + '":' + jsonStringify(v[k])); }
    }
    return "{" + op.join(",") + "}";
}

function hexFromRGB(r, g, b) { return (pad2(r) + pad2(g) + pad2(b)).toUpperCase(); }

function cmykToRGB(c, m, y, k) {
    c /= 100; m /= 100; y /= 100; k /= 100;
    return [255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k)];
}

function srgbToLin(v) {
    v = v / 255;
    return (v <= 0.04045) ? (v / 12.92) : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToLab(r, g, b) {
    var R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
    var X = R * 0.4124 + G * 0.3576 + B * 0.1805;
    var Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    var Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
    X /= 0.95047; Y /= 1.0; Z /= 1.08883;
    function f(t) { return (t > 0.008856) ? Math.pow(t, 1 / 3) : (7.787 * t + 16 / 116); }
    var fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE76(lab1, lab2) {
    var dl = lab1[0] - lab2[0], da = lab1[1] - lab2[1], db = lab1[2] - lab2[2];
    return Math.sqrt(dl * dl + da * da + db * db);
}

function descToRGB(desc) {
    if (desc.model === "rgb") { return [desc.values.r, desc.values.g, desc.values.b]; }
    else if (desc.model === "cmyk") { return cmykToRGB(desc.values.c, desc.values.m, desc.values.y, desc.values.k); }
    else if (desc.model === "gray") { var v = 255 * (1 - desc.values.gray / 100); return [v, v, v]; }
    else if (desc.model === "spot" && desc.alt) {
        if (desc.alt.model === "cmyk") { return cmykToRGB(desc.alt.c, desc.alt.m, desc.alt.y, desc.alt.k); }
        if (desc.alt.model === "rgb") { return [desc.alt.r, desc.alt.g, desc.alt.b]; }
    }
    return [128, 128, 128];
}

function paletteRGB(p) {
    if (p.hex) {
        var h = String(p.hex).replace(/^#/, "");
        return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    if (p.cmyk) { return cmykToRGB(p.cmyk[0], p.cmyk[1], p.cmyk[2], p.cmyk[3]); }
    return [128, 128, 128];
}

function normPantone(name) {
    var s = String(name).toUpperCase();
    s = s.replace(/PANTONE/g, " ").replace(/\bPMS\b/g, " ").replace(/\bP\b/g, " ");
    s = s.replace(/[\u00ae\u2122]/g, " ");
    s = trim(s.replace(/\s+/g, " "));
    return s;
}

function normHex(h) { return String(h).replace(/^#/, "").toUpperCase(); }

function isNeutralName(name) {
    var n = String(name).toUpperCase();
    return (n === "BLACK" || n === "WHITE" || n === "PAPER" || n === "REGISTRATION" || n === "[REGISTRATION]" || n === "NONE");
}

function isProtectedSwatchName(name) {
    var n = String(name).toUpperCase();
    return (n === "[NONE]" || n === "NONE" || n === "[REGISTRATION]" || n === "REGISTRATION" || n === "[BLACK]" || n === "WHITE" || n === "BLACK" || n === "PAPER");
}

function describeColor(col) {
    var tn = (col && col.typename) ? col.typename : "";
    if (tn === "RGBColor") {
        var r = round(col.red), g = round(col.green), b = round(col.blue);
        return { model: "rgb", values: { r: r, g: g, b: b }, signature: "RGB:" + hexFromRGB(r, g, b) };
    }
    if (tn === "CMYKColor") {
        var c = round(col.cyan), m = round(col.magenta), y = round(col.yellow), k = round(col.black);
        return { model: "cmyk", values: { c: c, m: m, y: y, k: k }, signature: "CMYK:" + c + "," + m + "," + y + "," + k };
    }
    if (tn === "GrayColor") {
        var gr = round(col.gray);
        return { model: "gray", values: { gray: gr }, signature: "GRAY:" + gr };
    }
    if (tn === "SpotColor") {
        var sp = col.spot;
        var nm = (sp && sp.name) ? sp.name : "Spot";
        var tint = (col.tint !== undefined && col.tint !== null) ? round(col.tint) : 100;
        var alt = null;
        try {
            var ac = sp.color;
            if (ac && ac.typename === "CMYKColor") { alt = { model: "cmyk", c: round(ac.cyan), m: round(ac.magenta), y: round(ac.yellow), k: round(ac.black) }; }
            else if (ac && ac.typename === "RGBColor") { alt = { model: "rgb", r: round(ac.red), g: round(ac.green), b: round(ac.blue) }; }
        } catch (e) {}
        return { model: "spot", name: nm, tint: tint, alt: alt, values: { name: nm, tint: tint }, signature: "SPOT:" + normPantone(nm) + "@" + tint };
    }
    if (tn === "GradientColor") { return { model: "gradient", values: {}, signature: "GRADIENT" }; }
    if (tn === "PatternColor") { return { model: "pattern", values: {}, signature: "PATTERN" }; }
    return null;
}

function isNeutralDesc(desc) {
    if (desc.model === "gray") { return true; }
    if (desc.model === "cmyk") { var v = desc.values; return (v.c === 0 && v.m === 0 && v.y === 0); }
    if (desc.model === "rgb") { var r = desc.values.r, g = desc.values.g, b = desc.values.b; return (r === g && g === b); }
    if (desc.model === "spot") { return isNeutralName(desc.name); }
    return false;
}

function matchDesc(desc, palette, neutralsPass) {
    if (neutralsPass && isNeutralDesc(desc)) { return { status: "neutral", matchedId: null, nearestId: null, deltaE: null }; }
    var i;
    if (desc.model === "spot") {
        var dn = normPantone(desc.name);
        for (i = 0; i < palette.length; i++) {
            if (palette[i].pantone && normPantone(palette[i].pantone) === dn) { return { status: "pass", matchedId: palette[i].id, nearestId: palette[i].id, deltaE: 0 }; }
        }
    } else if (desc.model === "cmyk") {
        for (i = 0; i < palette.length; i++) {
            var pc = palette[i].cmyk;
            if (pc && round(pc[0]) === desc.values.c && round(pc[1]) === desc.values.m && round(pc[2]) === desc.values.y && round(pc[3]) === desc.values.k) {
                return { status: "pass", matchedId: palette[i].id, nearestId: palette[i].id, deltaE: 0 };
            }
        }
    } else if (desc.model === "rgb") {
        var dh = hexFromRGB(desc.values.r, desc.values.g, desc.values.b);
        for (i = 0; i < palette.length; i++) {
            if (palette[i].hex && normHex(palette[i].hex) === dh) { return { status: "pass", matchedId: palette[i].id, nearestId: palette[i].id, deltaE: 0 }; }
        }
    } else if (desc.model === "gradient" || desc.model === "pattern") {
        return { status: "unproofable", matchedId: null, nearestId: null, deltaE: null };
    }
    var foundLab = (function () { var rgb = descToRGB(desc); return rgbToLab(rgb[0], rgb[1], rgb[2]); })();
    var best = null, bestId = null;
    for (i = 0; i < palette.length; i++) {
        var prgb = paletteRGB(palette[i]);
        var d = deltaE76(foundLab, rgbToLab(prgb[0], prgb[1], prgb[2]));
        if (best === null || d < best) { best = d; bestId = palette[i].id; }
    }
    return { status: "fail", matchedId: null, nearestId: bestId, deltaE: best === null ? null : Math.round(best * 10) / 10 };
}

function ColorBucket() { this.map = {}; this.order = []; }
ColorBucket.prototype.add = function (desc, location) {
    if (!desc || !desc.signature) { return; }
    var rec = this.map[desc.signature];
    if (!rec) {
        rec = { signature: desc.signature, model: desc.model, values: desc.values, tint: (desc.tint !== undefined ? desc.tint : null), name: (desc.name !== undefined ? desc.name : null), alt: (desc.alt !== undefined ? desc.alt : null), locations: [], count: 0, _desc: desc };
        this.map[desc.signature] = rec; this.order.push(desc.signature);
    }
    rec.count++;
    if (rec.locations.length < 6 && !inArray(rec.locations, location)) { rec.locations.push(location); }
};
ColorBucket.prototype.list = function () { var out = []; for (var i = 0; i < this.order.length; i++) { out.push(this.map[this.order[i]]); } return out; };

function gatherFromItems(items, bucket, flags, depthLabel) {
    for (var i = 0; i < items.length; i++) {
        var it = items[i]; var tn = it.typename;
        try {
            if (tn === "GroupItem") { gatherFromItems(it.pageItems, bucket, flags, depthLabel); }
            else if (tn === "CompoundPathItem") { gatherFromItems(it.pathItems, bucket, flags, depthLabel); }
            else if (tn === "PathItem") {
                if (it.filled) { addColor(it.fillColor, bucket, flags, "fill on path"); }
                if (it.stroked) { addColor(it.strokeColor, bucket, flags, "stroke on path"); }
            } else if (tn === "TextFrame") { gatherFromText(it, bucket, flags); }
            else if (tn === "PlacedItem" || tn === "RasterItem") { flags.raster = true; }
            else if (tn === "MeshItem") { flags.mesh = true; }
            else if (tn === "SymbolItem") { flags.symbol = true; }
            else if (tn === "PluginItem") { flags.plugin = true; }
        } catch (e) {}
    }
}

function addColor(col, bucket, flags, where) {
    var d = describeColor(col);
    if (!d) { return; }
    if (d.model === "gradient") {
        try {
            var stops = col.gradient.gradientStops;
            for (var s = 0; s < stops.length; s++) { var sd = describeColor(stops[s].color); if (sd) { bucket.add(sd, "gradient stop"); } }
            return;
        } catch (e) {}
    }
    bucket.add(d, where);
}

function gatherFromText(tf, bucket, flags) {
    try {
        var chars = tf.textRange.characters; var n = chars.length; var cap = (n > 4000) ? 4000 : n;
        for (var i = 0; i < cap; i++) {
            try {
                var ca = chars[i].characterAttributes;
                addColor(ca.fillColor, bucket, flags, "text fill");
                if (ca.strokeColor) { addColor(ca.strokeColor, bucket, flags, "text stroke"); }
            } catch (e) {}
        }
    } catch (e2) {
        try { var ca2 = tf.textRange.characterAttributes; addColor(ca2.fillColor, bucket, flags, "text fill"); } catch (e3) {}
    }
}

function docColorSpaceName(doc) {
    try { return (doc.documentColorSpace == DocumentColorSpace.RGB) ? "RGB" : "CMYK"; } catch (e) { return "unknown"; }
}

function proofOneFile(file, palette, opts) {
    var res = { file: file.name, path: file.fsName, documentColorSpace: "unknown", status: "pass", colors: [], notes: [], unusedSwatches: [], hasPlacedRaster: false };
    var doc = null;
    try { doc = app.open(file); } catch (eOpen) { res.status = "needs_review"; res.notes.push("could not open file: " + eOpen); return res; }
    try {
        res.documentColorSpace = docColorSpaceName(doc);
        var bucket = new ColorBucket();
        var flags = { raster: false, mesh: false, symbol: false, plugin: false };
        gatherFromItems(doc.pageItems, bucket, flags, "");
        var appliedSigs = {}; var usedSpotNames = {};
        var found = bucket.list();
        var anyFail = false, anyUnproofable = false;
        for (var i = 0; i < found.length; i++) {
            var rec = found[i];
            appliedSigs[rec.signature] = true;
            if (rec.model === "spot" && rec.name) { usedSpotNames[normPantone(rec.name)] = true; }
            var m = matchDesc(rec._desc, palette, opts.neutralsPass);
            res.colors.push({ signature: rec.signature, model: rec.model, values: rec.values, tint: rec.tint, name: rec.name, count: rec.count, locations: rec.locations, status: m.status, matchedId: m.matchedId, nearestId: m.nearestId, deltaE: m.deltaE });
            if (m.status === "fail") { anyFail = true; }
            if (m.status === "unproofable") { anyUnproofable = true; }
        }
        try {
            for (var s = 0; s < doc.swatches.length; s++) {
                var sw = doc.swatches[s];
                var sd = describeColor(sw.color);
                if (!sd) { continue; }
                if (isProtectedSwatchName(sw.name)) { continue; }
                var isUsed = (sd.model === "spot") ? !!usedSpotNames[normPantone(sd.name)] : !!appliedSigs[sd.signature];
                if (isUsed) { continue; }
                var sm = matchDesc(sd, palette, true);
                res.unusedSwatches.push({ name: sw.name, signature: sd.signature, model: sd.model, onPalette: (sm.status === "pass"), isNeutral: isNeutralDesc(sd) });
            }
        } catch (eSw) {}
        if (flags.raster) { res.hasPlacedRaster = true; res.notes.push("contains placed/embedded raster art - colors inside the image are not proofed"); }
        if (flags.mesh) { res.notes.push("contains a gradient mesh - mesh colors are not proofed in v1"); }
        if (flags.symbol) { res.notes.push("contains symbols - colors inside symbol definitions are not proofed in v1"); }
        if (flags.plugin) { res.notes.push("contains live/plugin art - review manually"); }
        if (anyFail) { res.status = "fail"; }
        else if (anyUnproofable || flags.raster || flags.mesh || flags.symbol || flags.plugin) { res.status = "needs_review"; }
        else { res.status = "pass"; }
    } catch (eProc) { res.status = "needs_review"; res.notes.push("error while reading colors: " + eProc); }
    try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (eClose) {}
    return res;
}

function listSupportedFiles(folder, exts) {
    var all = folder.getFiles(); var out = [];
    for (var i = 0; i < all.length; i++) {
        var f = all[i];
        if (!(f instanceof File)) { continue; }
        var nm = f.name.toLowerCase();
        for (var e = 0; e < exts.length; e++) {
            if (nm.length > exts[e].length + 1 && nm.substr(nm.length - exts[e].length - 1) === "." + exts[e]) { out.push(f); break; }
        }
    }
    return out;
}

function runProof(job) {
    var folder = new Folder(job.folder);
    var exts = (job.options && job.options.extensions) ? job.options.extensions : ["ai", "eps", "pdf"];
    var opts = { neutralsPass: !(job.options && job.options.neutralsPass === false) };
    var files = listSupportedFiles(folder, exts);
    var result = { mode: "proof", generatedAt: (new Date()).toString(), folder: folder.fsName, paletteEcho: job.palette, files: [], summary: { total: 0, pass: 0, fail: 0, needs_review: 0 } };
    for (var i = 0; i < files.length; i++) {
        var fr = proofOneFile(files[i], job.palette, opts);
        result.files.push(fr); result.summary.total++;
        if (fr.status === "pass") { result.summary.pass++; } else if (fr.status === "fail") { result.summary.fail++; } else { result.summary.needs_review++; }
    }
    return result;
}

function paletteById(palette, id) { for (var i = 0; i < palette.length; i++) { if (palette[i].id === id) { return palette[i]; } } return null; }

function pdfSiblingFor(file) {
    var nm = file.name; var dot = nm.lastIndexOf(".");
    var base = (dot > 0) ? nm.substr(0, dot) : nm;
    return new File(file.parent.fsName + "/" + base + ".pdf");
}

function pdfModeForApply(job, apply) {
    var sawSpot = false, sawProcess = false;
    for (var a = 0; a < apply.length; a++) {
        var p = paletteById(job.palette, apply[a].toId);
        if (!p) { continue; }
        if (p.pantone) { sawSpot = true; } else { sawProcess = true; }
    }
    if (sawSpot && !sawProcess) { return "spot"; }
    if (sawProcess && !sawSpot) { return "cmyk"; }
    return "preserve";
}

function buildPdfOptions(mode) {
    var o = new PDFSaveOptions();
    try { o.pDFPreset = "[Illustrator Default]"; } catch (ep) {}
    try { o.compatibility = PDFCompatibility.ACROBAT5; } catch (ec) {}
    try { o.preserveEditability = false; } catch (ee) {}
    try { o.colorProfileID = ColorProfile.None; } catch (epr) {}
    if (mode === "cmyk") {
        try { o.colorConversionID = ColorConversion.COLORCONVERSIONREPURPOSE; } catch (e1) {}
        try { o.colorDestinationID = ColorDestination.COLORDESTINATIONDOCCMYK; } catch (e2) {}
    } else {
        try { o.colorConversionID = ColorConversion.None; } catch (e3) {}
        try { o.colorDestinationID = ColorDestination.None; } catch (e4) {}
    }
    return o;
}

function doReexportPDF(file, mode) {
    var pdf = pdfSiblingFor(file);
    var rec = { file: file.name, pdf: pdf.name, mode: mode, status: "ok" };
    if (!pdf.exists) { rec.status = "skipped"; rec.reason = "no existing PDF to replace"; return rec; }
    var d = null;
    try { d = app.open(file); } catch (eo) { rec.status = "error"; rec.reason = "open failed: " + eo; return rec; }
    try { d.saveAs(pdf, buildPdfOptions(mode)); } catch (es) { rec.status = "error"; rec.reason = "saveAs failed: " + es; }
    try { d.close(SaveOptions.DONOTSAVECHANGES); } catch (ecl) {}
    return rec;
}

function runReexport(job) {
    var folder = new Folder(job.folder);
    var result = { mode: "reexport", generatedAt: (new Date()).toString(), folder: folder.fsName, backupDir: null, reexports: [] };
    result.backupDir = (job.options && job.options.snapshotDir) ? job.options.snapshotDir : null;
    var fileFilter = {}; var hasFilter = false;
    if (job.files && job.files.length) { hasFilter = true; for (var i = 0; i < job.files.length; i++) { fileFilter[job.files[i]] = true; } }
    var defaultMode = (job.options && job.options.pdfColor) ? job.options.pdfColor : "preserve";
    var aiFiles = listSupportedFiles(folder, ["ai"]);
    for (var f = 0; f < aiFiles.length; f++) {
        var file = aiFiles[f];
        if (hasFilter && !fileFilter[file.name]) { continue; }
        var mode = defaultMode;
        if (job.modes && job.modes[file.name]) { mode = job.modes[file.name]; }
        result.reexports.push(doReexportPDF(file, mode));
    }
    return result;
}

function findOrCreateSpot(doc, p) {
    var target = normPantone(p.pantone);
    for (var i = 0; i < doc.spots.length; i++) { if (normPantone(doc.spots[i].name) === target) { return doc.spots[i]; } }
    var sp = doc.spots.add(); sp.name = p.pantone;
    try { sp.colorType = ColorModel.SPOT; } catch (e) {}
    if (p.lab) {
        var lab = new LabColor(); lab.l = p.lab[0]; lab.a = p.lab[1]; lab.b = p.lab[2]; sp.color = lab;
    } else if (doc.documentColorSpace == DocumentColorSpace.CMYK && p.cmyk) {
        var c = new CMYKColor(); c.cyan = p.cmyk[0]; c.magenta = p.cmyk[1]; c.yellow = p.cmyk[2]; c.black = p.cmyk[3]; sp.color = c;
    } else if (p.hex) {
        var h = normHex(p.hex); var r = new RGBColor(); r.red = parseInt(h.substr(0, 2), 16); r.green = parseInt(h.substr(2, 2), 16); r.blue = parseInt(h.substr(4, 2), 16); sp.color = r;
    }
    return sp;
}

function makeTarget(doc, p) {
    if (p.pantone) { var sp = findOrCreateSpot(doc, p); var s = new SpotColor(); s.spot = sp; s.tint = 100; return s; }
    if (doc.documentColorSpace == DocumentColorSpace.CMYK && p.cmyk) {
        var c = new CMYKColor(); c.cyan = p.cmyk[0]; c.magenta = p.cmyk[1]; c.yellow = p.cmyk[2]; c.black = p.cmyk[3]; return c;
    }
    if (p.hex) {
        var h = normHex(p.hex); var r = new RGBColor(); r.red = parseInt(h.substr(0, 2), 16); r.green = parseInt(h.substr(2, 2), 16); r.blue = parseInt(h.substr(4, 2), 16); return r;
    }
    return null;
}

function fixItems(items, mapObj, counter) {
    for (var i = 0; i < items.length; i++) {
        var it = items[i]; var tn = it.typename;
        try {
            if (tn === "GroupItem") { fixItems(it.pageItems, mapObj, counter); }
            else if (tn === "CompoundPathItem") { fixItems(it.pathItems, mapObj, counter); }
            else if (tn === "PathItem") {
                if (it.filled) { var df = describeColor(it.fillColor); if (df && mapObj[df.signature]) { it.fillColor = mapObj[df.signature]; counter.n++; } }
                if (it.stroked) { var ds = describeColor(it.strokeColor); if (ds && mapObj[ds.signature]) { it.strokeColor = mapObj[ds.signature]; counter.n++; } }
            } else if (tn === "TextFrame") {
                try {
                    var chars = it.textRange.characters; var n = chars.length; var cap = (n > 4000) ? 4000 : n;
                    for (var ci = 0; ci < cap; ci++) {
                        var ca = chars[ci].characterAttributes; var dtf = describeColor(ca.fillColor);
                        if (dtf && mapObj[dtf.signature]) { ca.fillColor = mapObj[dtf.signature]; counter.n++; }
                    }
                } catch (et) {}
            }
        } catch (e) {}
    }
}

function removeUnusedSwatches(doc, palette, mode) {
    var bucket = new ColorBucket(); var flags = { raster: false, mesh: false, symbol: false, plugin: false };
    gatherFromItems(doc.pageItems, bucket, flags, "");
    var usedSig = {}, usedSpot = {}; var list = bucket.list();
    for (var i = 0; i < list.length; i++) { usedSig[list[i].signature] = true; if (list[i].model === "spot" && list[i].name) { usedSpot[normPantone(list[i].name)] = true; } }
    var removeNames = [];
    for (var s = 0; s < doc.swatches.length; s++) {
        var sw = doc.swatches[s]; var sd = describeColor(sw.color);
        if (!sd) { continue; }
        if (isProtectedSwatchName(sw.name)) { continue; }
        var isUsed = (sd.model === "spot") ? !!usedSpot[normPantone(sd.name)] : !!usedSig[sd.signature];
        if (isUsed) { continue; }
        if (mode === "non-palette") { if (isNeutralDesc(sd)) { continue; } var m = matchDesc(sd, palette, true); if (m.status === "pass") { continue; } }
        removeNames.push(sw.name);
    }
    var removed = [];
    for (var r = 0; r < removeNames.length; r++) { try { doc.swatches.getByName(removeNames[r]).remove(); removed.push(removeNames[r]); } catch (e) {} }
    return removed;
}

function runFix(job) {
    var folder = new Folder(job.folder);
    var result = { mode: "fix", generatedAt: (new Date()).toString(), folder: folder.fsName, backupDir: null, changes: [], skipped: [], verify: [], reexports: [] };
    var cleanupMode = (job.options && job.options.removeUnusedSwatches) ? job.options.removeUnusedSwatches : "non-palette";
    var doCleanup = (cleanupMode === "non-palette" || cleanupMode === "all");
    result.backupDir = (job.options && job.options.snapshotDir) ? job.options.snapshotDir : null;
    var byFile = {};
    for (var i = 0; i < job.mappings.length; i++) { var mp = job.mappings[i]; var key = mp.file; if (!byFile[key]) { byFile[key] = []; } byFile[key].push(mp); }
    var files = listSupportedFiles(folder, ["ai", "eps", "pdf"]);
    for (var fI = 0; fI < files.length; fI++) {
        var file = files[fI]; var nm = file.name; var lower = nm.toLowerCase();
        var apply = [];
        if (byFile[nm]) { apply = apply.concat(byFile[nm]); }
        if (byFile["*"]) { apply = apply.concat(byFile["*"]); }
        if (apply.length === 0 && !doCleanup) { continue; }
        if (lower.substr(lower.length - 3) !== ".ai") { result.skipped.push({ file: nm, reason: "fix writes .ai only in v1" }); continue; }
        // originals are snapshotted to the external backup home by the runner before any edit
        var doc = null;
        try { doc = app.open(file); } catch (eo) { result.skipped.push({ file: nm, reason: "could not open: " + eo }); continue; }
        var removedSwatches = [];
        if (doCleanup) { try { removedSwatches = removeUnusedSwatches(doc, job.palette, cleanupMode); } catch (ecu) {} }
        var mapObj = {}; var perFileChanges = [];
        for (var a = 0; a < apply.length; a++) {
            var p = paletteById(job.palette, apply[a].toId);
            if (!p) { continue; }
            var target = makeTarget(doc, p);
            if (target) { mapObj[apply[a].fromSignature] = target; perFileChanges.push({ from: apply[a].fromSignature, toId: apply[a].toId }); }
        }
        var counter = { n: 0 };
        fixItems(doc.pageItems, mapObj, counter);
        if (counter.n === 0 && removedSwatches.length === 0) {
            result.changes.push({ file: nm, applied: [], instancesChanged: 0, removedSwatches: [], note: "no changes needed" });
            try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (enc) {} continue;
        }
        try { doc.save(); } catch (es) { result.skipped.push({ file: nm, reason: "save failed: " + es }); try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {} continue; }
        var verifyRes = null;
        try { var opts = { neutralsPass: !(job.options && job.options.neutralsPass === false) }; doc.close(SaveOptions.SAVECHANGES); verifyRes = proofOneFile(file, job.palette, opts); } catch (ev) { try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e3) {} }
        result.changes.push({ file: nm, applied: perFileChanges, instancesChanged: counter.n, removedSwatches: removedSwatches });
        if (job.options && job.options.reexportPDF) {
            var pmode = (job.options.pdfColor && job.options.pdfColor !== "auto") ? job.options.pdfColor : pdfModeForApply(job, apply);
            result.reexports.push(doReexportPDF(file, pmode));
        }
        if (verifyRes) { result.verify.push({ file: nm, status: verifyRes.status, remainingFails: countFails(verifyRes) }); }
    }
    return result;
}

function pad2num(n) { n = Math.round(n); return (n < 10) ? "0" + n : "" + n; }
function countFails(fr) { var c = 0; for (var i = 0; i < fr.colors.length; i++) { if (fr.colors[i].status === "fail") { c++; } } return c; }

(function main() {
    var jobPath = cpHome() + "/.colorproof/job.jsxinc";
    var resultPath = cpHome() + "/.colorproof/result.json";
    var result;
    try {
        if (!(new File(jobPath)).exists) { throw "No job file at " + jobPath; }
        $.evalFile(new File(jobPath));
        if (typeof COLORPROOF_JOB === "undefined") { throw "Job file did not define COLORPROOF_JOB"; }
        var job = COLORPROOF_JOB;
        var prevUIL = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        try { if (job.mode === "package") { result = (job.action === "fix") ? packageFix(job) : packageProof(job); } else if (job.mode === "fix") { result = runFix(job); } else if (job.mode === "reexport") { result = runReexport(job); } else { result = runProof(job); } }
        finally { app.userInteractionLevel = prevUIL; }
    } catch (e) { result = { mode: "error", error: String(e), generatedAt: (new Date()).toString() }; }
    writeTextFile(resultPath, jsonStringify(result));
})();


/* ===================== ColorProof v2: whole-package, multi-format, value-based swaps ===================== */

function endsWithDot(name, ext) {
    var n = name.toLowerCase(); var e = "." + ext.toLowerCase();
    return (n.length > e.length && n.substr(n.length - e.length) === e);
}

function collectByExtRecursive(folder, exts, out) {
    var items;
    try { items = folder.getFiles(); } catch (e) { return out; }
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it instanceof Folder) {
            if (it.name === "_ColorProof_Backups") { continue; }
            collectByExtRecursive(it, exts, out);
        } else if (it instanceof File) {
            for (var e = 0; e < exts.length; e++) { if (endsWithDot(it.name, exts[e])) { out.push(it); break; } }
        }
    }
    return out;
}

function isEmptyObj(o) { for (var k in o) { if (o.hasOwnProperty(k)) { return false; } } return true; }
function cmykEq(a, b) { return a && b && round(a[0]) === round(b[0]) && round(a[1]) === round(b[1]) && round(a[2]) === round(b[2]) && round(a[3]) === round(b[3]); }

function swapTargetForDesc(desc, swaps) {
    for (var s = 0; s < swaps.length; s++) {
        var sw = swaps[s]; var from = sw.from || {};
        if (desc.model === "spot") {
            if (from.pantone && normPantone(desc.name) === normPantone(from.pantone)) { return { rep: "pantone", to: sw.to, swap: sw }; }
            if (from.cmyk && desc.alt && desc.alt.model === "cmyk" && cmykEq([desc.alt.c, desc.alt.m, desc.alt.y, desc.alt.k], from.cmyk)) { return { rep: "cmyk", to: sw.to, swap: sw }; }
            if (from.cmyk && normPantone(desc.name) === normPantone("C=" + from.cmyk[0] + " M=" + from.cmyk[1] + " Y=" + from.cmyk[2] + " K=" + from.cmyk[3])) { return { rep: "cmyk", to: sw.to, swap: sw }; }
        } else if (desc.model === "cmyk") {
            if (from.cmyk && cmykEq([desc.values.c, desc.values.m, desc.values.y, desc.values.k], from.cmyk)) { return { rep: "cmyk", to: sw.to, swap: sw }; }
        } else if (desc.model === "rgb") {
            var dh = hexFromRGB(desc.values.r, desc.values.g, desc.values.b);
            if (from.hex && normHex(from.hex) === dh) { return { rep: "rgb", to: sw.to, swap: sw }; }
        }
    }
    return null;
}

function makeColorFromRep(doc, rep, to) {
    if (rep === "pantone" && to.pantone) { return makeTarget(doc, { pantone: to.pantone, lab: to.lab, cmyk: to.cmyk, hex: to.hex }); }
    if (rep === "cmyk" && to.cmyk) { var c = new CMYKColor(); c.cyan = to.cmyk[0]; c.magenta = to.cmyk[1]; c.yellow = to.cmyk[2]; c.black = to.cmyk[3]; return c; }
    if (rep === "rgb" && to.hex) { var h = normHex(to.hex); var r = new RGBColor(); r.red = parseInt(h.substr(0, 2), 16); r.green = parseInt(h.substr(2, 2), 16); r.blue = parseInt(h.substr(4, 2), 16); return r; }
    if (to.cmyk) { var c2 = new CMYKColor(); c2.cyan = to.cmyk[0]; c2.magenta = to.cmyk[1]; c2.yellow = to.cmyk[2]; c2.black = to.cmyk[3]; return c2; }
    if (to.hex) { var h2 = normHex(to.hex); var r2 = new RGBColor(); r2.red = parseInt(h2.substr(0, 2), 16); r2.green = parseInt(h2.substr(2, 2), 16); r2.blue = parseInt(h2.substr(4, 2), 16); return r2; }
    return null;
}

function swapsToPalette(swaps) {
    var pal = [];
    for (var i = 0; i < swaps.length; i++) { var to = swaps[i].to || {}; pal.push({ id: "t" + i, name: swaps[i].name || ("target" + i), pantone: to.pantone, cmyk: to.cmyk, hex: to.hex }); }
    return pal;
}

function parseCmykName(name) { var m = String(name).match(/C=(\d+)\s*M=(\d+)\s*Y=(\d+)\s*K=(\d+)/i); return m ? [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10)] : null; }
function cmykMatchesPalette(cmyk, palette) { for (var i = 0; i < palette.length; i++) { if (palette[i].cmyk && cmykEq(cmyk, palette[i].cmyk)) { return palette[i]; } } return null; }
function evalAgainstPalette(desc, palette) {
    if (isNeutralDesc(desc)) { return { status: "neutral", match: null }; }
    var p, i;
    if (desc.model === "cmyk") { p = cmykMatchesPalette([desc.values.c, desc.values.m, desc.values.y, desc.values.k], palette); return p ? { status: "pass", match: p.name } : { status: "fail", match: null }; }
    if (desc.model === "rgb") { var dh = hexFromRGB(desc.values.r, desc.values.g, desc.values.b); for (i = 0; i < palette.length; i++) { if (palette[i].hex && normHex(palette[i].hex) === dh) { return { status: "pass", match: palette[i].name }; } } return { status: "fail", match: null }; }
    if (desc.model === "spot") {
        for (i = 0; i < palette.length; i++) { if (palette[i].pantone && normPantone(palette[i].pantone) === normPantone(desc.name)) { return { status: "pass", match: palette[i].name }; } }
        var nameC = parseCmykName(desc.name);
        if (nameC) { p = cmykMatchesPalette(nameC, palette); return p ? { status: "pass", match: p.name } : { status: "fail", match: null }; }
        return { status: "uncheckable", match: null };
    }
    return { status: "uncheckable", match: null };
}
function svgHexStatus(hx, palette) {
    if (!palette) { return null; }
    var hasHex = false;
    for (var i = 0; i < palette.length; i++) { if (palette[i].hex) { hasHex = true; if (normHex(palette[i].hex) === String(hx).toUpperCase()) { return "pass"; } } }
    return hasHex ? "fail" : "uncheckable";
}

function extractHexCounts(txt) {
    var map = {}; var lower = txt.toLowerCase(); var i = 0; var n = lower.length;
    while (i < n) {
        if (lower.charAt(i) === '#') { var hx = lower.substr(i + 1, 6); if (/^[0-9a-f]{6}$/.test(hx)) { map[hx] = (map[hx] || 0) + 1; i += 7; continue; } }
        i++;
    }
    return map;
}

function replaceHexAll(txt, fromHex, toHex) {
    var fl = "#" + fromHex.toLowerCase(); var lower = txt.toLowerCase();
    var out = ""; var idx = 0; var count = 0;
    while (true) {
        var p = lower.indexOf(fl, idx);
        if (p === -1) { out += txt.substr(idx); break; }
        out += txt.substr(idx, p - idx) + "#" + toHex.toLowerCase();
        idx = p + fl.length; count++;
    }
    return { text: out, count: count };
}

function parsePxFromName(name) { var m = name.match(/(\d+)px/i); return m ? parseInt(m[1], 10) : 0; }

function siblingsByExt(file, ext) {
    var folder = file.parent; var nm = file.name; var dot = nm.lastIndexOf("."); var base = (dot > 0) ? nm.substr(0, dot) : nm;
    var out = []; var items;
    try { items = folder.getFiles(); } catch (e) { return out; }
    for (var i = 0; i < items.length; i++) {
        var it = items[i]; if (!(it instanceof File)) { continue; }
        if (!endsWithDot(it.name, ext)) { continue; }
        if (it.name.substr(0, base.length) === base) { out.push(it); }
    }
    return out;
}

function exportRasterSiblings(srcFile, ext, kind, outArr) {
    var sibs = siblingsByExt(srcFile, ext);
    if (!sibs.length) { return; }
    var doc = null;
    try { doc = app.open(srcFile); } catch (e) { outArr.push({ src: srcFile.name, status: "error", reason: "open" }); return; }
    var wpt = 0;
    try { var ab = doc.artboards[0].artboardRect; wpt = ab[2] - ab[0]; } catch (e2) {}
    for (var i = 0; i < sibs.length; i++) {
        var px = parsePxFromName(sibs[i].name);
        var scale = (px && wpt) ? (px / wpt * 100) : 100;
        var base = sibs[i].fsName.replace(new RegExp("\\." + ext + "$", "i"), "");
        try {
            if (kind === "png") { var o = new ExportOptionsPNG24(); o.transparency = true; o.artBoardClipping = true; o.antiAliasing = true; o.horizontalScale = scale; o.verticalScale = scale; doc.exportFile(new File(base), ExportType.PNG24, o); }
            else { var oj = new ExportOptionsJPEG(); oj.antiAliasing = true; oj.qualitySetting = 80; oj.artBoardClipping = true; oj.horizontalScale = scale; oj.verticalScale = scale; doc.exportFile(new File(base), ExportType.JPEG, oj); }
            outArr.push({ file: sibs[i].name, px: px, status: "ok" });
        } catch (ex) { outArr.push({ file: sibs[i].name, status: "error", reason: String(ex) }); }
    }
    try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (ec) {}
}

function svgSwapFile(svgFile, swaps, outArr) {
    var txt = readTextFile(svgFile.fsName);
    if (txt === null) { outArr.push({ file: svgFile.name, status: "error", reason: "read" }); return false; }
    var changed = 0; var cur = txt;
    for (var s = 0; s < swaps.length; s++) {
        if (swaps[s].from && swaps[s].from.hex && swaps[s].to && swaps[s].to.hex) {
            var r = replaceHexAll(cur, normHex(swaps[s].from.hex), normHex(swaps[s].to.hex));
            cur = r.text; changed += r.count;
        }
    }
    if (changed > 0) { writeTextFile(svgFile.fsName, cur); }
    outArr.push({ file: svgFile.name, replaced: changed, status: "ok" });
    return changed > 0;
}

function packageProof(job) {
    var root = new Folder(job.root || job.folder);
    var palette = job.palette || null;
    var result = { mode: "package", action: "proof", generatedAt: (new Date()).toString(), root: root.fsName, expected: palette, counts: {}, aiColors: [], svgColors: [], summary: { pass: 0, fail: 0, neutral: 0, uncheckable: 0 } };
    result.counts.aiFiles = collectByExtRecursive(root, ["ai"], []).length;
    result.counts.svgFiles = collectByExtRecursive(root, ["svg"], []).length;
    result.counts.pdfFiles = collectByExtRecursive(root, ["pdf"], []).length;
    result.counts.jpgFiles = collectByExtRecursive(root, ["jpg", "jpeg"], []).length;
    result.counts.pngFiles = collectByExtRecursive(root, ["png"], []).length;
    var agg = {}; var order = [];
    var aiFiles = collectByExtRecursive(root, ["ai"], []);
    for (var i = 0; i < aiFiles.length; i++) {
        var f = aiFiles[i]; var doc = null;
        try { doc = app.open(f); } catch (eo) { continue; }
        try {
            var bucket = new ColorBucket(); var flags = {};
            gatherFromItems(doc.pageItems, bucket, flags, "");
            var found = bucket.list();
            for (var c = 0; c < found.length; c++) {
                var sig = found[c].signature;
                if (!agg[sig]) { var _st = palette ? evalAgainstPalette(found[c]._desc, palette) : null; agg[sig] = { signature: sig, model: found[c].model, name: found[c].name, values: found[c].values, files: 0, instances: 0, status: _st ? _st.status : null, match: _st ? _st.match : null }; order.push(sig); }
                agg[sig].files++; agg[sig].instances += found[c].count;
            }
        } catch (e) {}
        try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (ec) {}
    }
    for (var k = 0; k < order.length; k++) { var ac = agg[order[k]]; result.aiColors.push(ac); if (ac.status === "pass") { result.summary.pass++; } else if (ac.status === "fail") { result.summary.fail++; } else if (ac.status === "neutral") { result.summary.neutral++; } else if (ac.status === "uncheckable") { result.summary.uncheckable++; } }
    var hagg = {}; var horder = [];
    var svgFiles = collectByExtRecursive(root, ["svg"], []);
    for (var j = 0; j < svgFiles.length; j++) {
        var txt = readTextFile(svgFiles[j].fsName) || "";
        var counts = extractHexCounts(txt);
        for (var hx in counts) { if (!counts.hasOwnProperty(hx)) { continue; } if (!hagg[hx]) { hagg[hx] = { hex: "#" + hx, files: 0, instances: 0, status: svgHexStatus(hx, palette) }; horder.push(hx); } hagg[hx].files++; hagg[hx].instances += counts[hx]; }
    }
    for (var m = 0; m < horder.length; m++) { result.svgColors.push(hagg[horder[m]]); }
    return result;
}

function packageFix(job) {
    var root = new Folder(job.root || job.folder);
    var result = { mode: "package", action: "fix", generatedAt: (new Date()).toString(), root: root.fsName, snapshotDir: (job.options && job.options.snapshotDir) || null, ai: [], svg: [], pdf: [], jpg: [], png: [] };
    var swaps = job.swaps || []; var opts = job.options || {};
    var doPDF = (opts.reexportPDF !== false), doJPG = (opts.reexportJPG !== false), doPNG = (opts.reexportPNG !== false), doSVG = (opts.svg !== false);
    var cleanupMode = opts.removeUnusedSwatches ? opts.removeUnusedSwatches : "non-palette";
    var doCleanup = (cleanupMode === "non-palette" || cleanupMode === "all");
    var pseudoPalette = swapsToPalette(swaps);
    var aiFiles = collectByExtRecursive(root, ["ai"], []);
    for (var i = 0; i < aiFiles.length; i++) {
        var f = aiFiles[i]; var rec = { file: f.name, instancesChanged: 0, applied: [], removedSwatches: [] };
        var changed = false, anySpot = false, anyProc = false; var doc = null;
        try { doc = app.open(f); } catch (eo) { rec.error = "open: " + eo; result.ai.push(rec); continue; }
        try {
            var bucket = new ColorBucket(); var flags = {};
            gatherFromItems(doc.pageItems, bucket, flags, "");
            var found = bucket.list(); var mapObj = {};
            for (var c = 0; c < found.length; c++) {
                var t = swapTargetForDesc(found[c]._desc, swaps);
                if (t) { var tc = makeColorFromRep(doc, t.rep, t.to); if (tc) { mapObj[found[c].signature] = tc; rec.applied.push({ from: found[c].signature, as: t.rep, swap: t.swap.name }); if (t.rep === "pantone") { anySpot = true; } else { anyProc = true; } } }
            }
            var counter = { n: 0 };
            if (!isEmptyObj(mapObj)) { fixItems(doc.pageItems, mapObj, counter); }
            rec.instancesChanged = counter.n;
            if (doCleanup) { try { rec.removedSwatches = removeUnusedSwatches(doc, pseudoPalette, cleanupMode); } catch (ecu) {} }
            changed = (counter.n > 0 || rec.removedSwatches.length > 0);
            if (changed) { try { doc.save(); } catch (es) { rec.error = "save: " + es; changed = false; } }
            else { rec.note = "no changes"; }
        } catch (e) { rec.error = "proc: " + e; }
        try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (ecl) {}
        if (changed) {
            if (doPDF) { var mode = (anySpot && !anyProc) ? "spot" : (anyProc ? "cmyk" : "preserve"); result.pdf.push(doReexportPDF(f, mode)); }
            if (doJPG) { exportRasterSiblings(f, "jpg", "jpg", result.jpg); }
        }
        result.ai.push(rec);
    }
    if (doSVG) {
        var svgFiles = collectByExtRecursive(root, ["svg"], []);
        for (var j = 0; j < svgFiles.length; j++) {
            var changedSvg = svgSwapFile(svgFiles[j], swaps, result.svg);
            if (changedSvg && doPNG) { exportRasterSiblings(svgFiles[j], "png", "png", result.png); }
        }
    }
    return result;
}
