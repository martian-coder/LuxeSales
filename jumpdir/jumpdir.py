#!/usr/bin/env python3
"""
JumpDir Advanced - Interactive fuzzy directory navigator with live filtering.

Shell setup (one-time):
  bash:  echo 'eval "$(python3 /path/to/jumpdir.py --init)"' >> ~/.bashrc
  zsh:   echo 'eval "$(python3 /path/to/jumpdir.py --init-zsh)"' >> ~/.zshrc

Then use:  j           # open interactive picker
           j azure     # open picker pre-filled with 'azure'
"""

import sys
import os
import json
import curses
import time
import argparse
from pathlib import Path

DB_PATH = Path.home() / ".jumpdir_db.json"


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

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

def fuzzy_match(query: str, text: str) -> tuple[int, list[int]]:
    """
    Returns (score, matched_indices).  score=0 means no match.
    Favours consecutive runs and prefix hits.
    """
    if not query:
        return 1, []

    q = query.lower()
    t = text.lower()

    # Exact substring
    idx = t.find(q)
    if idx != -1:
        score = 800 + (100 if idx == 0 else 0) + len(q)
        return score, list(range(idx, idx + len(q)))

    # Fuzzy sequential
    qi = 0
    matched: list[int] = []
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


def rank(query: str, db: dict) -> list[tuple[str, int]]:
    """Return list of (path, score) sorted best-first, skipping dead paths."""
    now = time.time()
    results: list[tuple[str, int]] = []

    for path, meta in db.items():
        if not Path(path).is_dir():
            continue

        name = Path(path).name
        name_score, _ = fuzzy_match(query, name)

        if name_score == 0:
            # Try against full path as fallback
            path_score, _ = fuzzy_match(query, path)
            if path_score == 0:
                continue
            name_score = path_score // 2

        visits = meta.get("visits", 1)
        age_days = (now - meta.get("last", now)) / 86400
        recency_boost = max(0.0, 20.0 - age_days * 2)
        frecency = visits * 3 + recency_boost

        results.append((path, int(name_score + frecency)))

    results.sort(key=lambda x: -x[1])
    return results


# ---------------------------------------------------------------------------
# TUI
# ---------------------------------------------------------------------------

def _draw(stdscr, query: str, results: list[tuple[str, int]], selected: int) -> None:
    stdscr.erase()
    height, width = stdscr.getmaxyx()

    C_HEADER   = curses.color_pair(1)
    C_PROMPT   = curses.color_pair(2)
    C_SELECTED = curses.color_pair(3)
    C_NAME     = curses.color_pair(4)
    C_MATCH    = curses.color_pair(5)
    C_PATH     = curses.color_pair(6)
    C_DIM      = curses.A_DIM

    # Header bar
    title = " JumpDir  ↑↓ navigate  Enter jump  Esc quit "
    stdscr.addstr(0, 0, title[:width].ljust(width), C_HEADER)

    # Prompt line
    prompt_prefix = " > "
    stdscr.addstr(1, 0, prompt_prefix, C_PROMPT | curses.A_BOLD)
    stdscr.addstr(1, len(prompt_prefix), query[: width - len(prompt_prefix) - 1])

    # Separator
    if height > 2:
        stdscr.addstr(2, 0, "─" * width if width <= 200 else "", C_DIM)

    # Results
    max_rows = height - 3
    visible = results[:max_rows]

    for i, (path, _score) in enumerate(visible):
        y = i + 3
        if y >= height:
            break

        name = Path(path).name
        is_sel = (i == selected)

        _, name_indices = fuzzy_match(query, name)
        name_index_set = set(name_indices)

        if is_sel:
            stdscr.addstr(y, 0, " " * width, C_SELECTED)
            stdscr.addstr(y, 0, " ", C_SELECTED)
            x = 1
            for ci, ch in enumerate(name):
                if x >= width:
                    break
                attr = C_SELECTED | curses.A_BOLD
                stdscr.addstr(y, x, ch, attr)
                x += 1
            if x < width - 1:
                stdscr.addstr(y, x, "  ", C_SELECTED)
                x += 2
                path_disp = path[: width - x - 1]
                stdscr.addstr(y, x, path_disp, C_SELECTED)
        else:
            stdscr.addstr(y, 0, " ", C_DIM)
            x = 1
            for ci, ch in enumerate(name):
                if x >= width:
                    break
                attr = C_MATCH | curses.A_BOLD if ci in name_index_set else C_NAME
                stdscr.addstr(y, x, ch, attr)
                x += 1
            if x < width - 1:
                stdscr.addstr(y, x, "  ", C_DIM)
                x += 2
                path_disp = path[: width - x - 1]
                stdscr.addstr(y, x, path_disp, C_PATH)

    if not results:
        if height > 3:
            msg = "  (no matches — keep typing or visit more directories)"
            stdscr.addstr(3, 0, msg[:width], C_DIM)

    # Place cursor after query text
    cursor_x = min(len(prompt_prefix) + len(query), width - 1)
    try:
        stdscr.move(1, cursor_x)
    except curses.error:
        pass

    stdscr.refresh()


def interactive_pick(initial_query: str, db: dict) -> str | None:
    """Open TUI, return chosen path or None."""

    def _run(stdscr):
        curses.curs_set(1)
        try:
            curses.use_default_colors()
            bg = -1
        except Exception:
            bg = curses.COLOR_BLACK

        curses.init_pair(1, curses.COLOR_BLACK,   curses.COLOR_CYAN)   # header
        curses.init_pair(2, curses.COLOR_CYAN,    bg)                  # prompt >
        curses.init_pair(3, curses.COLOR_BLACK,   curses.COLOR_GREEN)  # selected row
        curses.init_pair(4, curses.COLOR_WHITE,   bg)                  # dir name
        curses.init_pair(5, curses.COLOR_YELLOW,  bg)                  # matched chars
        curses.init_pair(6, curses.COLOR_BLUE,    bg)                  # full path

        query = initial_query
        selected = 0
        results = rank(query, db)

        while True:
            _draw(stdscr, query, results, selected)
            key = stdscr.getch()

            if key == 27:                          # Escape
                return None

            if key in (curses.KEY_ENTER, 10, 13): # Enter
                if results:
                    return results[selected][0]
                return None

            if key == curses.KEY_UP:
                selected = max(0, selected - 1)

            elif key == curses.KEY_DOWN:
                if results:
                    selected = min(len(results) - 1, selected + 1)

            elif key in (curses.KEY_BACKSPACE, 127, 8):
                query = query[:-1]
                results = rank(query, db)
                selected = 0

            elif key == curses.KEY_DC:            # Delete key clears all
                query = ""
                results = rank(query, db)
                selected = 0

            elif 32 <= key <= 126:                # Printable ASCII
                query += chr(key)
                results = rank(query, db)
                selected = 0

    return curses.wrapper(_run)


# ---------------------------------------------------------------------------
# Shell integration snippets
# ---------------------------------------------------------------------------

_BASH_INIT = '''\
# JumpDir Advanced — shell integration
j() {{
    local result
    result=$(python3 "{script}" --pick "$@" </dev/tty)
    local rc=$?
    [ $rc -ne 0 ] && return $rc
    [ -z "$result" ] && return 0
    python3 "{script}" --add "$result" 2>/dev/null
    cd "$result" || return 1
}}
_jd_track() {{ python3 "{script}" --add "$PWD" 2>/dev/null & }}
PROMPT_COMMAND="_jd_track${{PROMPT_COMMAND:+;$PROMPT_COMMAND}}"
'''

_ZSH_INIT = '''\
# JumpDir Advanced — shell integration
j() {{
    local result
    result=$(python3 "{script}" --pick "$@" </dev/tty)
    local rc=$?
    [ $rc -ne 0 ] && return $rc
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
    parser = argparse.ArgumentParser(
        description="JumpDir Advanced — fuzzy directory navigator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--init",     action="store_true", help="Print bash integration")
    parser.add_argument("--init-zsh", action="store_true", help="Print zsh integration")
    parser.add_argument("--add",  metavar="PATH", help="Record a directory visit")
    parser.add_argument("--pick", nargs="?", const="", metavar="QUERY",
                        help="Open interactive picker (optional seed query)")
    parser.add_argument("query", nargs="?", default="",
                        help="Seed query for interactive picker")
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

    # --pick or bare invocation → open TUI
    db = load_db()
    seed = args.pick if args.pick is not None else args.query

    # Fast path: one unambiguous match → jump without TUI
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
