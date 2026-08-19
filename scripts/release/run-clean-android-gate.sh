#!/usr/bin/env bash
set -euo pipefail

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
artifact_directory=${1:-"$repository_root/.scratch/world-clock-v1/release-artifacts"}
cd "$repository_root"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "The clean Android gate requires a clean committed checkout." >&2
  exit 1
fi

pnpm install --frozen-lockfile
pnpm run catalog:generate
git diff --exit-code -- catalog
pnpm run catalog:check
pnpm run typecheck
pnpm test -- --runInBand --no-watchman
pnpm exec expo install --check
./node_modules/.bin/expo-doctor
pnpm run release:cng-check

(
  cd android
  NODE_ENV=production ./gradlew assembleRelease
)

source_apk="$repository_root/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$source_apk" ]]; then
  echo "Release APK was not produced at $source_apk" >&2
  exit 1
fi

android_sdk_root=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
if [[ -z "$android_sdk_root" ]]; then
  echo "ANDROID_HOME or ANDROID_SDK_ROOT is required to verify the APK." >&2
  exit 1
fi
build_tools=$(find "$android_sdk_root/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)
"$build_tools/apksigner" verify --verbose "$source_apk"
apk_badging=$("$build_tools/aapt" dump badging "$source_apk")
sed -n '1,3p' <<< "$apk_badging"

apk_contents=$(unzip -Z1 "$source_apk")
if ! grep -q 'libhermesvm\.so' <<< "$apk_contents"; then
  echo "Release APK does not contain the Hermes runtime." >&2
  exit 1
fi

version_name=$(sed -n "s/^package:.*versionName='\([^']*\)'.*/\1/p" <<< "$apk_badging")
if [[ -z "$version_name" ]]; then
  echo "Release APK does not expose a versionName." >&2
  exit 1
fi

artifact_sha256=$(sha256sum "$source_apk" | cut -d ' ' -f 1)
artifact_size=$(stat -c '%s' "$source_apk")
mkdir -p "$artifact_directory"
artifact_path="$artifact_directory/worldclock-v1-${version_name}-release.apk"
artifact_temp=$(mktemp "$artifact_directory/.worldclock-v1-${version_name}-release.XXXXXX.apk")
trap 'rm -f "${artifact_temp:-}"' EXIT
cp "$source_apk" "$artifact_temp"
if [[ "$(sha256sum "$artifact_temp" | cut -d ' ' -f 1)" != "$artifact_sha256" ]]; then
  echo "Published APK copy does not match the verified build output." >&2
  exit 1
fi
mv "$artifact_temp" "$artifact_path"
artifact_temp=
echo "RELEASE_ARTIFACT path=$artifact_path sha256=$artifact_sha256 size_bytes=$artifact_size"
