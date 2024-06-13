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

LATEST_RELEASE_URL = "https://api.github.com/repos/aws-cloudformation/cloudformation-guard/releases/latest
BIN_NAME = "cfn-guard"
UNSUPPORTED_OS_MSG = "Unsupported operating system. Could not install cfn-guard."

release_urls_dict = {
  "darwin": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-macos-latest.tar.gz",
  "linux": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-ubuntu-latest.tar.gz",
  "win32": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-windows-latest.tar.gz",
  "win64": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-windows-latest.tar.gz",
}
supported_oses = ["linux", "darwin", "win32", "win64"]
windows_oses = ["win32", "win64"]
current_os = platform.system().lower()

# Roll our own get request method to avoid extra deps
def request(url: str):
  # Explicitly set the headers to avoid User-Agent "Python-urllib/x.y"
  # https://docs.python.org/3/howto/urllib2.html#headers
  return Request(url, headers={'User-Agent': 'Mozilla/5.0'})

# Get the latest release tag from Github
def get_latest_tag() -> str:
  req = request(LATEST_RELEASE_URL)

  with urlopen(req) as response:
    data = response.read().decode('utf-8')
    import json
    return json.loads(data)["tag_name"]

# Get OS specific binary name
def get_binary_name() -> str:
  return BIN_NAME + (".exe" if current_os in windows_oses else "")

# Install latest cfn-guard to the os tmp directory
def install_cfn_guard():
    latest_tag = get_latest_tag()
    binary_name = get_binary_name()

    if current_os in supported_oses:
        url = release_urls_dict[current_os].replace("TAG", latest_tag)
        filename = os.path.basename(urlparse(url).path)

        with tempfile.TemporaryDirectory() as temp_dir:
            req = request(url)
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
                return

            tmp_dir = tempfile.gettempdir()
            dest_path = os.path.join(tmp_dir, binary_name)

            os.makedirs(os.path.dirname(dest_path), exist_ok=True)

            shutil.move(binary_path, dest_path)
    else:
        # This is unlikely to happen though worth covering
        # in case the user attempts to use on another OS.
        raise Exception(UNSUPPORTED_OS_MSG)

def run_cfn_guard(args: Sequence[str]) -> int:
    tmp_dir = tempfile.gettempdir()
    binary_name = get_binary_name()
    binary_path = os.path.join(tmp_dir, binary_name)

    if os.path.exists(binary_path):
      # When executing the binary from within pre-commit (vs executing the script directly),
      # the subprocess doesn't seem to honor cwd to the project root. Instead, we change
      # the directory inside the subprocess via the cd command to the current working directory
      # as a workaround. This is not ideal, but it works.
      cmd = [f"cd {os.getcwd()} &&", binary_path] + list(args)
      project_root = os.path.dirname(os.path.abspath(__file__))
      process = subprocess.run(' '.join(cmd), shell=True, cwd=project_root)

      return process.returncode
    else:
        install_cfn_guard()
        return run_cfn_guard(args)

def main(argv: Sequence[str] | None = None) -> int:
  # This only serves to chop the first arg (the filename) when running the script directly
  if argv is None:
      argv = sys.argv[1:]

  return run_cfn_guard(argv)

if __name__ == '__main__':
    raise SystemExit(main())