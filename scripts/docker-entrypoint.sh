#!/bin/sh
set -e

# ---------------------------------------------------------------------------
# Tailscale sidecar — starts if TAILSCALE_AUTHKEY is set.
# ---------------------------------------------------------------------------
if [ -n "$TAILSCALE_AUTHKEY" ]; then
    echo "Starting Tailscale daemon..."
    tailscaled \
        --state=/var/lib/tailscale/tailscaled.state \
        --socket=/var/run/tailscale/tailscaled.sock \
        --tun=userspace-networking &

    # Wait for the daemon socket to appear
    for i in $(seq 1 30); do
        if [ -S /var/run/tailscale/tailscaled.sock ]; then break; fi
        sleep 0.5
    done

    TAILSCALE_ARGS="--authkey=${TAILSCALE_AUTHKEY} --ssh"
    if [ -n "$TAILSCALE_HOSTNAME" ]; then
        TAILSCALE_ARGS="${TAILSCALE_ARGS} --hostname=${TAILSCALE_HOSTNAME}"
    else
        TAILSCALE_ARGS="${TAILSCALE_ARGS} --hostname=paperclip-railway"
    fi

    tailscale --socket=/var/run/tailscale/tailscaled.sock up $TAILSCALE_ARGS
    echo "Tailscale is up: $(tailscale --socket=/var/run/tailscale/tailscaled.sock ip -4 2>/dev/null || echo 'connecting...')"
fi

# ---------------------------------------------------------------------------
# Non-root fast path (Railway, rootless containers).
#
# Railway runs the container as a non-root UID and may mount a persistent
# volume at /paperclip that is owned by root. We can't chown without root, so
# probe writability and fail loudly if the volume isn't usable — silently
# falling through would crash later in a confusing place.
# ---------------------------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
    if [ ! -w /paperclip ]; then
        echo "FATAL: /paperclip is not writable as $(id -u):$(id -g)." >&2
        echo "If this is a freshly-mounted Railway volume, run a one-time" >&2
        echo "root chown (e.g. via a privileged sidecar or by booting once" >&2
        echo "as root) before resuming non-root operation." >&2
        exit 1
    fi
    exec "$@"
fi

# ---------------------------------------------------------------------------
# Root path — UID/GID remapping for docker-compose
# ---------------------------------------------------------------------------
PUID=${USER_UID:-1000}
PGID=${USER_GID:-1000}

if [ "$(id -u node)" -ne "$PUID" ]; then
    echo "Updating node UID to $PUID"
    usermod -o -u "$PUID" node
fi

if [ "$(id -g node)" -ne "$PGID" ]; then
    echo "Updating node GID to $PGID"
    groupmod -o -g "$PGID" node
    usermod -g "$PGID" node
fi

# Always reconcile /paperclip ownership before dropping privileges. A freshly
# mounted persistent volume is owned by root, and the UID/GID may have changed
# since the previous run.
if [ "$(stat -c %u /paperclip 2>/dev/null || echo 0)" != "$PUID" ] \
   || [ "$(stat -c %g /paperclip 2>/dev/null || echo 0)" != "$PGID" ]; then
    echo "Fixing /paperclip ownership for node ($PUID:$PGID)"
    chown -R node:node /paperclip
fi

exec gosu node "$@"
