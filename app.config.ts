import { execSync } from 'node:child_process';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const git = (command: string): string =>
  execSync(`git ${command}`, { encoding: 'utf8' }).trim();

/**
 * Derives the app version from git instead of hard-coding it in app.json.
 *
 * - `version` (Android versionName) is `git describe`: "1.2.0" on a release
 *   tag, "1.2.0-5-ga1b2c3d" five commits later, with "-dirty" appended when
 *   the working tree has uncommitted changes. Only `master` produces formal
 *   release versions; any other checkout (topic branch, detached HEAD) gets
 *   a "-dev" marker so side-branch installs are never mistaken for them.
 * - `android.versionCode` must be a monotonically increasing integer for
 *   Android to accept an upgrade, so it is derived from the tag numbers plus
 *   the commit distance: M*1_000_000 + m*10_000 + p*100 + min(commits, 99).
 *
 * Both are pure functions of the git checkout, preserving the CNG
 * reproducibility guarantee. Release tags must look like "v1.2.0".
 */
export const deriveVersion = (
  describe: string,
  branch: string,
): { version: string; versionCode: number } => {
  const tagMatch = describe.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!tagMatch) {
    throw new Error(
      `Cannot derive a version: "git describe" returned "${describe}", ` +
        'which does not start with a vM.m.p release tag.'
    );
  }
  const [major, minor, patch] = tagMatch.slice(1).map(Number) as [
    number,
    number,
    number,
  ];
  const commitsSinceTag = Number(describe.match(/-(\d+)-g/)?.[1] ?? 0);

  return {
    version: branch === 'master' ? describe : `${describe}-dev`,
    versionCode:
      major * 1_000_000 +
      minor * 10_000 +
      patch * 100 +
      Math.min(commitsSinceTag, 99),
  };
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const { version, versionCode } = deriveVersion(
    git('describe --tags --always --dirty').replace(/^v/, ''),
    git('rev-parse --abbrev-ref HEAD'),
  );

  return {
    ...(config as ExpoConfig),
    version,
    android: {
      ...config.android,
      versionCode,
    },
    extra: {
      ...config.extra,
      gitCommit: git('rev-parse --short HEAD'),
    },
  };
};
