"""Read-only helpers around the sparse AutoEq clone in pipeline/.cache/AutoEq.

The repo is about 4 GB, so it is cloned with --filter=blob:none --sparse and
only the files we need get checked out. File listings come from git ls-tree,
which works without downloading blobs.
"""
from __future__ import annotations

import csv
import io
import subprocess
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE / ".cache" / "AutoEq"
REPO_URL = "https://github.com/jaakkopasanen/AutoEq"
FORMS = ("in-ear", "over-ear", "earbud")


def git(*args: str, text: bool = True) -> str:
    out = subprocess.run(
        ["git", "-c", "core.quotepath=off", "-C", str(REPO), *args],
        check=True,
        capture_output=True,
    )
    return out.stdout.decode("utf-8") if text else out.stdout


def ensure_clone() -> None:
    if (REPO / ".git").exists():
        return
    REPO.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["git", "clone", "--config", "core.autocrlf=false", "--depth", "1", "--filter=blob:none", "--sparse", REPO_URL, str(REPO)],
        check=True,
    )


def head_info() -> tuple[str, str]:
    sha, date = git("log", "-1", "--format=%H|%cs").strip().split("|")
    return sha, date


@dataclass(frozen=True)
class ResultEntry:
    source: str
    folder: str  # e.g. "in-ear" or "GRAS RA0045 in-ear"
    form: str
    rig_from_folder: str  # "" when the folder does not say
    name: str
    csv_path: str  # path inside the repo


def split_folder(folder: str) -> tuple[str, str]:
    for form in FORMS:
        if folder == form:
            return form, ""
        if folder.endswith(" " + form):
            return form, folder[: -len(form) - 1]
    return "", folder


def list_result_csvs() -> list[ResultEntry]:
    rows = []
    for line in git("ls-tree", "-r", "--name-only", "HEAD", "results/").splitlines():
        parts = line.split("/")
        if len(parts) != 5 or not line.endswith(".csv"):
            continue
        _, source, folder, name, fname = parts
        if fname != f"{name}.csv":
            continue
        form, rig = split_folder(folder)
        if not form:
            continue
        rows.append(ResultEntry(source, folder, form, rig, name, line))
    return rows


def list_result_models() -> list[tuple[str, str, str]]:
    """(source, folder, name) for every results folder, with or without CSV."""
    seen = set()
    for line in git("ls-tree", "-r", "--name-only", "HEAD", "results/").splitlines():
        parts = line.split("/")
        if len(parts) == 5:
            seen.add((parts[1], parts[2], parts[3]))
    return sorted(seen)


def read_name_index(source: str) -> dict[str, dict[str, str]]:
    """name -> {form, rig} from measurements/<source>/name_index.tsv, if present."""
    try:
        raw = git("show", f"HEAD:measurements/{source}/name_index.tsv")
    except subprocess.CalledProcessError:
        return {}
    out: dict[str, dict[str, str]] = {}
    for row in csv.DictReader(io.StringIO(raw), delimiter="\t"):
        name = (row.get("name") or "").strip()
        form = (row.get("form") or "").strip()
        if not name or form == "ignore":
            continue
        out.setdefault(name, {"form": form, "rig": (row.get("rig") or "").strip()})
    return out


def read_blob(path: str) -> str:
    return git("show", f"HEAD:{path}")
