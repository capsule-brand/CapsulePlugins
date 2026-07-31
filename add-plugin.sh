#!/usr/bin/env bash
# add-plugin.sh — scaffold a NEW Capsule plugin from a SKILL.md (or a skill folder),
# register it in the marketplace, and validate. Then publish it with ./release.sh.
#
# Usage:
#   ./add-plugin.sh <name> <SKILL.md | skill-folder> [--desc "..."] [--keywords "a,b,c"]
#
# Examples:
#   ./add-plugin.sh my-tool ~/Downloads/SKILL.md
#   ./add-plugin.sh my-tool ~/Downloads/my-tool/          # folder with SKILL.md (+ assets)
#
# After it runs:
#   ./release.sh <name>                          # commit, push, tag
#   claude plugin install <name>@capsule-plugins # on each machine
set -uo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$REPO"

NAME="${1:-}"; SRC="${2:-}"
if [ -z "$NAME" ] || [ -z "$SRC" ]; then
  echo "usage: ./add-plugin.sh <name> <SKILL.md|folder> [--desc \"...\"] [--keywords \"a,b,c\"]"; exit 2
fi
shift 2
DESC=""; KEYWORDS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --desc) DESC="${2:-}"; shift 2;;
    --keywords) KEYWORDS="${2:-}"; shift 2;;
    *) echo "unknown arg: $1"; exit 2;;
  esac
done

PDIR="plugins/$NAME"
if [ -e "$PDIR" ]; then echo "x $PDIR already exists — use ./release.sh to update it"; exit 1; fi

if [ -d "$SRC" ]; then SKILL="$(find "$SRC" -maxdepth 2 -name SKILL.md | head -1)"
elif [ -f "$SRC" ]; then SKILL="$SRC"
else echo "x not found: $SRC"; exit 1; fi
if [ -z "${SKILL:-}" ]; then echo "x no SKILL.md found in $SRC"; exit 1; fi

if [ -z "$DESC" ]; then
  DESC="$(python3 - "$SKILL" <<'PY'
import re,sys
t=open(sys.argv[1]).read()
m=re.match(r'^---\s*\n(.*?)\n---', t, re.S); fm=m.group(1) if m else ""
mm=re.search(r'(?m)^description:[ \t]*(?:>-|>|\|-|\|)?[ \t]*\n?((?:.*(?:\n|$))*?)(?=^\w[\w -]*:|\Z)', fm)
d=" ".join(x.strip() for x in mm.group(1).splitlines() if x.strip()) if mm else ""
print(d[:900])
PY
)"
fi
if [ -z "$DESC" ]; then DESC="$NAME plugin."; fi
case "$DESC" in "Designed by Capsule."*) ;; *) DESC="Designed by Capsule. $DESC";; esac

KW_JSON="$(python3 -c 'import json,sys;print(json.dumps([k.strip() for k in sys.argv[1].split(",") if k.strip()]))' "$KEYWORDS")"

mkdir -p "$PDIR/.claude-plugin" "$PDIR/skills/$NAME"
if [ -d "$SRC" ]; then cp -R "$(dirname "$SKILL")"/. "$PDIR/skills/$NAME"/; else cp "$SKILL" "$PDIR/skills/$NAME/SKILL.md"; fi

python3 - "$PDIR/.claude-plugin/plugin.json" "$NAME" "$DESC" "$KW_JSON" <<'PY'
import json,sys
p,name,desc,kw=sys.argv[1:5]
json.dump({"name":name,"version":"0.1.0","description":desc,
"author":{"name":"Capsule","url":"https://clearancelab.ai"},"keywords":json.loads(kw)},
open(p,"w"),indent=2,ensure_ascii=False); open(p,"a").write("\n")
PY

printf '# %s\n\n%s\n\n**Invoke:** `/%s:%s`, or just describe the job.\n' "$NAME" "$DESC" "$NAME" "$NAME" > "$PDIR/README.md"

python3 - "$NAME" "$DESC" "$KW_JSON" <<'PY'
import json,sys
name,desc,kw=sys.argv[1:4]
mj=".claude-plugin/marketplace.json"; m=json.load(open(mj))
if not any(x.get("name")==name for x in m["plugins"]):
    m["plugins"].append({"name":name,"source":f"./plugins/{name}","description":desc,
    "version":"0.1.0","author":{"name":"Capsule","url":"https://clearancelab.ai"},
    "keywords":json.loads(kw)})
    json.dump(m,open(mj,"w"),indent=2,ensure_ascii=False); open(mj,"a").write("\n")
PY

command -v claude >/dev/null 2>&1 && claude plugin validate "$PDIR" 2>&1 | tail -3

echo ""
echo "OK  scaffolded $PDIR (v0.1.0) + registered in marketplace.json"
echo "    next:  ./release.sh $NAME     then   claude plugin install $NAME@capsule-plugins"
