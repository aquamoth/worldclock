#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
artifact_directory=${1:-"$repository_root/.scratch/world-clock-v1/release-artifacts"}
cd "$repository_root"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "The clean Android gate requires a clean committed checkout." >&2
  exit 1
fi

npm ci
npm run catalog:generate
git diff --exit-code -- catalog
npm run catalog:check
npm run typecheck
npm test -- --runInBand
npx expo install --check
npx expo-doctor
npm run release:cng-check

(
  cd android
  NODE_ENV=production ./gradlew assembleRelease
)

source_apk="$repository_root/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$source_apk" ]]; then
  echo "Release APK was not produced at $source_apk" >&2
  exit 1
fi

mkdir -p "$artifact_directory"
artifact_path="$artifact_directory/worldclock-v1-1.0.0-release.apk"
cp "$source_apk" "$artifact_path"

android_sdk_root=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
if [[ -z "$android_sdk_root" ]]; then
  echo "ANDROID_HOME or ANDROID_SDK_ROOT is required to verify the APK." >&2
  exit 1
fi
build_tools=$(find "$android_sdk_root/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)
"$build_tools/apksigner" verify --verbose "$artifact_path"
"$build_tools/aapt" dump badging "$artifact_path" | sed -n '1,3p'

apk_contents=$(unzip -Z1 "$artifact_path")
if ! grep -q 'libhermesvm\.so' <<< "$apk_contents"; then
  echo "Release APK does not contain the Hermes runtime." >&2
  exit 1
fi

artifact_sha256=$(sha256sum "$artifact_path" | cut -d ' ' -f 1)
artifact_size=$(stat -c '%s' "$artifact_path")
echo "RELEASE_ARTIFACT path=$artifact_path sha256=$artifact_sha256 size_bytes=$artifact_size"
