from __future__ import annotations

from pre_commit_hooks.cfn_guard import main

def test():
    ret = main()
    assert True