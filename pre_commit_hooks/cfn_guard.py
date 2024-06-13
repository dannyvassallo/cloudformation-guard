import os
import platform
import shutil
import tarfile
import tempfile
import argparse
from typing import Sequence
from urllib.parse import urlparse, urlencode
from urllib.request import Request, urlopen
import sys
import subprocess

release_urls = {
  "darwin": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-macos-latest.tar.gz",
  "linux": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-ubuntu-latest.tar.gz",
  "win32": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-windows-latest.tar.gz",
  "win64": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-windows-latest.tar.gz",
}

def get_latest_tag():
  url = "https://api.github.com/repos/aws-cloudformation/cloudformation-guard/releases/latest"
  req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
  with urlopen(req) as response:
    data = response.read().decode('utf-8')
    import json
    return json.loads(data)["tag_name"]

def install_cfn_guard():
    latest_tag = get_latest_tag()
    current_os = platform.system().lower()

    if current_os in ["linux", "darwin", "win32", "win64"]:
        url = release_urls[current_os].replace("TAG", latest_tag)
        filename = os.path.basename(urlparse(url).path)
        binary_name = "cfn-guard" + (".exe" if current_os in ["win32", "win64"] else "")

        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Downloading cfn-guard from {url} {temp_dir}")
            req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urlopen(req) as response:
                tar_path = os.path.join(temp_dir, filename)
                with open(tar_path, "wb") as tar_file:
                    tar_file.write(response.read())

                with tarfile.open(tar_path, "r:gz") as tar:
                    tar.extractall(temp_dir)

            binary_path = None
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    if file == binary_name:
                        binary_path = os.path.join(root, file)
                        break

            if binary_path is None:
                print("Unable to find the extracted binary")
                return

            tmp_dir = tempfile.gettempdir()
            dest_path = os.path.join(tmp_dir, binary_name)

            os.makedirs(os.path.dirname(dest_path), exist_ok=True)

            shutil.move(binary_path, dest_path)
            print(f"cfn-guard binary installed in {dest_path}")
    else:
        print("Unsupported operating system")

def run_cfn_guard(args: Sequence[str]):
    print("Running cfn-guard with args:", args)
    binary_name = "cfn-guard" + (".exe" if platform.system().lower() == "windows" else "")
    tmp_dir = tempfile.gettempdir()
    binary_path = os.path.join(tmp_dir, binary_name)
    if os.path.exists(binary_path):
        cmd = [f"cd {os.getcwd()} &&", binary_path] + list(args)
        try:
            project_root = os.path.dirname(os.path.abspath(__file__))
            print(f"Running command: {cmd}")
            return subprocess.run(' '.join(cmd), shell=True, cwd=project_root)

        except subprocess.CalledProcessError as e:
            print(f"cfn-guard exited with non-zero status code: {e.returncode}")
            return e.returncode
    else:
        install_cfn_guard()
        return run_cfn_guard(args)

def main(argv: Sequence[str] | None = None) -> int:
  print("Running cfn-guard pre-commit hook")
  print("Current working directory:", os.getcwd())
  if argv is None:
      argv = sys.argv[1:]

  return run_cfn_guard(argv)

if __name__ == '__main__':
    raise SystemExit(main())