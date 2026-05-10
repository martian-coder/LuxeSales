#!/usr/bin/env python3
"""
JumpDir Advanced - Interactive fuzzy directory navigator with live filtering.

Windows CMD:  j.bat            (run once to cd; add jumpdir folder to PATH)
bash setup:   echo 'eval "$(python3 jumpdir.py --init)"'     >> ~/.bashrc
zsh  setup:   echo 'eval "$(python3 jumpdir.py --init-zsh)"' >> ~/.zshrc
"""

import sys
import os
import json
import time
import argparse
from pathlib import Path

# ---------------------------------------------------------------------------
# Terminal device — TUI always writes here so stdout stays clean for capture
# ---------------------------------------------------------------------------

def _open_tty():
    try:
        if sys.platform == "win32":
            return open("CONOUT$", "w", buffering=1, encoding="utf-8", errors="replace")
        else:
            return open("/dev/tty", "w", buffering=1)
    except OSError:
        return sys.stderr

_tty = _open_tty()


# ---------------------------------------------------------------------------
# Cross-platform raw keypress (reads from physical console, not stdin)
# ---------------------------------------------------------------------------

if sys.platform == "win32":
    import msvcrt
    import ctypes

    def _enable_ansi():
        # Open CONOUT$ so we get the real handle even when stdout is redirected
        hnd = ctypes.windll.kernel32.CreateFileW(
            "CONOUT$", 0x40000000, 0x03, None, 0x03, 0, None
        )
        mode = ctypes.c_ulong()
        ctypes.windll.kernel32.GetConsoleMode(hnd, ctypes.byref(mode))
        ctypes.windll.kernel32.SetConsoleMode(hnd, mode.value | 0x0004)
        ctypes.windll.kernel32.CloseHandle(hnd)

    def _getch():
        ch = msvcrt.getwch()
        if ch in ('\x00', '\xe0'):
            ch2 = msvcrt.getwch()
            if ch2 == 'H': return 'UP'
            if ch2 == 'P': return 'DOWN'
            if ch2 == 'S': return 'DEL'
            return None
        if ch == '\r':             return 'ENTER'
        if ch == '\x1b':           return 'ESC'
        if ch in ('\x08', '\x7f'): return 'BACKSPACE'
        return ch

else:
    import termios, tty as _tty_mod

    def _enable_ansi():
        pass

    def _getch():
        fd = sys.stdin.fileno()
        old = termios.tcgetattr(fd)
        try:
            _tty_mod.setraw(fd)
            ch = sys.stdin.read(1)
            if ch == '\x1b':
                nxt = sys.stdin.read(1)
                if nxt == '[':
                    code = sys.stdin.read(1)
                    if code == 'A': return 'UP'
                    if code == 'B': return 'DOWN'
                    if code == '3':
                        sys.stdin.read(1)
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
# Directory discovery
# ---------------------------------------------------------------------------

SKIP_DIRS = {
    "Windows", "System32", "SysWOW64", "WinSxS", "$Recycle.Bin",
    "ProgramData", "AppData", "Temp", "temp", "node_modules",
    ".git", "__pycache__", "venv", ".venv", "dist", "build",
    "proc", "sys", "dev", "run", "snap", "boot",
}


def _bfs(root: Path, max_depth: int) -> list:
    found = []
    queue = [(root, 0)]
    while queue:
        cur, depth = queue.pop(0)
        try:
            for child in sorted(cur.iterdir()):
                try:
                    if not child.is_dir():
                        continue
                    n = child.name
                    if n.startswith(".") or n in SKIP_DIRS:
                        continue
                    found.append(str(child))
                    if depth < max_depth:
                        queue.append((child, depth + 1))
                except (PermissionError, OSError):
                    continue
        except (PermissionError, OSError):
            continue
    return found


def _discover() -> list:
    seen: set = set()
    result = []

    def add(paths):
        for p in paths:
            if p not in seen:
                seen.add(p)
                result.append(p)

    cwd   = Path.cwd()
    drive = Path(cwd.anchor)   # D:\ on Windows, / on Unix
    home  = Path.home()

    add(_bfs(cwd,   max_depth=5))   # deep local scan
    add(_bfs(drive, max_depth=4))   # full drive, aggressive skip list handles noise
    add(_bfs(home,  max_depth=4))   # home tree

    return result


# ---------------------------------------------------------------------------
# Fuzzy match + ranking
# ---------------------------------------------------------------------------

def fuzzy_match(query: str, text: str) -> tuple:
    if not query:
        return 1, []
    q, t = query.lower(), text.lower()
    idx = t.find(q)
    if idx != -1:
        return 800 + (100 if idx == 0 else 0) + len(q), list(range(idx, idx + len(q)))
    qi, matched, score, cons, prev = 0, [], 0, 0, -2
    for i, ch in enumerate(t):
        if qi < len(q) and ch == q[qi]:
            matched.append(i)
            cons = cons + 1 if i == prev + 1 else 1
            score += 10 * cons if i == prev + 1 else 1
            prev = i
            qi += 1
    return (score, matched) if qi == len(q) else (0, [])


def rank(query: str, db: dict, dirs: list) -> list:
    now = time.time()
    seen: dict = {}

    for path, meta in db.items():
        if not Path(path).is_dir():
            continue
        name = Path(path).name
        sc, _ = fuzzy_match(query, name)
        if sc == 0:
            sc, _ = fuzzy_match(query, path)
            sc = sc // 2
        if sc == 0:
            continue
        age = (now - meta.get("last", now)) / 86400
        seen[path] = int(sc + meta.get("visits", 1) * 3 + max(0.0, 20 - age * 2))

    for path in dirs:
        if path in seen:
            continue
        name = Path(path).name
        sc, _ = fuzzy_match(query, name)
        if sc == 0:
            sc, _ = fuzzy_match(query, path)
            sc = sc // 2
        if sc == 0:
            continue
        seen[path] = sc

    results = list(seen.items())
    results.sort(key=lambda x: -x[1])
    return results


# ---------------------------------------------------------------------------
# ANSI TUI — renders to _tty (console device), not stdout
# ---------------------------------------------------------------------------

def _render_name(name: str, indices: list) -> str:
    idx_set = set(indices)
    return "".join(
        f"\033[33m\033[1m{ch}\033[0m" if i in idx_set else ch
        for i, ch in enumerate(name)
    )


_drawn = 0


def _render(query: str, results: list, selected: int) -> None:
    global _drawn
    rows = []

    if _drawn > 0:
        rows.append(f"\033[{_drawn}A")

    rows.append(f"\033[2K\r\033[46m\033[30m\033[1m JumpDir  ↑↓ navigate  Enter jump  Esc quit \033[0m")
    rows.append(f"\033[2K\r\033[36m\033[1m > \033[0m{query}\033[1m_\033[0m")

    for i, (path, _) in enumerate(results[:15]):
        name = Path(path).name
        _, idx = fuzzy_match(query, name)
        pad = " " * max(0, 30 - len(name))
        if i == selected:
            rows.append(f"\033[2K\r\033[42m\033[30m\033[1m  {name}{pad}  {path}\033[0m")
        else:
            rows.append(f"\033[2K\r  {_render_name(name, idx)}{pad}  \033[2m{path}\033[0m")

    if not results:
        rows.append(f"\033[2K\r\033[2m  (no matches — keep typing)\033[0m")

    _drawn = len(rows)
    _tty.write("\n".join(rows))
    _tty.flush()


def _clear() -> None:
    global _drawn
    if _drawn > 0:
        _tty.write(f"\033[{_drawn}A")
        _tty.write("\033[2K\r\n" * _drawn)
        _tty.write(f"\033[{_drawn}A")
    _tty.write("\033[?25h")
    _tty.flush()
    _drawn = 0


def interactive_pick(initial_query: str, db: dict) -> str | None:
    global _drawn
    _drawn = 0
    _enable_ansi()

    _tty.write("\033[?25l")
    _tty.write("\033[2K\r\033[2m Scanning directories...\033[0m")
    _tty.flush()

    dirs = _discover()

    _tty.write("\033[2K\r")
    _tty.flush()

    query    = initial_query
    selected = 0
    results  = rank(query, db, dirs)

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
                query = query[:-1]; results = rank(query, db, dirs); selected = 0
            elif key == 'DEL':
                query = "";          results = rank(query, db, dirs); selected = 0
            elif isinstance(key, str) and len(key) == 1 and ord(key) >= 32:
                query += key;        results = rank(query, db, dirs); selected = 0
    except KeyboardInterrupt:
        return None
    finally:
        _clear()


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

_BAT_CONTENT = r"""@echo off
for /f "delims=" %%i in ('python "%~dp0jumpdir.py" --pick %*') do set R=%%i
if defined R (
    python "%~dp0jumpdir.py" --add "%R%" 2>nul
    cd /d "%R%"
)
"""


def make_bat() -> None:
    bat = Path(__file__).parent / "j.bat"
    bat.write_text(_BAT_CONTENT)
    print(f"Created: {bat}")
    print(f"Add this folder to PATH to use 'j' from anywhere:")
    print(f"  {bat.parent}")


def main() -> None:
    parser = argparse.ArgumentParser(description="JumpDir Advanced")
    parser.add_argument("--init",     action="store_true")
    parser.add_argument("--init-zsh", action="store_true")
    parser.add_argument("--make-bat", action="store_true", help="Create j.bat in this folder (Windows)")
    parser.add_argument("--add",  metavar="PATH")
    parser.add_argument("--pick", nargs="?", const="", metavar="QUERY")
    parser.add_argument("query",  nargs="?", default="")
    args = parser.parse_args()

    script = Path(__file__).resolve()

    if args.make_bat:
        make_bat(); return

    if args.init:
        print(_BASH_INIT.format(script=script)); return
    if args.init_zsh:
        print(_ZSH_INIT.format(script=script)); return
    if args.add:
        record_visit(args.add); return

    db   = load_db()
    seed = args.pick if args.pick is not None else args.query

    chosen = interactive_pick(seed, db)
    if chosen:
        print(chosen)          # stdout — captured by j.bat / shell function


if __name__ == "__main__":
    main()
