#!/usr/bin/env python3
"""
JumpDir Advanced - Interactive fuzzy directory navigator with live filtering.

Windows CMD:  just run  python jumpdir.py   (or use j.bat after adding to PATH)
bash setup:   echo 'eval "$(python3 jumpdir.py --init)"'    >> ~/.bashrc
zsh  setup:   echo 'eval "$(python3 jumpdir.py --init-zsh)"' >> ~/.zshrc
"""

import sys
import os
import json
import time
import argparse
from pathlib import Path

# ---------------------------------------------------------------------------
# Cross-platform raw keypress reader
# ---------------------------------------------------------------------------

if sys.platform == "win32":
    import msvcrt
    import ctypes

    def _enable_ansi():
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
        mode = ctypes.c_ulong()
        kernel32.GetConsoleMode(handle, ctypes.byref(mode))
        kernel32.SetConsoleMode(handle, mode.value | 0x0004)  # ENABLE_VIRTUAL_TERMINAL_PROCESSING

    def _getch():
        ch = msvcrt.getwch()
        if ch in ('\x00', '\xe0'):       # special key prefix
            ch2 = msvcrt.getwch()
            if ch2 == 'H': return 'UP'
            if ch2 == 'P': return 'DOWN'
            if ch2 == 'S': return 'DEL'
            return None
        if ch == '\r':   return 'ENTER'
        if ch == '\x1b': return 'ESC'
        if ch in ('\x08', '\x7f'): return 'BACKSPACE'
        return ch

else:
    import termios, tty

    def _enable_ansi():
        pass

    def _getch():
        fd = sys.stdin.fileno()
        old = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            ch = sys.stdin.read(1)
            if ch == '\x1b':
                nxt = sys.stdin.read(1)
                if nxt == '[':
                    code = sys.stdin.read(1)
                    if code == 'A': return 'UP'
                    if code == 'B': return 'DOWN'
                    if code == '3':
                        sys.stdin.read(1)  # trailing ~
                        return 'DEL'
                return 'ESC'
            if ch in ('\r', '\n'):         return 'ENTER'
            if ch in ('\x7f', '\x08'):     return 'BACKSPACE'
            return ch
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old)


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

DB_PATH = Path.home() / ".jumpdir_db.json"


def load_db() -> dict:
    if DB_PATH.exists():
        try:
            return json.loads(DB_PATH.read_text())
        except Exception:
            return {}
    return {}


def save_db(db: dict) -> None:
    DB_PATH.write_text(json.dumps(db, indent=2))


def record_visit(path: str) -> None:
    path = str(Path(path).resolve())
    db = load_db()
    entry = db.get(path, {"visits": 0, "last": 0})
    entry["visits"] += 1
    entry["last"] = time.time()
    db[path] = entry
    save_db(db)


# ---------------------------------------------------------------------------
# Fuzzy matching
# ---------------------------------------------------------------------------

def fuzzy_match(query: str, text: str) -> tuple:
    """Returns (score, matched_indices). score=0 means no match."""
    if not query:
        return 1, []

    q = query.lower()
    t = text.lower()

    idx = t.find(q)
    if idx != -1:
        score = 800 + (100 if idx == 0 else 0) + len(q)
        return score, list(range(idx, idx + len(q)))

    qi = 0
    matched = []
    score = 0
    consecutive = 0
    prev = -2

    for i, ch in enumerate(t):
        if qi < len(q) and ch == q[qi]:
            matched.append(i)
            if i == prev + 1:
                consecutive += 1
                score += 10 * consecutive
            else:
                consecutive = 1
                score += 1
            prev = i
            qi += 1

    if qi < len(q):
        return 0, []
    return score, matched


SKIP_DIRS = {
    # Windows
    "Windows", "System32", "SysWOW64", "$Recycle.Bin", "ProgramData",
    "AppData", "Temp", "temp", "node_modules", ".git", "__pycache__",
    # Unix
    "proc", "sys", "dev", "run", "snap", "boot",
}


def _scan_dirs(roots: list, max_depth: int = 4) -> list:
    """Walk roots up to max_depth, return list of dir paths."""
    found = []
    for root in roots:
        root = Path(root)
        if not root.is_dir():
            continue
        try:
            for entry in root.rglob("*"):
                try:
                    if not entry.is_dir():
                        continue
                    # Skip hidden and noise dirs
                    if any(part.startswith(".") or part in SKIP_DIRS
                           for part in entry.parts):
                        continue
                    # Depth guard relative to root
                    depth = len(entry.relative_to(root).parts)
                    if depth <= max_depth:
                        found.append(str(entry))
                except (PermissionError, OSError):
                    continue
        except (PermissionError, OSError):
            continue
    return found


def _discover_roots() -> list:
    """Return a sensible set of roots to scan."""
    roots = [Path.cwd()]
    # Walk up to drive/fs root
    p = Path.cwd()
    while p != p.parent:
        roots.append(p.parent)
        p = p.parent
    # Home dir
    roots.append(Path.home())
    return list(dict.fromkeys(roots))  # dedupe, preserve order


def rank(query: str, db: dict) -> list:
    now = time.time()
    seen: dict[str, int] = {}

    # 1. Frecency-boosted entries from DB
    for path, meta in db.items():
        if not Path(path).is_dir():
            continue
        name = Path(path).name
        name_score, _ = fuzzy_match(query, name)
        if name_score == 0:
            path_score, _ = fuzzy_match(query, path)
            if path_score == 0:
                continue
            name_score = path_score // 2
        visits = meta.get("visits", 1)
        age_days = (now - meta.get("last", now)) / 86400
        recency = max(0.0, 20.0 - age_days * 2)
        seen[path] = int(name_score + visits * 3 + recency)

    # 2. Auto-discovered dirs from filesystem
    for path in _scan_dirs(_discover_roots()):
        if path in seen:
            continue
        name = Path(path).name
        name_score, _ = fuzzy_match(query, name)
        if name_score == 0:
            path_score, _ = fuzzy_match(query, path)
            if path_score == 0:
                continue
            name_score = path_score // 2
        seen[path] = int(name_score)

    results = list(seen.items())
    results.sort(key=lambda x: -x[1])
    return results


# ---------------------------------------------------------------------------
# ANSI TUI (works on Windows CMD, PowerShell, bash, zsh)
# ---------------------------------------------------------------------------

_ESC  = "\033["
_RST  = "\033[0m"
_BOLD = "\033[1m"
_DIM  = "\033[2m"

def _render_name(name: str, indices: list) -> str:
    idx_set = set(indices)
    out = []
    for i, ch in enumerate(name):
        if i in idx_set:
            out.append(f"\033[33m\033[1m{ch}\033[0m")  # yellow bold
        else:
            out.append(ch)
    return "".join(out)


_drawn_lines = 0


def _render(query: str, results: list, selected: int, max_rows: int = 15) -> None:
    global _drawn_lines
    out = []

    # Move cursor up to overwrite previous render
    if _drawn_lines > 0:
        out.append(f"\033[{_drawn_lines}A")

    rows = []
    # Header
    rows.append(f"\033[2K\r\033[46m\033[30m\033[1m JumpDir  ↑↓ navigate  Enter jump  Esc quit \033[0m")
    # Prompt
    rows.append(f"\033[2K\r\033[36m\033[1m > \033[0m{query}\033[1m_\033[0m")

    visible = results[:max_rows]
    for i, (path, _) in enumerate(visible):
        name = Path(path).name
        _, indices = fuzzy_match(query, name)
        pad = max(0, 30 - len(name)) * " "
        if i == selected:
            row = f"\033[2K\r\033[42m\033[30m\033[1m  {name}{pad}  {path}\033[0m"
        else:
            name_fmt = _render_name(name, indices)
            row = f"\033[2K\r  {name_fmt}{pad}  \033[2m{path}\033[0m"
        rows.append(row)

    if not results:
        rows.append(f"\033[2K\r\033[2m  (no matches — keep typing)\033[0m")

    _drawn_lines = len(rows)
    sys.stdout.write("\n".join(rows))
    sys.stdout.flush()


def _clear_tui() -> None:
    global _drawn_lines
    if _drawn_lines > 0:
        sys.stdout.write(f"\033[{_drawn_lines}A")
        for _ in range(_drawn_lines):
            sys.stdout.write("\033[2K\r\n")
        sys.stdout.write(f"\033[{_drawn_lines}A")
    sys.stdout.write("\033[?25h")  # show cursor
    sys.stdout.flush()
    _drawn_lines = 0


def interactive_pick(initial_query: str, db: dict):
    global _drawn_lines
    _drawn_lines = 0

    _enable_ansi()
    sys.stdout.write("\033[?25l")  # hide cursor
    sys.stdout.flush()

    query = initial_query
    selected = 0
    results = rank(query, db)

    try:
        while True:
            _render(query, results, selected)
            key = _getch()

            if key is None:
                continue
            if key == 'ESC':
                return None
            if key == 'ENTER':
                return results[selected][0] if results else None
            if key == 'UP':
                selected = max(0, selected - 1)
            elif key == 'DOWN':
                selected = min(len(results) - 1, selected + 1) if results else 0
            elif key == 'BACKSPACE':
                query = query[:-1]
                results = rank(query, db)
                selected = 0
            elif key == 'DEL':
                query = ""
                results = rank(query, db)
                selected = 0
            elif isinstance(key, str) and len(key) == 1 and ord(key) >= 32:
                query += key
                results = rank(query, db)
                selected = 0
    except KeyboardInterrupt:
        return None
    finally:
        _clear_tui()


# ---------------------------------------------------------------------------
# Shell integration
# ---------------------------------------------------------------------------

_BASH_INIT = '''\
# JumpDir Advanced
j() {{
    local result
    result=$(python3 "{script}" --pick "$@" </dev/tty)
    [ -z "$result" ] && return 0
    python3 "{script}" --add "$result" 2>/dev/null
    cd "$result" || return 1
}}
_jd_track() {{ python3 "{script}" --add "$PWD" 2>/dev/null & }}
PROMPT_COMMAND="_jd_track${{PROMPT_COMMAND:+;$PROMPT_COMMAND}}"
'''

_ZSH_INIT = '''\
# JumpDir Advanced
j() {{
    local result
    result=$(python3 "{script}" --pick "$@" </dev/tty)
    [ -z "$result" ] && return 0
    python3 "{script}" --add "$result" 2>/dev/null
    cd "$result" || return 1
}}
autoload -Uz add-zsh-hook
_jd_track() {{ python3 "{script}" --add "$PWD" 2>/dev/null & }}
add-zsh-hook chpwd _jd_track
'''


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="JumpDir Advanced")
    parser.add_argument("--init",     action="store_true", help="Print bash integration")
    parser.add_argument("--init-zsh", action="store_true", help="Print zsh integration")
    parser.add_argument("--add",  metavar="PATH", help="Record a directory visit")
    parser.add_argument("--pick", nargs="?", const="", metavar="QUERY",
                        help="Open interactive picker")
    parser.add_argument("query", nargs="?", default="")
    args = parser.parse_args()

    script = Path(__file__).resolve()

    if args.init:
        print(_BASH_INIT.format(script=script))
        return

    if args.init_zsh:
        print(_ZSH_INIT.format(script=script))
        return

    if args.add:
        record_visit(args.add)
        return

    db = load_db()
    seed = args.pick if args.pick is not None else args.query

    # Fast path: single unambiguous match
    if seed and db:
        hits = rank(seed, db)
        if len(hits) == 1:
            print(hits[0][0])
            return

    chosen = interactive_pick(seed, db)
    if chosen:
        print(chosen)


if __name__ == "__main__":
    main()
