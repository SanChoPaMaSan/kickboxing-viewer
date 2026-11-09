"""Linux Docker-host deployment. Retain old backends/assets for draining and rollback."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.request
import uuid


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


def wait_for(check, attempts=30):
    last = None
    for _ in range(attempts):
        try:
            if check():
                return
        except (OSError, ValueError, subprocess.CalledProcessError) as exc:
            last = exc
        time.sleep(1)
    raise RuntimeError(f'Health/release verification timed out: {last}')


def release_at(url):
    with urllib.request.urlopen(url, timeout=3) as response:
        return json.load(response)['release']


def proxy_config(backend):
    if not re.fullmatch(r'strikelab-app-[a-f0-9]+', backend):
        raise ValueError('Invalid backend name')
    return '''server {
    listen 80;
    server_name _;
    location /assets/ {
        root /srv;
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / {
        proxy_pass http://BACKEND:80;
        proxy_set_header Host $host;
        add_header Cache-Control "no-store" always;
    }
}
'''.replace('BACKEND', backend)


def atomic_write(path, text):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(text, encoding='utf-8')
    tmp.replace(path)


def deploy(image, release, state, port):
    state = Path(state).resolve()
    conf = state / 'conf'
    assets = state / 'assets'
    conf.mkdir(parents=True, exist_ok=True)
    assets.mkdir(parents=True, exist_ok=True)
    config = conf / 'default.conf'
    old_config = config.read_text(encoding='utf-8') if config.exists() else None
    proxy_exists = bool(docker('ps', '-aq', '--filter', 'name=^/strikelab-proxy$'))
    if proxy_exists != bool(old_config):
        raise RuntimeError('Proxy/state mismatch. Restore the existing state directory before deployment.')
    if not docker('network', 'ls', '-q', '--filter', 'name=^strikelab$'):
        docker('network', 'create', 'strikelab')
    docker('pull', image)
    candidate = 'strikelab-app-' + uuid.uuid4().hex[:12]
    docker('run', '-d', '--name', candidate, '--network', 'strikelab',
           '--restart', 'unless-stopped', image)
    switched = False
    try:
        wait_for(lambda: docker('inspect', '-f', '{{.State.Health.Status}}', candidate) == 'healthy')
        candidate_release = json.loads(docker('exec', candidate, 'wget', '-qO-',
                                              'http://127.0.0.1/release.json'))['release']
        if candidate_release != release:
            raise ValueError('Image release does not match the requested commit')
        # Shared immutable hashed assets keep already-open old HTML working after a switch.
        docker('cp', f'{candidate}:/usr/share/nginx/html/assets/.', str(assets))
        atomic_write(config, proxy_config(candidate))
        # Set before reload: any subsequent failure must restore the former configuration.
        switched = True
        if proxy_exists:
            docker('exec', 'strikelab-proxy', 'nginx', '-t')
            docker('exec', 'strikelab-proxy', 'nginx', '-s', 'reload')
        else:
            docker('run', '-d', '--name', 'strikelab-proxy', '--network', 'strikelab',
                   '--restart', 'unless-stopped', '-p', f'{port}:80',
                   '-v', f'{conf}:/etc/nginx/conf.d:ro', '-v', f'{assets}:/srv/assets:ro',
                   'nginx:stable-alpine')
        wait_for(lambda: release_at(f'http://127.0.0.1:{port}/release.json') == release)
        atomic_write(state / 'active.json', json.dumps({
            'image': image, 'release': release, 'container': candidate,
            'port': port, 'previous_config': old_config,
        }, indent=2))
        print(f'Deployed {release} on port {port}; old containers/assets retained.')
    except BaseException:
        if switched:
            if old_config:
                atomic_write(config, old_config)
                docker('exec', 'strikelab-proxy', 'nginx', '-t')
                docker('exec', 'strikelab-proxy', 'nginx', '-s', 'reload')
                # Preserve candidate too: draining workers may still reference it.
            else:
                docker('rm', '-f', 'strikelab-proxy')
                config.unlink(missing_ok=True)
                docker('rm', '-f', candidate)
        else:
            docker('rm', '-f', candidate)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image', help='Docker Hub image pinned to @sha256 digest')
    parser.add_argument('release', help='Expected release.json commit SHA')
    parser.add_argument('--state', default=str(Path.home() / '.local/share/strikelab'))
    parser.add_argument('--port', type=int, default=8080)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}', args.image):
        parser.error('Use a repository@sha256:<64 lowercase hex digits> image reference')
    if not 1 <= args.port <= 65535:
        parser.error('Port must be between 1 and 65535')
    if os.name != 'posix':
        parser.error('Run on the Linux Docker host (self-hosted runner)')
    import fcntl
    state = Path(args.state).expanduser().resolve()
    state.mkdir(parents=True, exist_ok=True)
    with (state / 'deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        deploy(args.image, args.release, state, args.port)


if __name__ == '__main__':
    main()
