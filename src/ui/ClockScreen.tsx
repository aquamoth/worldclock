import {
  BackHandler,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, type Ref } from "react";

import type {
  LiveClockScreenModel,
  SelectorResultModel,
} from "../application/liveClock";
import type { ClockCollectionProjection } from "../domain/clockCollection";
import { revealClock } from "./nativeClockReveal";

interface ClockScreenProps {
  readonly model: LiveClockScreenModel;
  readonly onOpenSelector: () => void;
  readonly onSearchSelector: (query: string) => void;
  readonly onCancelSelector: () => void;
  readonly onAddCity: (catalogId: string) => void;
}

const palette = {
  light: {
    background: "#F7F7F2",
    surface: "#FFFFFF",
    primary: "#171916",
    secondary: "#52584F",
    border: "#D7DBD2",
    accent: "#175F48",
    disabled: "#747A72",
  },
  dark: {
    background: "#11130F",
    surface: "#1D211B",
    primary: "#F4F6EF",
    secondary: "#B9C0B4",
    border: "#444B40",
    accent: "#79D8B4",
    disabled: "#92998E",
  },
} as const;

type Palette = (typeof palette)[keyof typeof palette];

const semanticTime = (clock: ClockCollectionProjection): string =>
  clock.period ? `${clock.time} ${clock.period}` : clock.time;

const semanticClockLabel = (clock: ClockCollectionProjection): string => {
  const parts = [clock.name];
  parts.push(semanticTime(clock), clock.effectiveOffset);
  if (clock.kind === "city" && clock.dayDifference !== undefined) {
    const magnitude = Number.parseInt(clock.dayDifference.replace("−", "-"), 10);
    parts.push(`${clock.dayDifference} ${Math.abs(magnitude) === 1 ? "day" : "days"}`);
  }
  return parts.join(", ");
};

function ClockRow({
  clock,
  colors,
  rowRef,
  onLayout,
}: {
  readonly clock: ClockCollectionProjection;
  readonly colors: Palette;
  readonly rowRef: Ref<View>;
  readonly onLayout: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View
      ref={rowRef}
      onLayout={onLayout}
      testID={`clock-${clock.id}`}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={semanticClockLabel(clock)}
      style={[
        styles.clockSurface,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.timeLine} accessibilityElementsHidden>
        <Text style={[styles.time, { color: colors.primary }]}>{clock.time}</Text>
        {clock.period ? (
          <Text style={[styles.period, { color: colors.secondary }]}>{clock.period}</Text>
        ) : null}
      </View>
      <View style={styles.clockDetails} accessibilityElementsHidden>
        <Text style={[styles.clockName, { color: colors.primary }]}>{clock.name}</Text>
        <View style={styles.metadataLine}>
          <Text style={[styles.offset, { color: colors.secondary }]}>
            {clock.effectiveOffset}
          </Text>
          {clock.kind === "city" && clock.dayDifference !== undefined ? (
            <Text style={[styles.dayDifference, { color: colors.primary }]}>
              {clock.dayDifference}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SelectorResult({
  result,
  isAdding,
  colors,
  onAddCity,
}: {
  readonly result: SelectorResultModel;
  readonly isAdding: boolean;
  readonly colors: Palette;
  readonly onAddCity: (catalogId: string) => void;
}) {
  const disabled = !result.available || isAdding;
  const label = result.available
    ? `Add ${result.city}, ${result.countryName}`
    : `${result.city}, ${result.countryName}, already added`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onAddCity(result.catalogId)}
      style={({ pressed }) => [
        styles.result,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.72 : disabled ? 0.58 : 1,
        },
      ]}
    >
      <View style={styles.resultLabels}>
        <Text style={[styles.resultCity, { color: colors.primary }]}>
          {result.city}
        </Text>
        <Text style={[styles.resultCountry, { color: colors.secondary }]}>
          {result.countryName}
        </Text>
      </View>
      <Text style={[styles.resultState, { color: colors.accent }]}>
        {result.available ? "Add" : "Added"}
      </Text>
    </Pressable>
  );
}

export function ClockScreen({
  model,
  onOpenSelector,
  onSearchSelector,
  onCancelSelector,
  onAddCity,
}: ClockScreenProps) {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const viewport = useWindowDimensions();
  const colors = palette[colorScheme];
  const scrollView = useRef<ScrollView>(null);
  const clockViews = useRef(new Map<string, View>());
  const clockPositions = useRef(new Map<string, number>());

  useEffect(() => {
    if (model.selector === undefined) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!model.selector?.isAdding) onCancelSelector();
        return true;
      },
    );
    return () => subscription.remove();
  }, [model.selector, onCancelSelector]);

  useEffect(() => {
    const request = model.clockRequest;
    if (request === undefined) return;
    const frame = requestAnimationFrame(() => {
      revealClock({
        scrollView: scrollView.current,
        clockView: clockViews.current.get(request.clockId) ?? null,
        position: clockPositions.current.get(request.clockId),
        scrollIntoView: request.scrollIntoView,
        focus: request.focus,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [model.clockRequest]);

  if (model.selector !== undefined) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View style={styles.selectorHeader}>
          <Text style={[styles.selectorTitle, { color: colors.primary }]}>Add timezone</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: model.selector.isAdding }}
            disabled={model.selector.isAdding}
            onPress={onCancelSelector}
            style={({ pressed }) => [
              styles.headerAction,
              { opacity: pressed ? 0.7 : model.selector?.isAdding ? 0.58 : 1 },
            ]}
          >
            <Text style={[styles.headerActionText, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Search timezones"
          value={model.selector.query}
          onChangeText={onSearchSelector}
          placeholder="City, country, or code"
          placeholderTextColor={colors.disabled}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.searchInput,
            {
              color: colors.primary,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        />
        <FlatList
          data={model.selector.results}
          keyExtractor={({ catalogId }) => catalogId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.results}
          renderItem={({ item }) => (
            <SelectorResult
              result={item}
              isAdding={model.selector?.isAdding ?? false}
              colors={colors}
              onAddCity={onAddCity}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        ref={scrollView}
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

          <View style={styles.clockCollection}>
            {model.clocks.map((clock) => (
              <ClockRow
                key={clock.id}
                clock={clock}
                colors={colors}
                rowRef={(view) => {
                  if (view === null) clockViews.current.delete(clock.id);
                  else clockViews.current.set(clock.id, view);
                }}
                onLayout={(event) => {
                  clockPositions.current.set(clock.id, event.nativeEvent.layout.y);
                }}
              />
            ))}
          </View>

          {model.emptyGuidance === undefined ? null : (
            <Text style={[styles.guidance, { color: colors.secondary }]}>
              {model.emptyGuidance}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add timezone"
            disabled={!model.isReady}
            onPress={onOpenSelector}
            style={({ pressed }) => [
              styles.addButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.72 : model.isReady ? 1 : 0.58,
              },
            ]}
          >
            <Text style={[styles.addButtonText, { color: colors.accent }]}>+ Add timezone</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  viewport: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 },
  content: { width: "100%", alignSelf: "center" },
  title: { fontSize: 30, fontWeight: "700", marginBottom: 24 },
  clockCollection: { gap: 12 },
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
  timeLine: { flexDirection: "row", alignItems: "baseline", flexShrink: 0 },
  time: {
    fontSize: 42,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    includeFontPadding: false,
  },
  period: { fontSize: 16, fontWeight: "600", marginLeft: 5 },
  clockDetails: { flex: 1, minWidth: 0 },
  clockName: { fontSize: 19, fontWeight: "600" },
  metadataLine: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  offset: { fontSize: 15, fontVariant: ["tabular-nums"] },
  dayDifference: { fontSize: 15, fontWeight: "700" },
  guidance: { fontSize: 16, lineHeight: 23, marginTop: 20 },
  addButton: {
    minHeight: 48,
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { fontSize: 16, fontWeight: "700" },
  selectorHeader: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorTitle: { fontSize: 26, fontWeight: "700" },
  headerAction: { minWidth: 48, minHeight: 48, justifyContent: "center", alignItems: "flex-end" },
  headerActionText: { fontSize: 16, fontWeight: "700" },
  searchInput: {
    minHeight: 48,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  results: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  result: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultLabels: { flex: 1, minWidth: 0 },
  resultCity: { fontSize: 17, fontWeight: "600" },
  resultCountry: { fontSize: 14, marginTop: 2 },
  resultState: { fontSize: 15, fontWeight: "700" },
});
