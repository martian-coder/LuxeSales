# winget-diff

## What this is
A tiny CLI tool that diffs two `winget export` JSON files and shows
what packages are missing, extra, or on different versions.

## Stack
- Language: Rust (2021 edition)
- Dependencies: clap (CLI parsing), serde + serde_json (JSON)
- Single binary: src/main.rs
- Target: Windows x64 self-contained exe (cross-compile from Linux with cargo cross)

## Build commands
```
cargo build                                      # debug build
cargo run -- laptop.json desktop.json            # run against test fixtures
cargo run -- laptop.json desktop.json --json     # JSON output
cargo run -- laptop.json desktop.json --quiet    # pipe-friendly
cargo build --release                            # release build
```

## Cross-compile for Windows (from Linux)
```
rustup target add x86_64-pc-windows-gnu
cargo build --release --target x86_64-pc-windows-gnu
# output: target/x86_64-pc-windows-gnu/release/winget-diff.exe
```

## Test fixtures
`laptop.json` and `desktop.json` are in the root — use them for testing.
Expected output: VSCode version diff, junegunn.fzf/Spotify/Notepad++ missing from desktop,
Obsidian/PowerToys extra on desktop, bat version diff.

## Exit codes
- 0 = machines are in sync
- 1 = differences found
- 2 = file read / parse error

## CLI flags
- `--json`         : output as structured JSON (good for `jq` pipelines)
- `--quiet` / `-q` : suppress section headers (bare package lines only)
- `--missing-only` : show only packages missing from target

## TinyToolTown spirit
Tiny, delightful, does one thing well. No installer, no config files,
minimal dependencies. One binary.
