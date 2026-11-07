"""Export a portable visual review. Published pages keep normal separate assets."""
from pathlib import Path
import base64
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design' / 'homepage' / 'preview'


def data_uri(relative: str) -> str:
    file = ROOT / relative.lstrip('/')
    mime = 'image/svg+xml' if file.suffix == '.svg' else 'image/webp'
    return 'data:' + mime + ';base64,' + base64.b64encode(file.read_bytes()).decode('ascii')


def export() -> Path:
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'  <link rel="preload"[^>]+>\n', '', html)
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
                  lambda m: '<style>\n' + (ROOT / m[1].lstrip('/')).read_text(encoding='utf-8') + '\n</style>', html)
    for script in ['home', 'visitor-tracker']:
        html = html.replace(f'  <script src="/js/{script}.js"></script>\n', '')
    html = re.sub(r'<script src="([^"]+)"></script>',
                  lambda m: '<script>\n' + (ROOT / m[1].lstrip('/')).read_text(encoding='utf-8') + '\n</script>', html)
    for asset in ['jade-deep.webp', 'jade-front.webp', 'pearl.webp', 'hero-mobile.webp']:
        html = html.replace('/assets/art/' + asset, data_uri('/assets/art/' + asset))
    for asset in ['jade-orbit.svg', 'blank.svg']:
        html = html.replace('/assets/svg/' + asset, data_uri('/assets/svg/' + asset))
    # Navigation in the portable review opens the existing live reading pages.
    html = re.sub(r'href="(/[^\"]*)"', r'href="https://yokiyuzi.github.io\1"', html)
    html = html.replace('href="https://yokiyuzi.github.io/"', 'href="#"')
    html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Portable visual review. Assets embedded; visitor tracking disabled. -->', 1)
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / 'homepage-preview.html'
    target.write_text(html, encoding='utf-8')
    return target


if __name__ == '__main__':
    print(export())
