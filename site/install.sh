#!/bin/bash
# Buddies installer for macOS.
#
#   curl -fsSL https://umer-2k1.github.io/pixel-buddies/install.sh | bash
#
# Downloads the latest release for your Mac (Apple silicon or Intel), checks its SHA-256 checksum,
# installs Buddies.app into /Applications and opens it. Read it before running it — it's short.
set -euo pipefail

REPO="umer-2k1/pixel-buddies"
APP="Buddies.app"
DEST="${BUDDIES_DEST:-/Applications}"                                         # override for testing
BASE="${BUDDIES_BASE_URL:-https://github.com/$REPO/releases/latest/download}"   # override for testing

say() { printf '\033[1;34m→\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = "Darwin" ] || die "This installer is for macOS. Windows users: download the .exe from https://umer-2k1.github.io/pixel-buddies/"

# Pick the right build. A Terminal running under Rosetta reports x86_64 even on Apple silicon, so ask the hardware.
if [ "$(sysctl -in hw.optional.arm64 2>/dev/null || echo 0)" = "1" ]; then ARCH="arm64"; CHIP="Apple silicon"
elif [ "$(uname -m)" = "x86_64" ]; then ARCH="x64"; CHIP="Intel"
else die "Unsupported Mac ($(uname -m))."; fi
FILE="Buddies-mac-$ARCH.dmg"

TMP="$(mktemp -d)"
MNT="$TMP/mnt"
cleanup() { hdiutil detach -quiet "$MNT" 2>/dev/null || true; rm -rf "$TMP"; }
trap cleanup EXIT

say "Downloading Buddies for $CHIP…"
curl -fL --progress-bar "$BASE/$FILE" -o "$TMP/$FILE" || die "Download failed. Is there a release yet? See https://github.com/$REPO/releases"

if curl -fsSL "$BASE/SHA256SUMS.txt" -o "$TMP/SHA256SUMS.txt" 2>/dev/null; then
  EXPECTED="$(awk -v f="$FILE" '$2==f || $2=="*"f {print $1}' "$TMP/SHA256SUMS.txt")"
  ACTUAL="$(shasum -a 256 "$TMP/$FILE" | awk '{print $1}')"
  if [ -n "$EXPECTED" ]; then
    [ "$EXPECTED" = "$ACTUAL" ] || die "Checksum mismatch — the download may be corrupted. Nothing was installed."
    ok "Checksum verified"
  fi
fi

say "Installing to $DEST…"
mkdir -p "$MNT"
hdiutil attach -nobrowse -readonly -quiet -mountpoint "$MNT" "$TMP/$FILE" || die "Could not open the disk image."
[ -d "$MNT/$APP" ] || die "The disk image doesn't contain $APP."
osascript -e 'tell application "Buddies" to quit' >/dev/null 2>&1 || true
SUDO=""; [ -w "$DEST" ] || SUDO="sudo"
$SUDO rm -rf "$DEST/$APP"
$SUDO ditto "$MNT/$APP" "$DEST/$APP"
hdiutil detach -quiet "$MNT" || true
ok "Installed $DEST/$APP"

if [ "${BUDDIES_NO_LAUNCH:-0}" != "1" ]; then
  open "$DEST/$APP"
  ok "Buddies is running — look for the 💧 in your menu bar."
fi
