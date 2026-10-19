"""Build the static website and automatically publish column/media/**/*.livp."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shutil

from livephotos import convert, render_gallery

PUBLIC_DIRS = ['archives', 'assets', 'blog', 'column', 'css', 'guestbook', 'js', 'resume', 'visitors']
PUBLIC_FILES = ['index.html', 'robots.txt', 'sitemap.xml', 'CNAME', '404.html']


def build(root: Path, output: Path) -> list[dict]:
    root, output = root.resolve(), output.resolve()
    if output == root or root.is_relative_to(output):
        raise ValueError('Build output must not be the source directory or its parent.')
    if output.exists() and any(output.iterdir()):
        raise ValueError('Use a new or empty output directory to avoid stale published media.')
    output.mkdir(parents=True, exist_ok=True)
    for name in PUBLIC_DIRS:
        if (root / name).exists():
            shutil.copytree(root / name, output / name, ignore=shutil.ignore_patterns('README.md'))
    for name in PUBLIC_FILES:
        if (root / name).exists():
            shutil.copy2(root / name, output / name)
    (output / '.nojekyll').touch()

    media = root / 'column' / 'media'
    sources = sorted(p for p in media.rglob('*') if p.is_file() and p.suffix.lower() == '.livp')
    items = []
    for source in sources:
        print(f'Converting: {source.relative_to(root)}', flush=True)
        try:
            items.append(convert(source, root, output))
        except Exception as error:
            raise RuntimeError(f'Could not publish {source.relative_to(root)}: {error}') from error
    items.sort(key=lambda item: (item['date'], item['title']), reverse=True)
    catalog = output / 'column' / 'livephotos.json'
    catalog.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    page = output / 'column' / 'index.html'
    source_html = page.read_text(encoding='utf-8')
    if items:
        source_html, replaced = re.subn(r'<!-- LIVE_PHOTOS_START -->.*?<!-- LIVE_PHOTOS_END -->',
            lambda _: '<!-- LIVE_PHOTOS_START -->\n' + render_gallery(items) + '\n<!-- LIVE_PHOTOS_END -->',
            source_html, flags=re.S)
        if replaced != 1:
            raise ValueError('The column page must contain exactly one live photo gallery placeholder.')
    page.write_text(source_html, encoding='utf-8')
    print(f'Built {output}; {len(items)} Live Photo(s).', flush=True)
    return items


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, default=Path('_site'))
    args = parser.parse_args()
    build(args.root, args.output)
