from __future__ import annotations

from pre_commit_hooks.cfn_guard import main
import os


def test_failing_template():
    ret = main(
        [
            "validate",
            "--rules='./guard/resources/validate/rules-dir/'",
            "--data='./guard/resources/validate/data-dir/'",
        ]
    )
    assert ret == 19


def test_passing_template():
    ret = main(
        [
            "validate",
            "--rules='./guard/resources/validate/rules-dir/s3_bucket_public_read_prohibited.guard'",
            "--data='./guard/resources/validate/data-dir/s3-public-read-prohibited-template-compliant.yaml'",
        ]
    )
    assert ret == 0
