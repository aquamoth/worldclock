import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { LiveClockScreenModel } from "../application/liveClock";

interface ClockScreenProps {
  readonly model: LiveClockScreenModel;
}

const palette = {
  light: {
    background: "#F7F7F2",
    surface: "#FFFFFF",
    primary: "#171916",
    secondary: "#52584F",
    border: "#D7DBD2",
  },
  dark: {
    background: "#11130F",
    surface: "#1D211B",
    primary: "#F4F6EF",
    secondary: "#B9C0B4",
    border: "#444B40",
  },
} as const;

export function ClockScreen({ model }: ClockScreenProps) {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const viewport = useWindowDimensions();
  const colors = palette[colorScheme];
  const local = model.clocks[0];
  const semanticTime = local.period
    ? `${local.time} ${local.period}`
    : local.time;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.viewport}
        alwaysBounceVertical={false}
      >
        <View
          testID="clock-content"
          style={[
            styles.content,
            {
              maxWidth: Math.min(viewport.width - 40, 680),
              minHeight: Math.max(viewport.height - 48, 0),
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.primary }]}>World Clock</Text>

          <View
            testID="local-clock"
            accessible
            accessibilityRole="summary"
            accessibilityLabel={`${local.name}, ${semanticTime}, ${local.effectiveOffset}`}
            style={[
              styles.clockSurface,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.timeLine} accessibilityElementsHidden>
              <Text style={[styles.time, { color: colors.primary }]}>{local.time}</Text>
              {local.period ? (
                <Text style={[styles.period, { color: colors.secondary }]}>{local.period}</Text>
              ) : null}
            </View>
            <View style={styles.clockDetails} accessibilityElementsHidden>
              <Text style={[styles.clockName, { color: colors.primary }]}>{local.name}</Text>
              <Text style={[styles.offset, { color: colors.secondary }]}>{local.effectiveOffset}</Text>
            </View>
          </View>

          <Text style={[styles.guidance, { color: colors.secondary }]}>{model.emptyGuidance}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  viewport: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  content: {
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 24,
  },
  clockSurface: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  timeLine: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0,
  },
  time: {
    fontSize: 42,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    includeFontPadding: false,
  },
  period: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 5,
  },
  clockDetails: {
    flex: 1,
    minWidth: 0,
  },
  clockName: {
    fontSize: 19,
    fontWeight: "600",
  },
  offset: {
    fontSize: 15,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  guidance: {
    fontSize: 16,
    lineHeight: 23,
    marginTop: 20,
  },
});
