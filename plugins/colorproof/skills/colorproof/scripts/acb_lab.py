#!/usr/bin/env python3
"""
acb_lab.py - Look up a Pantone color's authoritative Lab formula from the
PANTONE+ color book (.acb) that ships with the LogoPackageExpress CEP extension.

Adobe removed the Pantone libraries from Illustrator in 2022, but the .acb files
are still present inside that extension. This reads them directly.

Usage:
    python3 acb_lab.py 7683
    python3 acb_lab.py "PANTONE 7683 C"
    python3 acb_lab.py 2105 --book uncoated

Prints the matched book name and Lab L*/a*/b*, plus a derived sRGB hex for sanity.
Emits a one-line JSON on the last line for easy machine parsing:
    {"name": "PANTONE 7683 C", "lab": [44.71, 0, -38], "hex": "426DA9"}
"""
import sys, struct, glob, json, re

CANDIDATES = {
    "coated":   "PANTONE+ Solid Coated.acb",
    "uncoated": "PANTONE+ Solid Uncoated.acb",
}
SEARCH_GLOBS = [
    "/Library/Application Support/Adobe/CEP/extensions/**/Pantone Swatches/%s",
    "%s/Library/Application Support/Adobe/CEP/extensions/**/Pantone Swatches/%s",
]

def find_book(book):
    import os
    fname = CANDIDATES[book]
    home = os.path.expanduser("~")
    pats = [
        SEARCH_GLOBS[0] % fname,
        SEARCH_GLOBS[1] % (home, fname),
    ]
    hits = []
    for p in pats:
        hits += glob.glob(p, recursive=True)
    return hits[0] if hits else None

def parse_acb(path):
    data = open(path, "rb").read()
    assert data[:4] == b"8BCB", "not an ACB file"
    off = [4]
    def u16():
        v = struct.unpack(">H", data[off[0]:off[0]+2])[0]; off[0]+=2; return v
    def u32():
        v = struct.unpack(">I", data[off[0]:off[0]+4])[0]; off[0]+=4; return v
    def pstr():
        n = u32(); s = data[off[0]:off[0]+2*n].decode("utf-16-be"); off[0]+=2*n; return s
    ver = u16(); bookid = u16()
    title = pstr(); prefix = pstr(); postfix = pstr(); desc = pstr()
    count = u16(); pagesize = u16(); pagemid = u16(); cspace = u16()
    comp = {0:3,1:3,2:4,7:3,8:1}[cspace]
    colors = []
    for i in range(count):
        name = pstr()
        code = data[off[0]:off[0]+6]; off[0]+=6   # 6-byte color code
        comps = data[off[0]:off[0]+comp]; off[0]+=comp
        colors.append((name, comps))
    return cspace, prefix, postfix, colors

def lab_to_rgb_hex(L, a, b):
    # D50-ish Lab -> sRGB approximation, good enough for a sanity swatch
    y = (L + 16) / 116.0; x = a / 500.0 + y; z = y - b / 200.0
    def f(t):
        return t**3 if t**3 > 0.008856 else (t - 16/116.0) / 7.787
    X = 0.96422 * f(x); Y = 1.0 * f(y); Z = 0.82521 * f(z)
    r =  3.1338*X - 1.6168*Y - 0.4906*Z
    g = -0.9787*X + 1.9161*Y + 0.0334*Z
    bl=  0.0719*X - 0.2289*Y + 1.4052*Z
    def g2(c):
        c = 1.055*(c**(1/2.4)) - 0.055 if c > 0.0031308 else 12.92*c
        return max(0, min(255, round(c*255)))
    return "%02X%02X%02X" % (g2(r), g2(g), g2(bl))

def main():
    if len(sys.argv) < 2:
        print("usage: acb_lab.py <pantone number or name> [--book coated|uncoated]"); sys.exit(2)
    book = "coated"
    args = [a for a in sys.argv[1:]]
    if "--book" in args:
        i = args.index("--book"); book = args[i+1]; del args[i:i+2]
    query = " ".join(args)
    digits = re.sub(r"[^0-9]", "", query)   # match on the numeric core
    path = find_book(book)
    if not path:
        print("No PANTONE+ %s book found on this machine." % book); sys.exit(1)
    cspace, prefix, postfix, colors = parse_acb(path)
    if cspace != 7:
        print("Book color space is %d, not Lab(7) - cannot extract Lab." % cspace); sys.exit(1)
    match = None
    for name, comps in colors:
        if re.sub(r"[^0-9]", "", name) == digits and digits:
            match = (name, comps); break
    if not match:
        print("PANTONE %s not in the bundled %s book (older ~1365-color set; very new" % (digits, book))
        print("2xxx/3xxx additions may be absent). Fallbacks: harvest the spot's Lab from an")
        print(".ai that already uses it, supply CMYK/hex, or read it from Pantone Connect.")
        sys.exit(1)
    name, comps = match
    L = round(comps[0]*100.0/255.0, 2); a = comps[1]-128; b = comps[2]-128
    hexv = lab_to_rgb_hex(L, a, b)
    fullname = "PANTONE %s C" % digits if book == "coated" else "PANTONE %s U" % digits
    print("book:  %s" % path)
    print("match: %s  (stored '%s')" % (fullname, name))
    print("Lab:   L*=%.2f  a*=%d  b*=%d" % (L, a, b))
    print("~sRGB: #%s" % hexv)
    print(json.dumps({"name": fullname, "lab": [L, a, b], "hex": hexv}))

if __name__ == "__main__":
    main()
