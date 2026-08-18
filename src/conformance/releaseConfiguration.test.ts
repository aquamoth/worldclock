import appConfiguration from "../../app.json";
import packageManifest from "../../package.json";

describe("Android release configuration", () => {
  it("pins Hermes, API 29, and reusable clean/CNG release gates", () => {
    expect(appConfiguration.expo).not.toHaveProperty("jsEngine");
    expect(appConfiguration.expo).toMatchObject({
      android: { package: "com.mattias.worldclock" },
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
  });
});
