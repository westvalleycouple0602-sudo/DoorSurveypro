#!/usr/bin/env python3
"""Package committed code plus complete local-branch history for offline transfer."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "generated-artifacts" / "shared-workspace-transfer"
CHUNK = 64 * 1024 * 1024


def run(*args):
    return subprocess.check_output(args, cwd=ROOT, stderr=subprocess.PIPE).decode().strip()


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main():
    if run("git", "status", "--porcelain"):
        raise RuntimeError("Commit the intended backup metadata first; the source must be clean.")
    OUT.mkdir(parents=True, exist_ok=True)
    head = run("git", "rev-parse", "HEAD")
    refs = dict(line.split(" ", 1) for line in
                run("git", "for-each-ref", "--format=%(refname) %(objectname)",
                    "refs/heads", "refs/tags").splitlines())
    manifest = {
        "format": 1,
        "source_head": head,
        "branch": run("git", "branch", "--show-current"),
        "commit_count": int(run("git", "rev-list", "--count", head)),
        "refs": refs,
        "files": [],
        "parts": [],
        "external_data_included": False,
    }
    with tempfile.TemporaryDirectory() as work:
        work = Path(work)
        full = work / "full-source.zip"
        run("git", "archive", "--format=zip", "--output=" + str(full), head)
        bundle = work / "history.bundle"
        run("git", "bundle", "create", str(bundle), "--branches", "--tags", "HEAD")
        manifest["bundle_sha256"] = sha256(bundle)
        manifest["bundle_bytes"] = bundle.stat().st_size
        with bundle.open("rb") as stream:
            number = 1
            while data := stream.read(CHUNK):
                name = f"DoorSurvey-History-{number:02d}.zip"
                target = OUT / name
                with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_STORED) as archive:
                    archive.writestr("history.part", data)
                manifest["parts"].append({
                    "name": name, "sha256": sha256(target), "bytes": target.stat().st_size
                })
                number += 1
        code = OUT / "DoorSurvey-Import.zip"
        with zipfile.ZipFile(full) as source, zipfile.ZipFile(
                code, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as target:
            for entry in source.infolist():
                if entry.is_dir():
                    continue
                if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                    raise RuntimeError("Symlinks need an explicit export policy.")
                data = source.read(entry.filename)
                manifest["files"].append({
                    "path": entry.filename,
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "bytes": len(data),
                })
                # Large reference assets are preserved, byte-for-byte, in the history parts.
                if not entry.filename.startswith("attached_assets/"):
                    target.writestr(entry, data)
            target.write(ROOT / "scripts/backup/restore-transfer.py", "restore-transfer.py")
            target.writestr("TRANSFER-MANIFEST.json", json.dumps(manifest, indent=2))
            guide = """# DoorSurvey Pro: offline shared-workspace transfer

## Download and keep privately
Download DoorSurvey-Import.zip and EVERY numbered DoorSurvey-History ZIP from
generated-artifacts/shared-workspace-transfer in the original app's Files panel.
Keep these files on your computer before changing or deleting either app.
Do not publish these backups publicly.

## Move to the shared workspace
1. Switch to your shared/team workspace in Replit.
2. Go to https://replit.com/import and choose ZIP. Import DoorSurvey-Import.zip.
   This ZIP is intentionally small enough for Replit's 200 MB import limit.
3. BEFORE running or redesigning the app, upload ALL DoorSurvey-History-XX.zip
   files into the new app's root folder, next to restore-transfer.py.
4. In the NEW app's Shell, run: python3 restore-transfer.py
5. Wait for the success message. All original tracked files, including the
   oversized catalog PDF, are verified and restored without overwriting existing
   changed files. Follow any message about changed files.
6. Reconnect the database, Clerk, Stripe and other services; configure the new
   app's secrets through Replit. Keep Stripe. Then install dependencies and run.
7. Invite collaborators through the shared workspace's member controls.

## What is preserved
The import ZIP contains committed code/configuration. The numbered history ZIPs
contain the full Git bundle for all local branches/tags and the current snapshot,
including ALL tracked reference assets and the original, unmodified catalog PDF.
The helper verifies SHA-256 checksums, branches/tags and the main commit count.
The complete recovered snapshot is also kept in .transfer-history/original-source;
the original repository is in .transfer-history/original-history.git.
If the imported app has Git initialized, original branches are attached as
pre-transfer/* remote-tracking branches; the new app's current branch is NOT reset.

## What is NOT copied
Live development/production database records, external Object Storage contents,
environment secrets, deployments/URLs, workspace permissions, chat/canvas state,
and ignored/uncommitted files are not included. Dependencies/build output can
be regenerated. These downloads do NOT constitute a GitHub upload or workspace
transfer. The original app remains unchanged and must be kept until the new copy
is verified. Current storage/databases are not deleted or rebuilt by this helper.

For GitHub later: the original catalog exceeds GitHub's ordinary file limit.
Do not push this unfiltered original history there without a large-file plan.
Avoid committing .transfer-history or the downloaded history ZIPs into Git.

Documentation:
https://docs.replit.com/build/import-from-providers
https://docs.replit.com/help/projects-and-files
"""
            target.writestr("TRANSFER-README.md", guide)
        if code.stat().st_size >= 190 * 1024 * 1024:
            raise RuntimeError("Import ZIP is too large for the supported import route.")
        (OUT / "TRANSFER-README.md").write_text(guide)
        (OUT / "TRANSFER-MANIFEST.json").write_text(json.dumps(manifest, indent=2))
        checksums = [f"{sha256(p)}  {p.name}" for p in sorted(OUT.glob("*.zip"))]
        (OUT / "BACKUP-CHECKSUMS.txt").write_text("\n".join(checksums) + "\n")
    print("Source commit:", head)
    print("Original tracked files:", len(manifest["files"]))
    print("Main history commits:", manifest["commit_count"])
    print("Local branches/tags:", len(refs))
    for file in sorted(OUT.glob("*.zip")):
        print(file.name, f"{file.stat().st_size / 1024 / 1024:.1f} MiB")


if __name__ == "__main__":
    main()
