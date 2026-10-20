"""Verify the locked source and fingerprint source bytes before any build."""
import hashlib
import importlib.metadata
import platform
import subprocess
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_manifest(repo: Path, cfg: dict) -> dict:
    def git(*args):
        return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()
    if git('rev-parse', 'HEAD') != cfg['autoeq_commit']:
        raise ValueError('AutoEq HEAD differs from rigs.json lock; run fetch_data.py')
    if git('status', '--porcelain', '--untracked-files=no'):
        raise ValueError('AutoEq tracked source has local edits')
    paths = sorted({m['csv'] for r in cfg['rigs'] for m in r['members']} | {'results/RANKING.md'})
    files = []
    root = repo.resolve()
    for name in paths:
        path = (repo / name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError('Missing or unsafe source path')
        files.append({'path': name, 'sha256': sha256(path), 'bytes': path.stat().st_size})
    return {'commit': cfg['autoeq_commit'], 'files': files}


def environment() -> dict:
    return {'python': platform.python_version(), 'platform': platform.system(),
            'packages': {p: importlib.metadata.version(p) for p in ('numpy', 'pandas', 'scikit-learn', 'scipy')}}
