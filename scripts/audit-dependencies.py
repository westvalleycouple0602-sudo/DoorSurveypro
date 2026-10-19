#!/usr/bin/env python3
"""Inventory and audit all project manifests, including imported reference code."""
import argparse
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import re
import tomllib

ROOT = Path(__file__).resolve().parents[1]
PRUNE = {
    "node_modules", ".git", "vendor", ".venv", "venv", ".pythonlibs",
    ".local", "target", "dist", "build", ".next", "__pycache__", ".cache",
}
MANIFESTS = {
    "package.json", "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml",
    "yarn.lock", "bun.lock", "bun.lockb", "pyproject.toml", "Pipfile",
    "Pipfile.lock", "poetry.lock", "uv.lock", "setup.py", "setup.cfg",
    "Gemfile", "Gemfile.lock", "go.mod", "go.sum", "Cargo.toml", "Cargo.lock",
    "composer.json", "composer.lock", "pom.xml", "build.gradle", "build.gradle.kts",
    "packages.config",
}


def inventory():
    result = []
    for directory, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(d for d in dirs if d not in PRUNE)
        for name in sorted(files):
            if name in MANIFESTS or (
                name.startswith("requirements") and name.endswith((".txt", ".in"))
            ) or name.endswith(".csproj"):
                result.append(Path(directory, name))
    return result


def auto_fix(path):
    relative = path.relative_to(ROOT)
    if path.name == "package.json":
        command = ["npm", "audit", "fix", "--package-lock-only", "--ignore-scripts"]
    elif path.name == "pyproject.toml":
        # pip-audit's --locked mode does not support uv.lock. Export the exact
        # resolutions for advisory checking; UV fixes must be applied to the
        # project constraints and regenerated with uv lock, not to an export.
        command = None
    else:
        command = ["uv", "tool", "run", "pip-audit", "-r", path.name, "--fix"]
    log = ROOT / "generated-artifacts/security-audit" / (str(relative).replace("/", "__") + ".log")
    log.parent.mkdir(parents=True, exist_ok=True)
    try:
        with log.open("w") as output:
            if path.name == "pyproject.toml":
                exported = log.with_suffix(".requirements.txt")
                result = subprocess.run(
                    ["uv", "export", "--format", "requirements-txt", "--no-hashes",
                     "--no-emit-project", "--output-file", str(exported)],
                    cwd=path.parent, stdout=output, stderr=subprocess.STDOUT, timeout=180,
                )
                if result.returncode != 0:
                    return {"manifest": str(relative), "exit": result.returncode,
                            "log": str(log.relative_to(ROOT))}
                command = ["uv", "tool", "run", "pip-audit", "-r", str(exported),
                           "--no-deps", "--disable-pip"]
            if path.name == "package.json" and not (path.parent / "package-lock.json").exists():
                subprocess.run(
                    ["npm", "install", "--package-lock-only", "--ignore-scripts"],
                    cwd=path.parent, stdout=output, stderr=subprocess.STDOUT, timeout=180,
                )
            process = subprocess.run(command, cwd=path.parent, stdout=output,
                                     stderr=subprocess.STDOUT, timeout=240)
        code = process.returncode
    except subprocess.TimeoutExpired:
        code = 124
    print(f"{relative}: exit {code}", flush=True)
    return {"manifest": str(relative), "command": command, "exit": code,
            "log": str(log.relative_to(ROOT))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fix", action="store_true")
    parser.add_argument("--ecosystem", choices=["npm", "python"])
    parser.add_argument("--verify", action="store_true",
                        help="Fail if any originally reported vulnerable version is still declared or locked")
    args = parser.parse_args()
    paths = inventory()
    if args.verify:
        findings = json.loads((ROOT / "scripts/security-dependency-findings.json").read_text())
        vulnerable = {}
        for finding in findings:
            vulnerable.setdefault(finding["package"].lower(), set()).add(finding["version"])
        errors = []

        def check(name, version, path):
            versions = vulnerable.get(name.lower(), set())
            # Check exact pins and lower bounds, rather than substring matches.
            for token in re.findall(r"(?<![\d.])\d+(?:\.\d+){1,3}(?![\d.])", str(version)):
                if token in versions:
                    errors.append(f"{path.relative_to(ROOT)}: {name}@{token}")

        def check_requirements(requirements, path):
            for requirement in requirements:
                match = re.match(r"\s*([A-Za-z0-9_.-]+)(?:\[[^]]*\])?\s*(.*)", requirement)
                if match:
                    check(match[1], match[2], path)

        for path in paths:
            if path.suffix == ".json":
                data = json.loads(path.read_text())
                for section in ("dependencies", "devDependencies", "optionalDependencies", "overrides"):
                    for name, value in data.get(section, {}).items():
                        if isinstance(value, str):
                            check(name, value, path)
                        elif isinstance(value, dict):
                            for nested_name, nested_value in value.items():
                                check(nested_name, nested_value, path)
                for location, entry in data.get("packages", {}).items():
                    if "node_modules/" in location:
                        check(entry.get("name", location.rsplit("node_modules/", 1)[-1]),
                              entry.get("version", ""), path)
                    # Parent dependency ranges are npm's immutable package metadata,
                    # not pins: overrides can safely resolve a different version.
                    # Check the root declarations and every actual locked resolution.
                    if location == "":
                        for section in ("dependencies", "devDependencies", "optionalDependencies"):
                            for name, value in entry.get(section, {}).items():
                                check(name, value, path)
            elif path.name == "uv.lock":
                for entry in tomllib.loads(path.read_text()).get("package", []):
                    check(entry["name"], entry.get("version", ""), path)
            elif path.name == "pyproject.toml":
                data = tomllib.loads(path.read_text())
                check_requirements(data.get("project", {}).get("dependencies", []), path)
            elif path.name.startswith("requirements"):
                check_requirements(path.read_text().splitlines(), path)
            else:
                raise SystemExit(f"Verification not implemented for manifest: {path}")
        if errors:
            raise SystemExit("\n".join(sorted(set(errors))))
        print(f"PASS: checked {len(paths)} manifests/lockfiles; none of the "
              f"{len(findings)} reported vulnerable package/version pairs remain")
        return
    if not args.fix:
        print("\n".join(str(p.relative_to(ROOT)) for p in paths))
        return
    selected = [
        p for p in paths if
        (args.ecosystem != "python" and p.name == "package.json") or
        (args.ecosystem != "npm" and (p.name == "pyproject.toml" or
         p.name.startswith("requirements") and p.suffix in {".txt", ".in"}))
    ]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(auto_fix, selected))
    report = ROOT / f"generated-artifacts/security-audit/{args.ecosystem or 'all'}-autofix.json"
    report.write_text(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    main()
