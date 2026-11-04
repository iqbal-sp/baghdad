#!/bin/sh
set -eu
cd "$(dirname "$0")"
printf 'Baghdad preview: http://127.0.0.1:8000\nPress Control+C to stop.\n'
# Python's static server sends no cache headers, so a browser may keep using an old script or
# stylesheet after an edit. "no-cache" makes it check every file (an unchanged one is a quick 304).
exec python3 -c '
import http.server

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

# The default queue of 5 waiting connections is too short for the page, which asks for dozens of
# modules and images at once: the rest were reset, and a module that failed to load stopped every
# script on the page.
class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128

Server(("127.0.0.1", 8000), Handler).serve_forever()
'
