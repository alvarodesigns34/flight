"""Exercise the real deployment file selection, not just the source checkout."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/prepare_pages.py'
spec = importlib.util.spec_from_file_location('flight_prepare_pages', SCRIPT)
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


class PagesArtifactTest(unittest.TestCase):
    def test_runtime_contains_compressed_models_lighting_and_native_downloads(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'site'
            info = pages.stage(output, 'test-checkpoint')
            files = {entry['path']: entry for entry in info['files']}
            for name in ['assets/tomcat-original.meshopt.glb', 'assets/tomcat-evolved.meshopt.glb',
                         'assets/evolved-model.json', 'assets/environment/pmrem.json',
                         'assets/environment/studio-small-09-pmrem.bin.gz',
                         'assets/environment/kloofendal-sky-pmrem.bin.gz',
                         'assets/F14A_TOMCAT_ORIGINAL.blend', 'assets/F14A_TOMCAT_EVOLVED.blend']:
                self.assertIn(name, files)
                self.assertEqual((output / name).stat().st_size, files[name]['bytes'])
            for name in ['assets/tomcat.glb', 'assets/tomcat-original.glb', 'assets/tomcat-evolved.glb']:
                self.assertNotIn(name, files)
            self.assertTrue((output / 'build-info.json').is_file())
            self.assertTrue((output / '.nojekyll').is_file())


if __name__ == '__main__':
    unittest.main()
