import { StyleSheet, View, type ColorValue } from "react-native";

import { analogHandAngles } from "./analogHandAngles";

interface AnalogClockFaceProps {
  readonly wallMinuteOfDay: number;
  readonly size: number;
  readonly rimColor: ColorValue;
  readonly hourHandColor: ColorValue;
  readonly minuteHandColor: ColorValue;
  readonly testID: string;
}

export function AnalogClockFace({
  wallMinuteOfDay,
  size,
  rimColor,
  hourHandColor,
  minuteHandColor,
  testID,
}: AnalogClockFaceProps) {
  const { hourDegrees, minuteDegrees } = analogHandAngles(wallMinuteOfDay);
  const hourWidth = Math.max(3, Math.round(size * 0.07));
  const minuteWidth = Math.max(2, Math.round(size * 0.04));
  const hourLength = Math.round(size * 0.32);
  const minuteLength = Math.round(size * 0.42);
  const tickWidth = Math.max(2, Math.round(size * 0.04));
  const tickLength = Math.max(5, Math.round(size * 0.1));
  const twelveTickLength = Math.round(tickLength * 1.35);
  const rimWidth = Math.max(2, Math.round(size * 0.045));
  const pivot = Math.max(4, Math.round(size * 0.08));

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      style={{ width: size, height: size }}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            borderWidth: rimWidth,
            borderColor: rimColor,
          },
        ]}
      />
      {([0, 90, 180, 270] as const).map((degrees) => (
        <View
          key={degrees}
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ rotate: `${degrees}deg` }] },
          ]}
        >
          <View
            style={{
              position: "absolute",
              left: (size - tickWidth) / 2,
              top: rimWidth + 2,
              width: tickWidth,
              height: degrees === 0 ? twelveTickLength : tickLength,
              borderRadius: tickWidth / 2,
              backgroundColor: rimColor,
            }}
          />
        </View>
      ))}
      <AnalogHand
        testID={`${testID}-hour-hand`}
        size={size}
        length={hourLength}
        width={hourWidth}
        degrees={hourDegrees}
        color={hourHandColor}
      />
      <AnalogHand
        testID={`${testID}-minute-hand`}
        size={size}
        length={minuteLength}
        width={minuteWidth}
        degrees={minuteDegrees}
        color={minuteHandColor}
      />
      <View
        style={{
          position: "absolute",
          left: (size - pivot) / 2,
          top: (size - pivot) / 2,
          width: pivot,
          height: pivot,
          borderRadius: pivot / 2,
          backgroundColor: hourHandColor,
        }}
      />
    </View>
  );
}

function AnalogHand({
  testID,
  size,
  length,
  width,
  degrees,
  color,
}: {
  readonly testID: string;
  readonly size: number;
  readonly length: number;
  readonly width: number;
  readonly degrees: number;
  readonly color: ColorValue;
}) {
  return (
    <View
      testID={testID}
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ rotate: `${degrees}deg` }] },
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: (size - width) / 2,
          top: size / 2 - length,
          width,
          height: length,
          borderRadius: width / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
