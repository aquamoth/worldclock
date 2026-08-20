import appConfiguration from "../../app.json";
import packageManifest from "../../package.json";
import { deriveVersion } from "../../app.config";
import { HOMEPAGE_URL, PRIVACY_POLICY_URL } from "../application/productLinks";

describe("Android release configuration", () => {
  it("pins Hermes, API 29, and reusable clean/CNG release gates", () => {
    expect(appConfiguration.expo).not.toHaveProperty("jsEngine");
    expect(appConfiguration.expo).toMatchObject({
      android: { package: "se.trustfall.worldclock" },
      plugins: expect.arrayContaining([
        [
          "expo-build-properties",
          { android: { minSdkVersion: 29 } },
        ],
      ]),
    });
    expect(packageManifest.scripts).toMatchObject({
      "release:cng-check": "bash scripts/release/verify-cng-reproducibility.sh",
      "release:clean-gate": "bash scripts/release/run-clean-android-gate.sh",
    });
    expect(packageManifest.devDependencies).toMatchObject({
      "expo-doctor": "1.20.2",
    });
  });

  it("leaves versioning to app.config.ts, which derives it from git", () => {
    expect(appConfiguration.expo).not.toHaveProperty("version");
    expect(appConfiguration.expo.android).not.toHaveProperty("versionCode");
  });

  it("derives formal versions on master and marks every other checkout as dev", () => {
    expect(deriveVersion("1.2.0", "master")).toEqual({
      version: "1.2.0",
      versionCode: 1_020_000,
    });
    expect(deriveVersion("1.2.0-5-ga1b2c3d", "master")).toEqual({
      version: "1.2.0-5-ga1b2c3d",
      versionCode: 1_020_005,
    });
    expect(
      deriveVersion("1.0.0-20-ge143712", "wayfinder/auto-revert-virtual-time"),
    ).toEqual({
      version: "1.0.0-20-ge143712-dev",
      versionCode: 1_000_020,
    });
    expect(deriveVersion("1.2.0-dirty", "master").version).toBe("1.2.0-dirty");
    // A detached HEAD (e.g. CI building a commit) is not a formal release.
    expect(deriveVersion("1.2.0", "HEAD").version).toBe("1.2.0-dev");
    expect(() => deriveVersion("e143712", "master")).toThrow(
      /does not start with a vM\.m\.p release tag/,
    );
  });

  it("declares the Trustfall AB publisher identity", () => {
    expect(appConfiguration.expo.description).toContain("Trustfall AB");
    expect(appConfiguration.expo.extra).toMatchObject({
      publisher: "Trustfall AB",
      publisherUrl: "https://www.trustfall.se",
      homepage: "https://aquamoth.github.io/worldclock/",
    });
    expect(packageManifest.author).toBe("Trustfall AB (https://www.trustfall.se)");
    expect(packageManifest.homepage).toBe("https://aquamoth.github.io/worldclock/");
    expect(packageManifest.license).toBe("Apache-2.0");
  });

  it("keeps the in-app product links aligned with the published homepage", () => {
    expect(HOMEPAGE_URL).toBe(appConfiguration.expo.extra.homepage);
    expect(PRIVACY_POLICY_URL).toBe(`${HOMEPAGE_URL}privacy/`);
  });
});
