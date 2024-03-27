#!/bin/sh -l
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh

export PATH="$HOME/.guard/bin:$PATH"

cfn-guard validate -r $1 -d $2 --output-format sarif  --show-summary none > result.sarif

cfn-guard validate -r $1 -d $2 --output-format junit  --show-summary none > result.xml
