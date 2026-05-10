#!/usr/bin/env python3
"""windbg - Windows crash dump analyzer powered by Claude."""

import argparse
import json
import os
import sys
import textwrap

import anthropic

# ---------------------------------------------------------------------------
# ANSI colours (suppressed when not a TTY)
# ---------------------------------------------------------------------------
USE_COLOR = sys.stdout.isatty()


def _c(code: str, text: str) -> str:
    if not USE_COLOR:
        return text
    return f"\033[{code}m{text}\033[0m"


RED    = lambda t: _c("31;1", t)
YELLOW = lambda t: _c("33;1", t)
CYAN   = lambda t: _c("36;1", t)
GREEN  = lambda t: _c("32;1", t)
BOLD   = lambda t: _c("1",    t)
DIM    = lambda t: _c("2",    t)

SEVERITY_COLOR = {
    "CRITICAL": RED,
    "HIGH":     RED,
    "MEDIUM":   YELLOW,
    "LOW":      GREEN,
    "INFO":     CYAN,
}

# ---------------------------------------------------------------------------
# System prompt — Mark Russinovich mode
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are Mark Russinovich — co-author of Windows Internals, creator of Sysinternals, \
and Microsoft Technical Fellow. You speak with authoritative precision about Windows \
kernel internals. You know every IRQL, pool tag, exception code, bugcheck parameter, \
NTSTATUS value, and PEB/TEB field by heart.

When analysing crash data your job is to produce a structured JSON object with \
exactly these fields (no extras):

{
  "severity":    "CRITICAL | HIGH | MEDIUM | LOW | INFO",
  "tldr":        "one sentence plain-English summary",
  "component":   "faulting module / driver / subsystem",
  "root_cause":  "technical explanation (2-4 sentences, WinDBG terminology)",
  "stack":       ["top 5 most relevant frames, each a short string"],
  "fixes":       ["ordered list of concrete remediation steps"],
  "commands":    ["optional follow-up WinDBG/kernel commands to gather more evidence"]
}

Rules:
- "severity" MUST be one of the five values above — no other strings.
- "component" should be the exact binary name when known (e.g. nvlddmkm.sys, clr.dll).
- Use real WinDBG terminology: pool corruption, nonpaged pool, paged pool, IRQL \
  DISPATCH_LEVEL, APC_LEVEL, PASSIVE_LEVEL, bugcheck 0x..., exception code 0xC0000..., \
  SEH, MDL, IRP, lookaside list, spinlock, DPC routine, KPCR, KPRCB, etc.
- "stack" entries should look like real WinDBG output (module!function+offset).
- "fixes" must be actionable — update driver, set registry key, increase NonPagedPool quota, etc.
- "commands" is only populated when --commands flag was requested; otherwise empty list [].
- Output ONLY the raw JSON object — no markdown fences, no prose before or after.
"""

# ---------------------------------------------------------------------------
# Claude call
# ---------------------------------------------------------------------------

def analyse(dump_text: str, want_commands: bool) -> dict:
    user_content = (
        "Analyse the following Windows crash dump / debug output.\n"
        + ("Include follow-up WinDBG commands in the 'commands' field.\n" if want_commands else "")
        + "\n--- BEGIN DUMP ---\n"
        + dump_text.strip()
        + "\n--- END DUMP ---"
    )

    client = anthropic.Anthropic()
    try:
        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.APIError as exc:
        print(f"API error: {exc}", file=sys.stderr)
        sys.exit(1)

    raw = message.content[0].text.strip()
    # Strip accidental markdown fences just in case
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0].strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"Failed to parse model response as JSON: {exc}", file=sys.stderr)
        print("Raw response:", raw, file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Pretty-print
# ---------------------------------------------------------------------------

def _wrap(text: str, indent: int = 4) -> str:
    prefix = " " * indent
    return textwrap.fill(text, width=100, initial_indent=prefix, subsequent_indent=prefix)


def pretty_print(result: dict) -> None:
    sev = result.get("severity", "INFO")
    sev_fn = SEVERITY_COLOR.get(sev, CYAN)

    print()
    print(BOLD("═" * 70))
    print(f"  {sev_fn(sev)}  {BOLD(result.get('tldr', ''))}")
    print(BOLD("═" * 70))
    print()

    print(BOLD("FAULTING COMPONENT"))
    print(_wrap(result.get("component", "unknown")))
    print()

    print(BOLD("ROOT CAUSE"))
    print(_wrap(result.get("root_cause", "")))
    print()

    stack = result.get("stack", [])
    if stack:
        print(BOLD("STACK HIGHLIGHTS"))
        for frame in stack:
            print(f"    {DIM(frame)}")
        print()

    fixes = result.get("fixes", [])
    if fixes:
        print(BOLD("FIXES"))
        for i, fix in enumerate(fixes, 1):
            prefix = f"  {i}. "
            subsequent = " " * len(prefix)
            wrapped = textwrap.fill(fix, width=98, initial_indent=prefix, subsequent_indent=subsequent)
            print(wrapped)
        print()

    cmds = result.get("commands", [])
    if cmds:
        print(BOLD("FOLLOW-UP WINDBG COMMANDS"))
        for cmd in cmds:
            print(f"    {CYAN(cmd)}")
        print()

    print(BOLD("═" * 70))
    print()


# ---------------------------------------------------------------------------
# Input helpers
# ---------------------------------------------------------------------------

def read_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError as exc:
        print(f"Cannot open file: {exc}", file=sys.stderr)
        sys.exit(2)


def read_stdin() -> str:
    return sys.stdin.read()


def read_paste() -> str:
    print("Paste your crash dump output. Press Ctrl+D (or Ctrl+Z on Windows) when done:")
    lines = []
    try:
        while True:
            lines.append(input())
    except EOFError:
        pass
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="windbg",
        description="Analyse Windows crash dumps with plain-English diagnosis.",
    )
    input_group = parser.add_mutually_exclusive_group()
    input_group.add_argument("file", nargs="?", help="path to dump/log file")
    input_group.add_argument("--stdin", action="store_true", help="read from stdin")
    input_group.add_argument("--paste", action="store_true", help="interactive paste mode")

    parser.add_argument("--json", action="store_true", help="output structured JSON")
    parser.add_argument("--commands", action="store_true", help="include follow-up WinDBG commands")

    args = parser.parse_args()

    if args.stdin:
        dump_text = read_stdin()
    elif args.paste:
        dump_text = read_paste()
    elif args.file:
        dump_text = read_file(args.file)
    else:
        parser.print_help()
        sys.exit(2)

    if not dump_text.strip():
        print("Error: empty input.", file=sys.stderr)
        sys.exit(2)

    result = analyse(dump_text, want_commands=args.commands)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        pretty_print(result)


if __name__ == "__main__":
    main()
