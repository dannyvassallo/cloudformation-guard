"""
This module tests that the main method accepts
cfn-guard args and returns the expected error code
"""

from __future__ import annotations

from pre_commit_hooks.cfn_guard import main

import os.path

def get_resource_path(relative_path):
    return os.path.join(os.path.abspath(__file__ + "/../../")) + '/guard/resources/' + relative_path

def test_validate_failing_template():
    """Test a failing case."""
    ret = main(
        [
            get_resource_path('/validate/data-dir/'),
            "--operation=validate",
            "--rules='./guard/resources/validate/rules-dir/'",
        ]
    )
    assert ret == 19


def test_validate_passing_template():
    """Test a success case."""
    rule = get_resource_path('/validate/rules-dir/s3_bucket_public_read_prohibited.guard')
    data = get_resource_path('/validate/data-dir/s3-public-read-prohibited-template-compliant.yaml')
    ret = main(
        [
            data,
            "--operation=validate",
            f"--rules={rule}",
        ]
    )
    assert ret == 0
