#!/bin/zsh
# ColorProof: duplicate a whole folder to the external backup home before editing.
# Usage: snapshot.sh "<source folder>" ["<label>"]   -> prints destination path
SRC="$1"
LABEL="${2:-$(basename "$SRC")}"
HOME_BK="$HOME/Desktop/ColorProof Backups"
STAMP="$(date +'%Y-%m-%d %H%M%S')"
DEST="$HOME_BK/$LABEL - $STAMP"
mkdir -p "$DEST"
rsync -a --exclude '_ColorProof_Backups' "$SRC/" "$DEST/"
echo "$DEST"
