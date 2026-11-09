import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('deployment', Path(__file__).parents[1] / 'deploy.py')
deployment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deployment)


class DeploymentTests(unittest.TestCase):
    def run_deploy(self, *, release='new', reload_failure=False, public_failure=False, healthy=True):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        state = Path(temp.name)
        (state / 'conf').mkdir()
        old = deployment.proxy_config('strikelab-app-abc')
        (state / 'conf/default.conf').write_text(old)
        (state / 'active.json').write_text('{"release":"old"}')
        calls = []
        failed_reload = False

        def fake_docker(*args):
            nonlocal failed_reload
            calls.append(args)
            if args[0] == 'ps':
                return 'proxy-id'
            if args[:2] == ('network', 'ls'):
                return 'network-id'
            if args[0] == 'inspect':
                return 'healthy' if healthy else 'unhealthy'
            if 'wget' in args:
                return json.dumps({'release': release})
            if args[-2:] == ('-s', 'reload') and reload_failure and not failed_reload:
                failed_reload = True
                raise subprocess.CalledProcessError(1, args)
            return ''

        def wait_once(check, **kwargs):
            if not check():
                raise RuntimeError('health check failed')

        with patch.object(deployment, 'docker', side_effect=fake_docker), \
             patch.object(deployment, 'wait_for', side_effect=wait_once), \
             patch.object(deployment, 'release_at', return_value='old' if public_failure else 'new'):
            if release != 'new' or reload_failure or public_failure or not healthy:
                with self.assertRaises((ValueError, RuntimeError, subprocess.CalledProcessError)):
                    deployment.deploy('test@sha256:abc', 'new', state, 8080)
                self.assertEqual((state / 'conf/default.conf').read_text(), old)
                self.assertEqual(json.loads((state / 'active.json').read_text())['release'], 'old')
            else:
                deployment.deploy('test@sha256:abc', 'new', state, 8080)
                self.assertEqual(json.loads((state / 'active.json').read_text())['release'], 'new')
                self.assertNotEqual((state / 'conf/default.conf').read_text(), old)
        return calls

    def test_success_keeps_old_backend_and_assets(self):
        calls = self.run_deploy()
        self.assertFalse(any(call[0] == 'rm' for call in calls))
        self.assertTrue(any(call[0] == 'cp' for call in calls))

    def test_wrong_release_never_reloads(self):
        calls = self.run_deploy(release='wrong')
        self.assertFalse(any('reload' in call for call in calls))
        self.assertTrue(any(call[0] == 'rm' for call in calls))

    def test_unhealthy_candidate_never_reloads(self):
        calls = self.run_deploy(healthy=False)
        self.assertFalse(any('reload' in call for call in calls))

    def test_reload_failure_restores_old_configuration(self):
        calls = self.run_deploy(reload_failure=True)
        self.assertEqual(sum('reload' in call for call in calls), 2)

    def test_public_release_mismatch_rolls_back(self):
        calls = self.run_deploy(public_failure=True)
        self.assertEqual(sum('reload' in call for call in calls), 2)
        self.assertFalse(any(call[0] == 'rm' for call in calls))

    def test_config_rejects_injection(self):
        with self.assertRaises(ValueError):
            deployment.proxy_config('backend; return 200;')


if __name__ == '__main__':
    unittest.main()
