#!/bin/sh -l
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh

export PATH="$HOME/.guard/bin:$PATH"

cfn-guard --help
