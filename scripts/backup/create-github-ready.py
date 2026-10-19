#!/usr/bin/env python3
"""Create a separate, size-checked GitHub repository without rewriting the source."""
from pathlib import Path
import json
import os
import subprocess
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
GENERATED = ROOT / "generated-artifacts"
DESTINATION = GENERATED / "github-ready"
EXCLUDED = "attached_assets/ABH Master Catalog (1)_1760757806846.pdf"
LIMIT = 100_000_000


def git(repo, *args):
    result = subprocess.run(
        ["git", "-C", str(repo), *args], check=True, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, env={**os.environ, "FILTER_BRANCH_SQUELCH_WARNING": "1"}
    )
    return result.stdout.decode().strip()


def refs(repo):
    return dict(line.split(" ", 1) for line in git(
        repo, "for-each-ref", "--format=%(refname) %(objectname)",
        "refs/heads", "refs/tags").splitlines())


def tree(repo, revision):
    result = subprocess.check_output(
        ["git", "-C", str(repo), "ls-tree", "-rz", revision])
    return dict(entry.decode().split("\t", 1)[::-1]
                for entry in result.split(b"\0") if entry)


def blob_sizes(repo):
    objects = git(repo, "rev-list", "--objects", "--branches", "--tags")
    result = subprocess.run(
        ["git", "-C", str(repo), "cat-file",
         "--batch-check=%(objecttype) %(objectname) %(objectsize) %(rest)"],
        input=objects.encode() + b"\n", stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=True)
    blobs = []
    for line in result.stdout.decode().splitlines():
        fields = line.split(" ", 3)
        if fields[0] == "blob":
            blobs.append((int(fields[2]), fields[3] if len(fields) > 3 else ""))
    return blobs


def filter_history(repo, work):
    # A full-tree export allows removing just this pathname from every snapshot.
    # --no-data reuses the clone's existing blobs, so the PDF is never exported.
    exported = work / "original-history.export"
    filtered = work / "filtered-history.export"
    with exported.open("wb") as stream:
        subprocess.run(
            ["git", "-C", str(repo), "fast-export", "--all", "--no-data",
             "--full-tree", "--signed-tags=strip"],
            stdout=stream, stderr=subprocess.PIPE, check=True)
    excluded = EXCLUDED.encode()
    with exported.open("rb") as source, filtered.open("wb") as target:
        while line := source.readline():
            if line.startswith(b"data "):
                # Commit/tag messages can contain arbitrary newlines and words
                # resembling file commands; preserve their length-delimited data.
                target.write(line)
                remaining = int(line.split()[1])
                while remaining:
                    data = source.read(min(remaining, 1024 * 1024))
                    if not data:
                        raise RuntimeError("Truncated history export.")
                    target.write(data)
                    remaining -= len(data)
            elif line.startswith(b"M "):
                path = line.split(b" ", 3)[3].rstrip(b"\n")
                if path not in {excluded, b'"' + excluded + b'"'}:
                    target.write(line)
            else:
                target.write(line)
    with filtered.open("rb") as stream:
        subprocess.run(
            ["git", "-C", str(repo), "fast-import", "--quiet", "--force"],
            stdin=stream, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)


def main():
    if git(ROOT, "status", "--porcelain"):
        raise RuntimeError("Save/commit the source changes before preparing the copy.")
    source_head = git(ROOT, "rev-parse", "HEAD")
    source_refs = refs(ROOT)
    source_tree = tree(ROOT, source_head)
    original_count = git(ROOT, "rev-list", "--count", source_head)
    oversized = [path for size, path in blob_sizes(ROOT) if size >= LIMIT]
    if not oversized or set(oversized) != {EXCLUDED}:
        raise RuntimeError("Oversized files differ from the approved PDF exclusion; review first.")
    remote = urlsplit(git(ROOT, "remote", "get-url", "origin"))
    if remote.scheme != "https" or remote.hostname != "github.com" or remote.username or remote.password:
        raise RuntimeError("A credential-free HTTPS GitHub remote is required.")
    remote_url = "https://github.com" + remote.path
    GENERATED.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="github-preparation-", dir=GENERATED) as work:
        work = Path(work)
        bare = work / "filtered.git"
        git(ROOT, "clone", "--bare", "--no-hardlinks", str(ROOT), str(bare))
        print("Removing the oversized PDF from the COPY'S branch history...", flush=True)
        filter_history(bare, work)
        for ref in git(bare, "for-each-ref", "--format=%(refname)", "refs/original").splitlines():
            git(bare, "update-ref", "-d", ref)
        git(bare, "reflog", "expire", "--expire=now", "--all")
        git(bare, "gc", "--prune=now")
        if set(refs(bare)) != set(source_refs):
            raise RuntimeError("The copy lost a branch or tag.")
        for ref in source_refs:
            if git(ROOT, "rev-list", "--count", ref) != git(bare, "rev-list", "--count", ref):
                raise RuntimeError("History length changed unexpectedly.")
            expected_tree = {path: oid for path, oid in tree(ROOT, ref).items()
                             if path != EXCLUDED}
            if tree(bare, ref) != expected_tree:
                raise RuntimeError("A branch or tag snapshot changed unexpectedly.")
        copied = work / "repository"
        git(ROOT, "clone", "--no-hardlinks", "--branch", "main", str(bare), str(copied))
        for ref in source_refs:
            if ref.startswith("refs/heads/") and ref != "refs/heads/main":
                branch = ref.removeprefix("refs/heads/")
                git(copied, "branch", branch, "origin/" + branch)
        git(copied, "remote", "set-url", "origin", remote_url)
        ignore = copied / ".gitignore"
        ignore.write_text(ignore.read_text().rstrip() + "\n\n"
                          "# Oversized catalog is preserved in the separate original backup.\n"
                          "/" + EXCLUDED + "\n")
        guide = """# GitHub-ready private backup

This is a separate copy, not the original app.
The original catalog PDF exceeds GitHub's ordinary per-file limit and was removed
ONLY from this copy's history. Its exact original and the unfiltered history remain
in the original app and the offline DoorSurvey transfer package.
All other original main-branch files are preserved. Stripe was not removed.
Filtered commits have new IDs; an additional backup note/exclusion commit is added.

Push this repository, NOT the original app root or the large transfer-package ZIP:
    git push origin main

Use a PRIVATE GitHub repository. This command does not force-replace existing
remote history. GitHub authorization must work separately; preparing this copy
does not establish authentication or upload any code.

Import the GitHub repository into the shared Replit workspace afterwards.
Reconnect services and secrets there. Live databases, external Object Storage,
deployments and Agent chat/canvas are not part of this Git backup.
Keep the original app and offline backup until the shared copy is verified.
"""
        (copied / "GITHUB-BACKUP.md").write_text(guide)
        git(copied, "add", "--", ".gitignore", "GITHUB-BACKUP.md")
        git(copied, "-c", "user.name=Backup Preparation", "-c", "user.email=backup@localhost",
            "commit", "-m", "Document separate oversized catalog backup")
        clean_tree = tree(copied, "HEAD")
        expected = {path: oid for path, oid in source_tree.items()
                    if path not in {EXCLUDED, ".gitignore"}}
        actual = {path: oid for path, oid in clean_tree.items()
                  if path not in {".gitignore", "GITHUB-BACKUP.md"}}
        if expected != actual or EXCLUDED in clean_tree:
            raise RuntimeError("The copy differs beyond the approved PDF and backup metadata.")
        blobs = blob_sizes(copied)
        if any(size >= LIMIT for size, _ in blobs):
            raise RuntimeError("The copy still contains an oversized historical file.")
        git(copied, "fsck", "--full", "--no-dangling")
        if git(ROOT, "rev-parse", "HEAD") != source_head or refs(ROOT) != source_refs:
            raise RuntimeError("The original repository changed during preparation.")
        if tree(ROOT, source_head) != source_tree or not (ROOT / EXCLUDED).is_file():
            raise RuntimeError("Original source preservation check failed.")
        report = {
            "source_head": source_head,
            "source_main_commits": int(original_count),
            "source_refs": source_refs,
            "github_ready_main": git(copied, "rev-parse", "HEAD"),
            "filtered_refs": refs(copied),
            "excluded_only_from_copy": EXCLUDED,
            "unchanged_original_files": len(expected),
            "largest_reachable_blob_bytes": max(size for size, _ in blobs),
            "pushed": False,
        }
        if DESTINATION.exists():
            previous = GENERATED / ("github-ready-previous-" + os.urandom(4).hex())
            DESTINATION.rename(previous)
        copied.rename(DESTINATION)
        (GENERATED / "github-ready-verification.json").write_text(json.dumps(report, indent=2))
    print("GitHub-ready copy:", DESTINATION.relative_to(ROOT))
    print("Original history commits preserved:", original_count)
    print("Unchanged original files:", len(expected))
    print("Largest historical file:", report["largest_reachable_blob_bytes"], "bytes")
    print("Original app and catalog unchanged. No GitHub push was attempted.")


if __name__ == "__main__":
    main()
