import appConfiguration from "../../app.json";
import packageManifest from "../../package.json";

describe("Android release configuration", () => {
  it("pins Hermes, API 29, and reusable clean/CNG release gates", () => {
    expect(appConfiguration.expo).not.toHaveProperty("jsEngine");
    expect(appConfiguration.expo).toMatchObject({
      android: { package: "se.trustfall.worldclock", versionCode: 1 },
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

  it("declares the Trustfall AB publisher identity", () => {
    expect(appConfiguration.expo.description).toContain("Trustfall AB");
    expect(appConfiguration.expo.extra).toMatchObject({
      publisher: "Trustfall AB",
      publisherUrl: "https://www.trustfall.se",
      homepage: "https://www.trustfall.se/worldclock",
    });
    expect(packageManifest.author).toBe("Trustfall AB (https://www.trustfall.se)");
    expect(packageManifest.homepage).toBe("https://www.trustfall.se/worldclock");
  });
});
