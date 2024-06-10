from __future__ import annotations

import os
import platform
import shutil
import tempfile
from unittest.mock import patch, MagicMock
import pytest
from urllib.request import Request, urlopen

from pre_commit_hooks.cfn_guard import main, get_latest_tag, install_cfn_guard, run_cfn_guard

@pytest.fixture
def mock_env_setup(monkeypatch):
    # Mock platform.system() to return a supported OS
    monkeypatch.setattr(platform, "system", lambda: "Linux")

    # Mock tempfile.gettempdir() to return a known temporary directory
    temp_dir = tempfile.mkdtemp()
    monkeypatch.setattr(tempfile, "gettempdir", lambda: temp_dir)

    # Mock urllib.request.urlopen to return a mock response
    mock_response = MagicMock()
    mock_response.json.return_value = {"tag_name": "v3.0.0"}
    monkeypatch.setattr("urllib.request.urlopen", lambda *args, **kwargs: mock_response)

    # Decode the response data from bytes to string
    def mock_urlopen(*args, **kwargs):
        response = urlopen(*args, **kwargs)
        response.read = lambda: mock_response.read().decode('utf-8')
        return response

    monkeypatch.setattr("urllib.request.urlopen", mock_urlopen)

    yield

    # Clean up the temporary directory
    shutil.rmtree(temp_dir)

@patch("pre_commit_hooks.cfn_guard.shutil.which", return_value=False)
@patch("pre_commit_hooks.cfn_guard.tarfile.open")
@patch("pre_commit_hooks.cfn_guard.shutil.move")
def test_install_cfn_guard(mock_move, mock_tarfile_open, mock_which, mock_env_setup):
    install_cfn_guard()
    binary_name = "cfn-guard" + (".exe" if platform.system().lower() == "windows" else "")
    tmp_dir = tempfile.gettempdir()
    binary_path = os.path.join(tmp_dir, binary_name)
    assert mock_move.called

@patch("pre_commit_hooks.cfn_guard.shutil.which", return_value=True)
def test_run_cfn_guard(mock_which, mock_env_setup, capsys):
    run_cfn_guard(["--help"])
    captured = capsys.readouterr()
    assert "Running cfn-guard with args: ['--help']" in captured.out

def test_get_latest_tag(mock_env_setup):
    latest_tag = get_latest_tag()
    assert latest_tag == "v3.0.0"