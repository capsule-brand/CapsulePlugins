#!/bin/zsh
# ColorProof runner: run the engine in Illustrator with a long Apple-event timeout,
# then generate + open the HTML report. Job is read from ~/.colorproof/job.jsxinc.
CP="$HOME/.colorproof"
osascript <<OSA
with timeout of 1800 seconds
  tell application "Adobe Illustrator" to do javascript (read POSIX file "$CP/colorproof.jsx")
end timeout
OSA
node "$CP/report.js" >/dev/null 2>&1
open "$CP/report.html"
