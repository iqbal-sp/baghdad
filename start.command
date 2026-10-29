#!/bin/sh
set -eu
cd "$(dirname "$0")"
printf 'Baghdad preview: http://127.0.0.1:8000\nPress Control+C to stop.\n'
exec python3 -m http.server 8000 --bind 127.0.0.1
