#!/usr/bin/env bash
# Thin entrypoint. Startup ordering is Compose's job (depends_on + healthchecks),
# not a shell wait-loop, so this only execs whatever CMD was handed to it.
set -euo pipefail

exec "$@"
