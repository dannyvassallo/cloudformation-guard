#!/bin/sh -l
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh
export PATH="$HOME/.guard/bin:$PATH"

exit_code=0

if ! cfn-guard validate -r $1 -d $2 --output-format sarif  --show-summary none --structured > result.sarif; then
  exit_code=1
  cat result.sarif
fi

if ! cfn-guard validate -r $1 -d $2 --output-format junit  --show-summary none --structured > result.xml; then
  exit_code=1
  cat result.xml
fi

curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{"body": "HELLO"}' \
  "https://api.github.com/repos/$GITHUB_REPOSITORY/pulls/$GITHUB_BASE_REF/comments"

exit $exit_code
