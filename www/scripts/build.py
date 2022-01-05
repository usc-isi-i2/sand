import json, os, subprocess, copy, sys
from pathlib import Path

outdir = Path(sys.argv[1]).absolute()
force = len(sys.argv) > 2 and sys.argv[2] == "force"
www_dir = Path(os.path.abspath("."))

with open(www_dir / "package.json") as f:
    pkg = json.load(f)
    version = pkg["version"]

if not (outdir / "version.txt").exists():
    built_version = None
else:
    with open(outdir / "version.txt", "r") as f:
        built_version = f.read().strip()

if version == built_version and not force:
    print(f"The package's version ({version}) is up to date. Skip building")
    exit(0)

env = copy.copy(os.environ)
env["BUILD_PATH"] = str(outdir)
subprocess.check_call(
    [
        "npx",
        "react-scripts",
        "build",
    ],
    env=env,
)
with open(outdir / "version.txt", "w") as f:
    f.write(version)
