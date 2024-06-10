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

release_urls = {
  "macos": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-macos-latest.tar.gz",
  "linux": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-ubuntu-latest.tar.gz",
  "windows": "https://github.com/aws-cloudformation/cloudformation-guard/releases/download/TAG/cfn-guard-v3-windows-latest.tar.gz",
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

  if current_os in release_urls:
    url = release_urls[current_os].replace("TAG", latest_tag)
    filename = os.path.basename(urlparse(url).path)
    binary_name = "cfn-guard" + (".exe" if current_os == "windows" else "")

    with tempfile.TemporaryDirectory() as temp_dir:
      req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
      with urlopen(req) as response:
        tar_path = os.path.join(temp_dir, filename)
        with open(tar_path, "wb") as tar_file:
          tar_file.write(response.read())

        with tarfile.open(tar_path, "r:gz") as tar:
          tar.extractall(temp_dir)

    binary_path = os.path.join(temp_dir, binary_name)
    tmp_dir = tempfile.gettempdir()
    dest_path = os.path.join(tmp_dir, binary_name)
    shutil.move(binary_path, dest_path)
    print(f"cfn-guard binary installed in {dest_path}")
  else:
    print("Unsupported operating system")

def run_cfn_guard(args):
  print("Running cfn-guard with args:", args)
  binary_name = "cfn-guard" + (".exe" if platform.system().lower() == "windows" else "")
  tmp_dir = tempfile.gettempdir()
  binary_path = os.path.join(tmp_dir, binary_name)
  if os.path.exists(binary_path):
    os.system(f"{binary_path} {' '.join(args)}")
  else:
    print("cfn-guard binary not found. Please install it first.")

def main(argv: Sequence[str] | None = None) -> int:
  print(argv)
  parser = argparse.ArgumentParser()
  parser.add_argument('args', nargs='*', help='Any additional arguments')

  args = parser.parse_args()

  print(f"Additional arguments: {args.args}")

  if shutil.which("cfn-guard") is None:
    install_cfn_guard()
  run_cfn_guard(args)