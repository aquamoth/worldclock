#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repository_root"

tracked_native=$(git ls-files -- android ios)
if [[ -n "$tracked_native" ]]; then
  echo "Generated native output is tracked:" >&2
  echo "$tracked_native" >&2
  exit 1
fi

native_hash() {
  find android -type f \
    ! -path 'android/.gradle/*' \
    ! -path 'android/app/build/*' \
    ! -name local.properties \
    -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | cut -d ' ' -f 1
}

npx expo prebuild --platform android --clean --no-install
first_hash=$(native_hash)
npx expo prebuild --platform android --clean --no-install
second_hash=$(native_hash)

if [[ "$first_hash" != "$second_hash" ]]; then
  echo "Expo CNG output changed between clean generations: $first_hash != $second_hash" >&2
  exit 1
fi

echo "CNG_REPRODUCIBLE sha256=$second_hash tracked_native_files=0"
