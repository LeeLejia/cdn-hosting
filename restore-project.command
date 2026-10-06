#!/bin/sh
set -eu
cd "$(dirname "$0")"
cat project.part01 project.part02 project.part03 project.part04 > cognition-editable-project.zip
if command -v shasum >/dev/null 2>&1; then
  actual=$(shasum -a 256 cognition-editable-project.zip | cut -d ' ' -f 1)
else
  actual=$(sha256sum cognition-editable-project.zip | cut -d ' ' -f 1)
fi
if [ "$actual" != "5b25d7b1429cae25460d0e2789c7fbf46365aac48d4611c2429b38f1b2300faa" ]; then
  echo "Verification failed. Please download the complete bundle again."; exit 1
fi
echo "Complete: cognition-editable-project.zip"
