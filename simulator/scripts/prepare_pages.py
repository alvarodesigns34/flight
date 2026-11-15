"""Stage only the browser runtime for GitHub Pages, preserving relative asset URLs."""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / 'simulator'


def stage(output, commit):
    output = Path(output).resolve()
    # Never replace existing directories or stage within the source runtime.
    if output == RUNTIME or RUNTIME in output.parents:
        raise ValueError('Pages output must be outside simulator/')
    files = [RUNTIME / 'index.html', RUNTIME / 'style.css']
    for directory in ['dist', 'assets']:
        files.extend(sorted((RUNTIME / directory).rglob('*')))
    files = [path for path in files if path.is_file() and path != RUNTIME / 'assets/tomcat.glb']
    required = {'index.html', 'style.css', 'dist/app.js', 'assets/tomcat-original.glb', 'assets/original-model.json', 'assets/F14A_TOMCAT_ORIGINAL.blend', 'assets/environment/studio-small-09-2k.hdr', 'assets/environment/kloofendal-sky-2k.hdr', 'assets/THREE-LICENSE.txt'}
    relative = {path.relative_to(RUNTIME).as_posix() for path in files}
    if not required.issubset(relative):
        raise ValueError('Missing runtime files: ' + str(required - relative))
    if any(path.is_symlink() for path in files):
        raise ValueError('Pages artifacts must not contain symbolic links')
    output.mkdir(parents=True, exist_ok=False)
    manifest = []
    for path in files:
        name = path.relative_to(RUNTIME)
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
        manifest.append({'path': name.as_posix(), 'bytes': target.stat().st_size,
                         'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    (output / '.nojekyll').touch()
    info = {'source_commit': commit, 'files': manifest}
    (output / 'build-info.json').write_text(json.dumps(info, indent=2) + '\n')
    return info


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='_site')
    parser.add_argument('--commit')
    args = parser.parse_args()
    commit = args.commit or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    result = stage(args.output, commit)
    print(json.dumps({'output': args.output, 'source_commit': commit, 'runtime_files': len(result['files'])}))
