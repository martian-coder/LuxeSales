# winget-diff

A tiny Rust CLI that diffs two [`winget export`](https://learn.microsoft.com/en-us/windows/package-manager/winget/export)
JSON files and tells you what's missing, extra, or running a different version.

The natural companion to [winget-tui](https://github.com/microsoft/winget-cli) — sync packages
across work PC, home PC, and Surface without the guesswork.

```
MISSING FROM TARGET (3 packages on laptop.json not on desktop.json)

- Notepad++.Notepad++ 8.6
- Spotify.Spotify 1.2.26.1187.g36b715a3
- junegunn.fzf 0.46.1

EXTRA ON TARGET (2 packages on desktop.json not on laptop.json)

+ Microsoft.PowerToys 0.76.2
+ Obsidian.Obsidian 1.5.3

VERSION DIFFERENCES (2 packages)

~ Microsoft.VisualStudioCode (1.85.1 → 1.84.2)
~ sharkdp.bat (0.24.0 → 0.23.0)
```

## Install

Download the latest `winget-diff.exe` from [Releases](../../releases) — no installer, no runtime, just drop it in your PATH.

## Usage

```
# Export from each machine first:
winget export -o laptop.json
winget export -o desktop.json

# Diff them:
winget-diff laptop.json desktop.json

# Only show what's missing from the target:
winget-diff laptop.json desktop.json --missing-only

# Pipe-friendly (bare lines, no headers):
winget-diff laptop.json desktop.json --quiet

# Structured output for jq:
winget-diff laptop.json desktop.json --json
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Machines are in sync |
| 1 | Differences found |
| 2 | File read / parse error |

This makes it scriptable:

```batch
winget-diff baseline.json current.json --quiet
if %errorlevel% neq 0 echo Machine is out of sync!
```

## Generate a sync script

```batch
winget-diff laptop.json desktop.json --json ^
  | jq -r ".only_in_source[].id | \"winget install \" + ." > sync.bat
```

## Build from source

Requires [Rust](https://rustup.rs/).

```
git clone https://github.com/you/winget-diff
cd winget-diff
cargo build --release
```

### Cross-compile a Windows .exe from Linux/macOS

```
rustup target add x86_64-pc-windows-gnu
# Install mingw-w64 (brew install mingw-w64 / apt install gcc-mingw-w64)
cargo build --release --target x86_64-pc-windows-gnu
# → target/x86_64-pc-windows-gnu/release/winget-diff.exe
```

## TinyToolTown

> "Stupid-delightful tools made with love. Free, fun & open source. Made for an audience of one."

This tool does exactly one thing. It does it well. It exits cleanly with a useful code.
It plays nicely with pipes and `jq`. It cost about an hour to write. That's the whole point.
