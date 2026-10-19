#!/usr/bin/env python3
"""Restore offline backup into a newly imported workspace, without replacing its files."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def run(*args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True).stdout.strip()


def restore(base):
    manifest = json.loads((base / "TRANSFER-MANIFEST.json").read_text())
    history = base / ".transfer-history"
    history.mkdir(exist_ok=True)
    bundle = history / "DoorSurvey-history.bundle"
    if not bundle.exists() or sha256(bundle) != manifest["bundle_sha256"]:
        with tempfile.TemporaryDirectory(dir=history) as work:
            work = Path(work)
            assembled = work / "assembled.bundle"
            with assembled.open("wb") as out:
                for part in manifest["parts"]:
                    archive = base / part["name"]
                    if not archive.exists():
                        raise RuntimeError("Missing backup file: " + part["name"])
                    if sha256(archive) != part["sha256"]:
                        raise RuntimeError("Backup checksum mismatch: " + part["name"])
                    with zipfile.ZipFile(archive) as source, source.open("history.part") as stream:
                        shutil.copyfileobj(stream, out, 1024 * 1024)
            if sha256(assembled) != manifest["bundle_sha256"]:
                raise RuntimeError("Assembled history failed its checksum.")
            assembled.replace(bundle)
    repo = history / "original-history.git"
    if not repo.exists():
        run("git", "clone", "--bare", "--branch", manifest["branch"], str(bundle), str(repo))
    run("git", "-C", str(repo), "bundle", "verify", str(bundle))
    refs = dict(line.split(" ", 1) for line in
                run("git", "-C", str(repo), "for-each-ref",
                    "--format=%(refname) %(objectname)", "refs/heads", "refs/tags").splitlines())
    if refs != manifest["refs"]:
        raise RuntimeError("Restored branches or tags do not match the backup.")
    if run("git", "-C", str(repo), "rev-list", "--count", manifest["source_head"]) != str(manifest["commit_count"]):
        raise RuntimeError("Restored commit count does not match.")
    recovered = history / "original-source"
    recovered.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=history) as work:
        archive = Path(work) / "source.tar"
        run("git", "-C", str(repo), "archive", "--format=tar",
            "--output=" + str(archive), manifest["source_head"])
        run("tar", "-xf", str(archive), "-C", str(recovered))
    # Check the complete original snapshot BEFORE copying anything into the new workspace.
    for entry in manifest["files"]:
        file = recovered / entry["path"]
        if not file.is_file() or sha256(file) != entry["sha256"]:
            raise RuntimeError("Snapshot verification failed: " + entry["path"])
    preserved = []
    restored = 0
    for entry in manifest["files"]:
        source = recovered / entry["path"]
        target = base / entry["path"]
        if target.exists() or target.is_symlink():
            if not target.is_file() or sha256(target) != entry["sha256"]:
                preserved.append(entry["path"])
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        restored += 1
    if (base / ".git").is_dir():
        # Local exclusions do not modify the imported app's tracked .gitignore.
        exclude = base / ".git" / "info" / "exclude"
        exclude.parent.mkdir(parents=True, exist_ok=True)
        with exclude.open("a") as stream:
            stream.write("\n/.transfer-history/\n/DoorSurvey-History-*.zip\n"
                         "/TRANSFER-MANIFEST.json\n/TRANSFER-README.md\n/restore-transfer.py\n")
        run("git", "-C", str(base), "fetch", str(repo),
            "refs/heads/*:refs/remotes/pre-transfer/*")
    print("Verified every original file and all backed-up local branches/tags.")
    print("Restored missing files:", restored)
    print("Complete original source: .transfer-history/original-source")
    print("Original Git history: .transfer-history/original-history.git")
    if preserved:
        print("Existing changed files were NOT overwritten:")
        for name in preserved:
            print(" -", name)
        print("Compare those files with original-source before rebuilding.")
    print("Reconnect services and configure secrets before running the app.")


if __name__ == "__main__":
    try:
        restore(Path(__file__).resolve().parent)
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError,
            zipfile.BadZipFile, KeyError) as error:
        # Do not dump subprocess stderr, which could contain sensitive configuration.
        if isinstance(error, subprocess.CalledProcessError):
            print("Restore stopped: a local Git/archive command failed. No existing files were overwritten.")
        else:
            print("Restore stopped:", error)
        raise SystemExit(1)
