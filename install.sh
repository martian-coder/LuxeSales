#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Copy More Installer
#  Tested on Ubuntu 20.04+ / Debian 11+ / Linux Mint 20+
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_BIN="/usr/local/bin/copymore"
DESKTOP_SRC="$SCRIPT_DIR/copymore.desktop"
AUTOSTART_DIR="$HOME/.config/autostart"
APPS_DIR="/usr/share/applications"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[Copy More]${NC} $*"; }
warn()    { echo -e "${YELLOW}[Copy More]${NC} $*"; }
err_exit(){ echo -e "${RED}[Copy More] ERROR:${NC} $*" >&2; exit 1; }

# ── Checks ────────────────────────────────────────────────────
[[ "$EUID" -ne 0 ]] || err_exit "Do not run this script as root. It will use sudo when needed."

command -v python3 >/dev/null 2>&1 || err_exit "python3 is required but not found."

# ── Detect package manager ────────────────────────────────────
if command -v apt-get &>/dev/null; then
    PKG_MGR="apt"
elif command -v dnf &>/dev/null; then
    PKG_MGR="dnf"
elif command -v pacman &>/dev/null; then
    PKG_MGR="pacman"
else
    warn "Unknown package manager — skipping system dependency install."
    warn "Ensure python3-gi and gir1.2-gtk-3.0 are installed manually."
    PKG_MGR="none"
fi

# ── Install system dependencies ───────────────────────────────
info "Installing system dependencies (GTK3 + GObject introspection)…"
case "$PKG_MGR" in
    apt)
        sudo apt-get update -qq
        sudo apt-get install -y \
            python3-gi \
            python3-gi-cairo \
            gir1.2-gtk-3.0 \
            gir1.2-gdk-3.0 \
            gir1.2-gdkpixbuf-2.0
        ;;
    dnf)
        sudo dnf install -y \
            python3-gobject \
            gtk3
        ;;
    pacman)
        sudo pacman -Sy --noconfirm python-gobject gtk3
        ;;
    none)
        warn "Skipped package install — install GTK3 bindings manually if needed."
        ;;
esac

# ── Copy main script ──────────────────────────────────────────
info "Installing copymore to $INSTALL_BIN…"
sudo cp "$SCRIPT_DIR/copymore.py" "$INSTALL_BIN"
sudo chmod +x "$INSTALL_BIN"

# Ensure python3 shebang is honoured
sudo sed -i '1s|^.*|#!/usr/bin/env python3|' "$INSTALL_BIN"

# ── Desktop entry ─────────────────────────────────────────────
# Stamp the real install path into the desktop file before copying
TMP_DESKTOP="$(mktemp)"
sed "s|Exec=.*|Exec=python3 $INSTALL_BIN|g" "$DESKTOP_SRC" > "$TMP_DESKTOP"

if [[ -d "$APPS_DIR" ]]; then
    info "Registering desktop entry in $APPS_DIR…"
    sudo cp "$TMP_DESKTOP" "$APPS_DIR/copymore.desktop"
    sudo chmod 644 "$APPS_DIR/copymore.desktop"
    command -v update-desktop-database &>/dev/null && \
        sudo update-desktop-database "$APPS_DIR" 2>/dev/null || true
fi

# ── Autostart ─────────────────────────────────────────────────
info "Enabling autostart on login…"
mkdir -p "$AUTOSTART_DIR"
cp "$TMP_DESKTOP" "$AUTOSTART_DIR/copymore.desktop"
chmod 644 "$AUTOSTART_DIR/copymore.desktop"

rm -f "$TMP_DESKTOP"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Copy More installed successfully! 🎉${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Launch now:       copymore &"
echo "  Starts on login:  ✓ (autostart entry created)"
echo "  Clipboard data:   ~/.copymore/clips.db"
echo ""
echo "  Usage:"
echo "    Right-click tray icon → quick-paste recent clips"
echo "    Left-click  tray icon → open full manager"
echo ""

# ── Offer to launch now ───────────────────────────────────────
read -rp "Launch Copy More now? [Y/n] " REPLY
REPLY="${REPLY:-Y}"
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    nohup python3 "$INSTALL_BIN" >/dev/null 2>&1 &
    info "Copy More is running in the background. Look for the tray icon."
fi
