use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process;

use clap::Parser;
use serde::{Deserialize, Serialize};

#[derive(Parser)]
#[command(
    name = "winget-diff",
    version,
    about = "Diff two winget export files and show what's missing, extra, or out of date",
    long_about = None
)]
struct Cli {
    /// Source machine export (e.g. laptop.json)
    source: PathBuf,

    /// Target machine export (e.g. desktop.json)
    target: PathBuf,

    /// Output results as JSON
    #[arg(long)]
    json: bool,

    /// Suppress decorative chrome — useful for piping
    #[arg(long, short)]
    quiet: bool,

    /// Show only packages missing from target (suppress extra and version diff)
    #[arg(long)]
    missing_only: bool,
}

// ── winget export schema ─────────────────────────────────────────────────────

#[derive(Deserialize)]
struct WingetExport {
    #[serde(rename = "Sources")]
    sources: Option<Vec<WingetSource>>,
}

#[derive(Deserialize)]
struct WingetSource {
    #[serde(rename = "Packages")]
    packages: Vec<WingetPackage>,
}

#[derive(Deserialize, Clone)]
struct WingetPackage {
    #[serde(rename = "PackageIdentifier")]
    id: String,
    #[serde(rename = "Version")]
    version: Option<String>,
}

// ── output types ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct JsonOutput {
    only_in_source: Vec<PackageEntry>,
    only_in_target: Vec<PackageEntry>,
    version_differences: Vec<VersionEntry>,
}

#[derive(Serialize)]
struct PackageEntry {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    version: Option<String>,
}

#[derive(Serialize)]
struct VersionEntry {
    id: String,
    source_version: String,
    target_version: String,
}

// ── helpers ──────────────────────────────────────────────────────────────────

fn load_packages(path: &PathBuf) -> HashMap<String, Option<String>> {
    let text = fs::read_to_string(path).unwrap_or_else(|e| {
        eprintln!("error: cannot read {}: {}", path.display(), e);
        process::exit(2);
    });

    let export: WingetExport = serde_json::from_str(&text).unwrap_or_else(|e| {
        eprintln!("error: cannot parse {}: {}", path.display(), e);
        process::exit(2);
    });

    let mut map = HashMap::new();
    if let Some(sources) = export.sources {
        for source in sources {
            for pkg in source.packages {
                map.insert(pkg.id, pkg.version);
            }
        }
    }
    map
}

fn version_str(v: &Option<String>) -> &str {
    v.as_deref().unwrap_or("unknown")
}

// ── ANSI colour helpers (no extra dep) ───────────────────────────────────────

fn red(s: &str) -> String {
    format!("\x1b[31m{s}\x1b[0m")
}
fn green(s: &str) -> String {
    format!("\x1b[32m{s}\x1b[0m")
}
fn yellow(s: &str) -> String {
    format!("\x1b[33m{s}\x1b[0m")
}
fn bold(s: &str) -> String {
    format!("\x1b[1m{s}\x1b[0m")
}

// ── main ─────────────────────────────────────────────────────────────────────

fn main() {
    let cli = Cli::parse();

    let src = load_packages(&cli.source);
    let tgt = load_packages(&cli.target);

    let mut only_in_source: Vec<&str> = src
        .keys()
        .filter(|id| !tgt.contains_key(*id))
        .map(String::as_str)
        .collect();
    only_in_source.sort_unstable();

    let mut only_in_target: Vec<&str> = tgt
        .keys()
        .filter(|id| !src.contains_key(*id))
        .map(String::as_str)
        .collect();
    only_in_target.sort_unstable();

    let mut version_diffs: Vec<(&str, &str, &str)> = src
        .iter()
        .filter_map(|(id, sv)| {
            tgt.get(id).and_then(|tv| {
                if sv.as_deref() != tv.as_deref() {
                    Some((id.as_str(), version_str(sv), version_str(tv)))
                } else {
                    None
                }
            })
        })
        .collect();
    version_diffs.sort_unstable_by_key(|(id, _, _)| *id);

    let has_diff =
        !only_in_source.is_empty() || !only_in_target.is_empty() || !version_diffs.is_empty();

    // ── JSON output ──────────────────────────────────────────────────────────
    if cli.json {
        let out = JsonOutput {
            only_in_source: only_in_source
                .iter()
                .map(|id| PackageEntry {
                    id: id.to_string(),
                    version: src[*id].clone(),
                })
                .collect(),
            only_in_target: if cli.missing_only {
                vec![]
            } else {
                only_in_target
                    .iter()
                    .map(|id| PackageEntry {
                        id: id.to_string(),
                        version: tgt[*id].clone(),
                    })
                    .collect()
            },
            version_differences: if cli.missing_only {
                vec![]
            } else {
                version_diffs
                    .iter()
                    .map(|(id, sv, tv)| VersionEntry {
                        id: id.to_string(),
                        source_version: sv.to_string(),
                        target_version: tv.to_string(),
                    })
                    .collect()
            },
        };
        println!("{}", serde_json::to_string_pretty(&out).unwrap());
        process::exit(if has_diff { 1 } else { 0 });
    }

    // ── human output ─────────────────────────────────────────────────────────
    let src_name = cli.source.file_name().unwrap_or_default().to_string_lossy();
    let tgt_name = cli.target.file_name().unwrap_or_default().to_string_lossy();

    if !cli.quiet && !has_diff {
        println!("{}", bold("✓ machines are in sync"));
        process::exit(0);
    }

    if !only_in_source.is_empty() {
        if !cli.quiet {
            println!(
                "\n{} ({} packages on {} not on {})\n",
                bold("MISSING FROM TARGET"),
                only_in_source.len(),
                src_name,
                tgt_name
            );
        }
        for id in &only_in_source {
            let ver = version_str(&src[*id]);
            println!("{} {} {}", red("-"), id, ver);
        }
    }

    if !cli.missing_only {
        if !only_in_target.is_empty() {
            if !cli.quiet {
                println!(
                    "\n{} ({} packages on {} not on {})\n",
                    bold("EXTRA ON TARGET"),
                    only_in_target.len(),
                    tgt_name,
                    src_name
                );
            }
            for id in &only_in_target {
                let ver = version_str(&tgt[*id]);
                println!("{} {} {}", green("+"), id, ver);
            }
        }

        if !version_diffs.is_empty() {
            if !cli.quiet {
                println!("\n{} ({} packages)\n", bold("VERSION DIFFERENCES"), version_diffs.len());
            }
            for (id, sv, tv) in &version_diffs {
                println!("{} {} ({} → {})", yellow("~"), id, sv, tv);
            }
        }
    }

    if !cli.quiet {
        println!();
    }

    process::exit(if has_diff { 1 } else { 0 });
}
