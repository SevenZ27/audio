"""Fetch exactly the existing catalog's source revision without reselecting rigs."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
import autoeq_source as src


def main():
    cfg = json.loads((ROOT / 'pipeline/rigs.json').read_text(encoding='utf-8'))
    src.ensure_clone()
    if src.git('status', '--porcelain', '--untracked-files=no').strip():
        # An initial no-checkout clone has an empty index; don't call this script
        # until its sparse checkout has been initialized.
        raise ValueError('Source checkout has tracked modifications; refusing to replace them')
    sha = cfg['autoeq_commit']
    if not __import__('re').fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Expected a full source commit SHA')
    subprocess.run(['git', '-C', str(src.REPO), 'fetch', '--depth', '1', 'origin', sha], check=True)
    subprocess.run(['git', '-C', str(src.REPO), 'config', 'core.autocrlf', 'false'], check=True)
    patterns = ['/results/*.md']
    for r in cfg['rigs']:
        for folder in sorted({m['folder'] for m in r['members']}):
            patterns.append(f"/results/{r['source']}/{folder}/*/*.csv")
    subprocess.run(['git', '-c', 'core.autocrlf=false', '-C', str(src.REPO), 'sparse-checkout', 'set', '--no-cone', *patterns], check=True)
    subprocess.run(['git', '-c', 'core.autocrlf=false', '-C', str(src.REPO), 'checkout', '--detach', sha], check=True)
    print('Locked source ready:', sha)


if __name__ == '__main__':
    main()
