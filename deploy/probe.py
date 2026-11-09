"""Sample HTML, its JS/CSS resources, and release during deployment; write JSON evidence."""
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import time
import urllib.parse
import urllib.request


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and attrs.get('src'):
            self.urls.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'modulepreload'):
            self.urls.append(attrs['href'])


def get(url):
    with urllib.request.urlopen(url, timeout=5) as response:
        return response.read()


def sample(base, expected=None, retained=None):
    base = base.rstrip('/') + '/'
    page = get(base).decode('utf-8')
    if '<div id="root">' not in page:
        raise ValueError('Application root missing')
    parser = Assets()
    parser.feed(page)
    if not parser.urls:
        raise ValueError('No built JS/CSS assets found')
    urls = {urllib.parse.urljoin(base, value) for value in parser.urls}
    if retained is not None:
        retained.update(urls)
        urls = retained
    for url in urls:
        if not get(url):
            raise ValueError(f'Empty asset: {url}')
    release = json.loads(get(base + 'release.json'))['release']
    if expected and release != expected:
        raise ValueError(f'Expected {expected}, received {release}')
    return release


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--seconds', type=float, default=120)
    parser.add_argument('--expected-release')
    parser.add_argument('--output', default='artifacts/availability.json')
    args = parser.parse_args()
    if args.seconds <= 0:
        parser.error('--seconds must be positive')
    results, retained = [], set()
    end = time.monotonic() + args.seconds
    while time.monotonic() < end:
        row = {'time': datetime.now(timezone.utc).isoformat()}
        start = time.monotonic()
        try:
            row.update(ok=True, release=sample(args.url, args.expected_release, retained))
        except Exception as exc:
            row.update(ok=False, error=str(exc))
        row['elapsed_ms'] = round((time.monotonic() - start) * 1000, 1)
        results.append(row)
        print(json.dumps(row), flush=True)
        time.sleep(0.2)
    failures = sum(not row['ok'] for row in results)
    report = {'url': args.url, 'samples': len(results), 'failures': failures,
              'releases': sorted({row['release'] for row in results if row['ok']}),
              'results': results}
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    raise SystemExit(1 if failures else 0)


if __name__ == '__main__':
    main()
