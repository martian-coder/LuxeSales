#!/usr/bin/env python3
"""
ClipNest — Smart Multi-Clipboard Manager
Tag it. Find it. Paste it.

Sits in your system tray and silently captures everything you copy.
Right-click the tray icon to quick-paste recent items.
Left-click (or right-click → Open) to browse, search, and manage
your full clipboard history — organised by auto-detected category.
"""

import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, Gdk, GLib, Pango   # noqa: E402

import sqlite3
import threading
import os
import sys
import re
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────
APP_NAME    = "ClipNest"
APP_VERSION = "1.0.0"
DATA_DIR    = Path.home() / ".clipnest"
DB_PATH     = DATA_DIR / "clips.db"
MAX_HISTORY = 1000          # non-starred clips kept at most
PREVIEW_LEN = 300           # characters shown in the card body

# (display-name, tray-icon, badge-css-class)
CATEGORIES = [
    ("All",     "📋", "badge-all"),
    ("General", "📝", "badge-general"),
    ("URLs",    "🔗", "badge-url"),
    ("Code",    "💻", "badge-code"),
    ("Email",   "✉",  "badge-email"),
    ("Numbers", "🔢", "badge-number"),
    ("Starred", "⭐", "badge-starred"),
]

# ─────────────────────────────────────────────────────────────
# GTK CSS (Catppuccin Mocha palette)
# ─────────────────────────────────────────────────────────────
APP_CSS = b"""
/* ── Base ─────────────────────────────────────────── */
window.clipnest-win            { background-color: #1e1e2e; }

/* ── Top-bar ──────────────────────────────────────── */
.topbar {
    background-color: #181825;
    border-bottom: 1px solid #313244;
}
.app-title {
    color: #cba6f7;
    font-size: 19px;
    font-weight: bold;
}
.app-sub { color: #585b70; font-size: 11px; }

/* ── Search ───────────────────────────────────────── */
.search-entry {
    background-color: #313244;
    color: #cdd6f4;
    border: 1px solid #45475a;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 13px;
}
.search-entry:focus { border-color: #cba6f7; }

/* ── Category bar ─────────────────────────────────── */
.catbar { background-color: #181825; padding: 6px 16px; }
.cat-btn {
    background-color: #313244;
    color: #a6adc8;
    border: 1px solid #45475a;
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 12px;
}
.cat-btn:hover  { background-color: #45475a; color: #cdd6f4; }
.cat-selected   {
    background-color: #cba6f7;
    color: #1e1e2e;
    border-color: #cba6f7;
    font-weight: bold;
}

/* ── Clip cards ───────────────────────────────────── */
.clip-card         { background-color: #252537; border-bottom: 1px solid #2a2a3e; }
.clip-card:hover   { background-color: #2e2e45; }
.clip-content      { color: #cdd6f4; font-size: 13px; }
.clip-time         { color: #585b70; font-size: 11px; }

/* ── Category badges ──────────────────────────────── */
.badge {
    border-radius: 10px;
    padding: 2px 9px;
    font-size: 10px;
    font-weight: bold;
}
.badge-all     { background-color: #313244; color: #cdd6f4; }
.badge-general { background-color: #313244; color: #cdd6f4; }
.badge-url     { background-color: #1a3545; color: #89dceb; }
.badge-code    { background-color: #1a3525; color: #a6e3a1; }
.badge-email   { background-color: #35152e; color: #f5c2e7; }
.badge-number  { background-color: #3a2510; color: #fab387; }
.badge-starred { background-color: #3a3410; color: #f9e2af; }

/* ── Icon buttons (star / delete) ─────────────────── */
.icon-btn {
    background-color: transparent;
    border: none;
    color: #585b70;
    padding: 2px 6px;
    border-radius: 5px;
    min-width: 0;
}
.icon-btn:hover  { background-color: #45475a; color: #cdd6f4; }
.star-on         { color: #f9e2af; }

/* ── Status bar ───────────────────────────────────── */
.statusbar {
    background-color: #181825;
    border-top: 1px solid #313244;
    padding: 5px 16px;
}
.status-text  { color: #585b70; font-size: 11px; }
.empty-label  { color: #45475a; font-size: 14px; }
"""


# ─────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────
class Database:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self._init_schema()

    def _init_schema(self):
        with self._lock:
            self._conn.executescript("""
                CREATE TABLE IF NOT EXISTS clips (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    content    TEXT    NOT NULL,
                    category   TEXT    NOT NULL DEFAULT 'General',
                    is_starred INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT    NOT NULL,
                    UNIQUE(content)
                );
                CREATE INDEX IF NOT EXISTS idx_clips_created  ON clips(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_clips_category ON clips(category);
                CREATE INDEX IF NOT EXISTS idx_clips_starred  ON clips(is_starred);
            """)
            self._conn.commit()

    # ── Writes ───────────────────────────────────────────────

    def upsert(self, content: str, category: str) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._lock:
            self._conn.execute("""
                INSERT INTO clips (content, category, created_at)
                VALUES (?, ?, ?)
                ON CONFLICT(content) DO UPDATE
                    SET created_at = excluded.created_at,
                        category   = excluded.category
            """, (content, category, now))
            self._conn.commit()
        self._trim()

    def toggle_star(self, clip_id: int) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE clips SET is_starred = 1 - is_starred WHERE id = ?",
                (clip_id,)
            )
            self._conn.commit()

    def delete(self, clip_id: int) -> None:
        with self._lock:
            self._conn.execute("DELETE FROM clips WHERE id = ?", (clip_id,))
            self._conn.commit()

    def clear(self, keep_starred: bool = True) -> None:
        with self._lock:
            if keep_starred:
                self._conn.execute("DELETE FROM clips WHERE is_starred = 0")
            else:
                self._conn.execute("DELETE FROM clips")
            self._conn.commit()

    # ── Reads ────────────────────────────────────────────────

    def fetch(self, category=None, search=None, limit=150):
        q      = "SELECT id, content, category, is_starred, created_at FROM clips"
        where  = []
        params = []
        if category == "Starred":
            where.append("is_starred = 1")
        elif category and category != "All":
            where.append("category = ?")
            params.append(category)
        if search:
            where.append("content LIKE ?")
            params.append(f"%{search}%")
        if where:
            q += " WHERE " + " AND ".join(where)
        q += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        with self._lock:
            return self._conn.execute(q, params).fetchall()

    def fetch_recent(self, n=12):
        with self._lock:
            return self._conn.execute(
                "SELECT id, content, category, is_starred "
                "FROM clips ORDER BY created_at DESC LIMIT ?",
                (n,)
            ).fetchall()

    def count(self) -> int:
        with self._lock:
            return self._conn.execute("SELECT COUNT(*) FROM clips").fetchone()[0]

    # ── Housekeeping ─────────────────────────────────────────

    def _trim(self) -> None:
        with self._lock:
            rows = self._conn.execute(
                "SELECT id FROM clips WHERE is_starred = 0 "
                "ORDER BY created_at DESC LIMIT -1 OFFSET ?",
                (MAX_HISTORY,)
            ).fetchall()
            if rows:
                ids = [r[0] for r in rows]
                self._conn.execute(
                    f"DELETE FROM clips WHERE id IN ({','.join('?' * len(ids))})", ids
                )
                self._conn.commit()


# ─────────────────────────────────────────────────────────────
# Auto-categoriser
# ─────────────────────────────────────────────────────────────
_URL_RE    = re.compile(r'^https?://\S+|^www\.\S+\.\S+', re.I)
_EMAIL_RE  = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
_NUM_RE    = re.compile(r'^[\d\s\+\-\(\)\.\/,]+$')
_CODE_HINTS = [
    re.compile(p, re.I) for p in [
        r'\bdef\s+\w+\s*\(',
        r'\bfunction\s+\w+\s*\(',
        r'\bimport\s+[\w{]',
        r'#include\s*[<"]',
        r'\bclass\s+\w+[\s:{(]',
        r'\bconst\s+\w+\s*=',
        r'\blet\s+\w+\s*=',
        r'\bvar\s+\w+\s*=',
        r'SELECT\s+.+\bFROM\b',
        r'<[a-z][a-z0-9]*\b[^>]*>',
        r'=>\s*[{\(]',
        r'^\s*[\{\}\[\]]\s*$',
    ]
]

def categorize(text: str) -> str:
    t = text.strip()
    if _URL_RE.match(t):
        return "URLs"
    if _EMAIL_RE.match(t):
        return "Email"
    if any(hint.search(t) for hint in _CODE_HINTS):
        return "Code"
    if _NUM_RE.match(t) and len(t.replace(" ", "")) >= 6:
        return "Numbers"
    return "General"


# ─────────────────────────────────────────────────────────────
# Main Application
# ─────────────────────────────────────────────────────────────
class ClipNest:

    def __init__(self):
        self.db          = Database()
        self.win         = None
        self.active_cat  = "All"
        self.search_q    = ""
        self._last_text  = ""
        self._cat_btns   = {}

        self._apply_css()
        self._build_tray()
        self._watch_clipboard()

    # ── CSS ──────────────────────────────────────────────────

    def _apply_css(self):
        p = Gtk.CssProvider()
        p.load_from_data(APP_CSS)
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(), p,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

    # ── System tray ──────────────────────────────────────────

    def _build_tray(self):
        self._tray = Gtk.StatusIcon()
        self._tray.set_from_icon_name("edit-paste")
        self._tray.set_tooltip_text(f"{APP_NAME} — Clipboard Manager")
        self._tray.connect("activate",    lambda _:        self._toggle_win())
        self._tray.connect("popup-menu",  self._tray_menu)
        self._tray.set_visible(True)

    def _tray_menu(self, icon, btn, t):
        menu = Gtk.Menu()

        # ── Header ───────────────────────────────────────
        hdr = Gtk.MenuItem(label=f"📋  {APP_NAME}   •   {self.db.count()} clips")
        hdr.set_sensitive(False)
        menu.append(hdr)
        menu.append(Gtk.SeparatorMenuItem())

        # ── 12 most-recent clips ──────────────────────────
        for _cid, content, _cat, starred in self.db.fetch_recent(12):
            text  = ("⭐ " if starred else "") + content[:58].replace("\n", " ")
            if len(content) > 58:
                text += "…"
            item = Gtk.MenuItem(label=text)
            item.connect("activate", lambda _, c=content: self._do_copy(c))
            menu.append(item)

        menu.append(Gtk.SeparatorMenuItem())

        # ── Category sub-menu ─────────────────────────────
        cats_item = Gtk.MenuItem(label="📂  Browse by Category")
        cats_sub  = Gtk.Menu()
        for name, icon, _ in CATEGORIES:
            ci = Gtk.MenuItem(label=f"{icon}  {name}")
            ci.connect("activate", lambda _, n=name: self._open_to(n))
            cats_sub.append(ci)
        cats_item.set_submenu(cats_sub)
        menu.append(cats_item)

        menu.append(Gtk.SeparatorMenuItem())

        open_i = Gtk.MenuItem(label="Open ClipNest Manager")
        open_i.connect("activate", lambda _: self._show_win())
        menu.append(open_i)

        clr_i = Gtk.MenuItem(label="Clear History…")
        clr_i.connect("activate", self._confirm_clear)
        menu.append(clr_i)

        menu.append(Gtk.SeparatorMenuItem())

        quit_i = Gtk.MenuItem(label="Quit")
        quit_i.connect("activate", lambda _: Gtk.main_quit())
        menu.append(quit_i)

        menu.show_all()
        menu.popup(None, None, None, None, btn, t)

    # ── Clipboard watch ───────────────────────────────────────

    def _watch_clipboard(self):
        self._cb = Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)
        self._cb.connect("owner-change", self._cb_changed)

    def _cb_changed(self, clipboard, _event):
        clipboard.request_text(self._cb_text)

    def _cb_text(self, _clipboard, text):
        if not text or not text.strip() or text == self._last_text:
            return
        self._last_text = text
        cat = categorize(text)
        self.db.upsert(text, cat)
        n = self.db.count()
        self._tray.set_tooltip_text(f"{APP_NAME} — {n} clips")
        if self.win and self.win.get_visible():
            GLib.idle_add(self._refresh)

    # ── Copy helper ───────────────────────────────────────────

    def _do_copy(self, text: str):
        cb = Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)
        cb.set_text(text, -1)
        cb.store()
        self._last_text = text          # don't re-capture our own write

    # ── Window management ─────────────────────────────────────

    def _toggle_win(self):
        if self.win and self.win.get_visible():
            self.win.hide()
        else:
            self._show_win()

    def _open_to(self, cat: str):
        self.active_cat = cat
        self._show_win()

    def _show_win(self):
        if not self.win:
            self._build_win()
        self._refresh()
        self.win.present()
        self.win.show_all()

    # ── Window construction ───────────────────────────────────

    def _build_win(self):
        w = Gtk.Window(title=APP_NAME)
        w.get_style_context().add_class("clipnest-win")
        w.set_default_size(900, 640)
        w.set_position(Gtk.WindowPosition.CENTER)
        w.connect("delete-event", lambda *_: w.hide() or True)

        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)

        # ── Top-bar ───────────────────────────────────────
        topbar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        topbar.get_style_context().add_class("topbar")
        topbar.set_margin_start(20)
        topbar.set_margin_end(20)
        topbar.set_margin_top(14)
        topbar.set_margin_bottom(14)

        title_col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        tl = Gtk.Label(label="📋  ClipNest")
        tl.get_style_context().add_class("app-title")
        tl.set_halign(Gtk.Align.START)

        self._sub_lbl = Gtk.Label(label="…")
        self._sub_lbl.get_style_context().add_class("app-sub")
        self._sub_lbl.set_halign(Gtk.Align.START)

        title_col.pack_start(tl,            False, False, 0)
        title_col.pack_start(self._sub_lbl, False, False, 0)
        topbar.pack_start(title_col, True, True, 0)

        self._search = Gtk.SearchEntry()
        self._search.set_placeholder_text("Search clips…")
        self._search.get_style_context().add_class("search-entry")
        self._search.set_size_request(270, -1)
        self._search.connect("search-changed", self._on_search)
        topbar.pack_end(self._search, False, False, 0)

        root.pack_start(topbar, False, False, 0)

        # ── Category bar ──────────────────────────────────
        catbar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        catbar.get_style_context().add_class("catbar")
        catbar.set_margin_top(4)
        catbar.set_margin_bottom(4)

        self._cat_btns = {}
        for name, icon, _ in CATEGORIES:
            b = Gtk.Button(label=f"{icon}  {name}")
            b.get_style_context().add_class("cat-btn")
            if name == self.active_cat:
                b.get_style_context().add_class("cat-selected")
            b.connect("clicked", self._on_cat, name)
            catbar.pack_start(b, False, False, 0)
            self._cat_btns[name] = b

        root.pack_start(catbar, False, False, 0)

        sep = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
        root.pack_start(sep, False, False, 0)

        # ── Scrollable clip list ──────────────────────────
        self._scroll = Gtk.ScrolledWindow()
        self._scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self._scroll.set_vexpand(True)

        self._list_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self._scroll.add(self._list_box)
        root.pack_start(self._scroll, True, True, 0)

        # ── Status bar ────────────────────────────────────
        sb = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        sb.get_style_context().add_class("statusbar")

        self._status = Gtk.Label(label="Click any clip to copy it to clipboard")
        self._status.get_style_context().add_class("status-text")
        self._status.set_halign(Gtk.Align.START)
        sb.pack_start(self._status, True, True, 0)

        clr = Gtk.Button(label="Clear History")
        clr.get_style_context().add_class("icon-btn")
        clr.connect("clicked", self._confirm_clear)
        sb.pack_end(clr, False, False, 0)

        root.pack_start(sb, False, False, 0)
        w.add(root)
        self.win = w

    # ── Card factory ──────────────────────────────────────────

    def _make_card(self, clip_id, content, category, is_starred, created_at):
        ev = Gtk.EventBox()
        ev.get_style_context().add_class("clip-card")

        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        card.set_margin_start(16)
        card.set_margin_end(12)
        card.set_margin_top(10)
        card.set_margin_bottom(10)

        # ── Top meta row ──────────────────────────────────
        top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)

        badge_cls = next(
            (bc for n, _i, bc in CATEGORIES if n == category), "badge-general"
        )
        cat_icon  = next((i for n, i, _ in CATEGORIES if n == category), "📝")
        badge     = Gtk.Label(label=f"{cat_icon} {category}")
        badge.get_style_context().add_class("badge")
        badge.get_style_context().add_class(badge_cls)
        top.pack_start(badge, False, False, 0)

        try:
            dt   = datetime.strptime(created_at, "%Y-%m-%d %H:%M:%S")
            tstr = dt.strftime("%b %d  %H:%M")
        except Exception:
            tstr = created_at or ""
        tlbl = Gtk.Label(label=tstr)
        tlbl.get_style_context().add_class("clip-time")
        top.pack_start(tlbl, False, False, 6)

        top.pack_start(Gtk.Box(), True, True, 0)    # spacer

        del_btn = Gtk.Button(label="✕")
        del_btn.get_style_context().add_class("icon-btn")
        del_btn.set_tooltip_text("Delete clip")
        del_btn.connect("clicked", lambda _, cid=clip_id: self._delete(cid))
        top.pack_end(del_btn, False, False, 0)

        star_btn = Gtk.Button(label="⭐" if is_starred else "☆")
        star_btn.get_style_context().add_class("icon-btn")
        if is_starred:
            star_btn.get_style_context().add_class("star-on")
        star_btn.set_tooltip_text("Star / Unstar")
        star_btn.connect("clicked", lambda _, cid=clip_id: self._star(cid))
        top.pack_end(star_btn, False, False, 0)

        card.pack_start(top, False, False, 0)

        # ── Content preview ───────────────────────────────
        preview = content[:PREVIEW_LEN].replace("\n", "  ↵  ")
        if len(content) > PREVIEW_LEN:
            preview += "  …"
        clbl = Gtk.Label(label=preview)
        clbl.get_style_context().add_class("clip-content")
        clbl.set_halign(Gtk.Align.START)
        clbl.set_xalign(0.0)
        clbl.set_line_wrap(True)
        clbl.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR)
        clbl.set_max_width_chars(100)
        card.pack_start(clbl, False, False, 0)

        ev.add(card)
        ev.connect(
            "button-press-event",
            lambda w, e, c=content: self._card_clicked(w, e, c)
        )
        ev.connect("enter-notify-event",
                   lambda w, e: w.set_state_flags(Gtk.StateFlags.PRELIGHT, False))
        ev.connect("leave-notify-event",
                   lambda w, e: w.unset_state_flags(Gtk.StateFlags.PRELIGHT))

        return ev

    def _card_clicked(self, _widget, event, content):
        if event.button == 1:
            self._do_copy(content)
            short = content[:65].replace("\n", " ")
            if len(content) > 65:
                short += "…"
            self._status.set_text(f"✓  Copied: {short}")
            GLib.timeout_add(
                2800,
                lambda: (
                    self._status.set_text("Click any clip to copy it to clipboard")
                    or False
                )
            )

    # ── Refresh ───────────────────────────────────────────────

    def _refresh(self):
        for child in list(self._list_box.get_children()):
            self._list_box.remove(child)

        rows = self.db.fetch(
            category=self.active_cat,
            search=self.search_q or None,
        )
        total = self.db.count()
        self._sub_lbl.set_text(
            f"{total} clips stored  •  showing {len(rows)}"
        )

        if not rows:
            lbl = Gtk.Label(label="No clips here yet.")
            lbl.get_style_context().add_class("empty-label")
            lbl.set_margin_top(70)
            self._list_box.pack_start(lbl, False, False, 0)
        else:
            for clip_id, content, category, is_starred, created_at in rows:
                card = self._make_card(
                    clip_id, content, category, is_starred, created_at
                )
                self._list_box.pack_start(card, False, False, 0)

        self._list_box.show_all()
        return False  # for GLib.idle_add

    # ── Event callbacks ───────────────────────────────────────

    def _on_search(self, entry):
        self.search_q = entry.get_text()
        self._refresh()

    def _on_cat(self, btn, name):
        for b in self._cat_btns.values():
            b.get_style_context().remove_class("cat-selected")
        btn.get_style_context().add_class("cat-selected")
        self.active_cat = name
        self._refresh()

    def _star(self, clip_id):
        self.db.toggle_star(clip_id)
        self._refresh()

    def _delete(self, clip_id):
        self.db.delete(clip_id)
        self._refresh()

    def _confirm_clear(self, *_):
        dlg = Gtk.MessageDialog(
            transient_for=self.win,
            flags=0,
            message_type=Gtk.MessageType.WARNING,
            buttons=Gtk.ButtonsType.YES_NO,
            text="Clear clipboard history?",
        )
        dlg.format_secondary_text(
            "Starred items will be kept. This cannot be undone."
        )
        resp = dlg.run()
        dlg.destroy()
        if resp == Gtk.ResponseType.YES:
            self.db.clear(keep_starred=True)
            if self.win:
                self._refresh()

    # ── Run ───────────────────────────────────────────────────

    def run(self):
        Gtk.main()


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────
def main():
    import signal
    signal.signal(signal.SIGINT, signal.SIG_DFL)  # Ctrl-C exits cleanly

    # Prevent multiple instances
    lock_file = DATA_DIR / "clipnest.lock"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        import fcntl
        lock_fd = open(lock_file, "w")
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (IOError, OSError):
        print("ClipNest is already running.", file=sys.stderr)
        sys.exit(0)

    app = ClipNest()
    app.run()

    lock_fd.close()
    try:
        lock_file.unlink()
    except FileNotFoundError:
        pass


if __name__ == "__main__":
    main()
