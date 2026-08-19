import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  FlatList,
  Modal,
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from "react";

import type {
  LiveClockScreenModel,
  SelectorResultModel,
} from "../application/liveClock";
import type { ClockCollectionProjection } from "../domain/clockCollection";
import { formatEffectiveOffset } from "../domain/clock";
import { AnalogClockFace } from "./AnalogClockFace";
import { revealClock } from "./nativeClockReveal";
import {
  resolvePresentation,
  resolveSemanticTheme,
  type SemanticTheme,
} from "./presentation";
import {
  scrubStepsFromTravel,
  type ScrubDirection,
} from "./scrubGesture";

interface ClockScreenProps {
  readonly model: LiveClockScreenModel;
  readonly onOpenSelector: () => void;
  readonly onSearchSelector: (query: string) => void;
  readonly onCancelSelector: () => void;
  readonly onAddCity: (catalogId: string) => void;
  readonly onOpenCustomCreator: () => void;
  readonly onOpenCustomEditor: (selectionId: string) => void;
  readonly onUpdateCustomName: (name: string) => void;
  readonly onSelectCustomOffset: (offsetMinutes: number) => void;
  readonly onCancelCustomForm: () => void;
  readonly onSaveCustom: () => void;
  readonly onOpenDelete: (selectionId: string) => void;
  readonly onCancelDelete: () => void;
  readonly onConfirmDelete: () => void;
  readonly onRetryPersistence: () => void;
  readonly onBeginStatusScrub: () => void;
  readonly onUpdateStatusScrub: (translationX: number) => void;
  readonly onEndStatusScrub: () => void;
  readonly onCancelStatusScrub: () => void;
  readonly onAdjustStatus: (direction: "earlier" | "later") => void;
  readonly onBeginRowScrub: (clockId: string) => void;
  readonly onUpdateRowScrub: (translationX: number) => void;
  readonly onEndRowScrub: () => void;
  readonly onCancelRowScrub: () => void;
  readonly onAdjustRow: (
    clockId: string,
    direction: "earlier" | "later",
  ) => void;
  readonly onFocusClock: (clockId: string | undefined) => void;
  readonly onBackToLive: () => void;
  readonly design?: DesignVariant;
  readonly onSelectDesign?: (design: DesignVariant) => void;
  readonly clockFace?: ClockFace;
  readonly onSelectClockFace?: (clockFace: ClockFace) => void;
  readonly scrubDirection?: ScrubDirection;
  readonly onSelectScrubDirection?: (direction: ScrubDirection) => void;
  readonly onOpenPrivacyPolicy?: () => void;
}

export const scrubDirections: readonly {
  readonly key: ScrubDirection;
  readonly label: string;
}[] = [
  { key: "rightEarlier", label: "Swipe right goes earlier" },
  { key: "rightLater", label: "Swipe right goes later" },
];

export type DesignVariant = "airy" | "grouped" | "tiles";

export const designVariants: readonly {
  readonly key: DesignVariant;
  readonly label: string;
}[] = [
  { key: "grouped", label: "Tonal groups" },
  { key: "airy", label: "Airy type" },
  { key: "tiles", label: "Tile grid" },
];

export type ClockFace = "digital" | "analog";

export const clockFaces: readonly {
  readonly key: ClockFace;
  readonly label: string;
}[] = [
  { key: "digital", label: "Digital" },
  { key: "analog", label: "Analog" },
];

const semanticTime = (clock: ClockCollectionProjection): string =>
  clock.period ? `${clock.time} ${clock.period}` : clock.time;

const semanticClockDetails = (clock: ClockCollectionProjection): string => {
  const parts = [
    clock.name,
    clock.kind === "local" ? "Local clock" : "Selected clock",
  ];
  parts.push(clock.effectiveOffset);
  if (clock.kind !== "local" && clock.dayDifference !== undefined) {
    const magnitude = Number.parseInt(clock.dayDifference.replace("−", "-"), 10);
    parts.push(`${clock.dayDifference} ${Math.abs(magnitude) === 1 ? "day" : "days"}`);
  }
  return parts.join(", ");
};

const useChevronPulse = (): Animated.Value => {
  const [reduceMotion, setReduceMotion] = useState(true);
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(0.55);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.82,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.42,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);
  return pulse;
};

function useScrubPan({
  testId,
  scrubDirection,
  scrollGesture,
  onHorizontalLockChange,
  onBegin,
  onUpdate,
  onEnd,
  onCancel,
}: {
  readonly testId: string;
  readonly scrubDirection: ScrubDirection;
  readonly scrollGesture: ReturnType<(typeof Gesture)["Native"]>;
  readonly onHorizontalLockChange: (locked: boolean) => void;
  readonly onBegin: () => void;
  readonly onUpdate: (signedStepsFromGestureStart: number) => void;
  readonly onEnd: () => void;
  readonly onCancel: () => void;
}) {
  const gestureAxis = useRef<"horizontal" | "vertical" | null>(null);
  return useMemo(() => {
    const chooseAxis = (translationX: number, translationY: number) => {
      if (gestureAxis.current !== null) return gestureAxis.current;
      if (Math.max(Math.abs(translationX), Math.abs(translationY)) < 8) {
        return null;
      }
      gestureAxis.current =
        Math.abs(translationX) > Math.abs(translationY)
          ? "horizontal"
          : "vertical";
      if (gestureAxis.current === "horizontal") {
        onHorizontalLockChange(true);
        onBegin();
      }
      return gestureAxis.current;
    };

    return Gesture.Pan()
        .withTestId(testId)
        .simultaneousWithExternalGesture(scrollGesture)
        .runOnJS(true)
        .onStart(({ translationX, translationY }) => {
          if (chooseAxis(translationX, translationY) === "horizontal") {
            onUpdate(scrubStepsFromTravel(translationX, scrubDirection));
          }
        })
        .onUpdate(({ translationX, translationY }) => {
          if (chooseAxis(translationX, translationY) === "horizontal") {
            onUpdate(scrubStepsFromTravel(translationX, scrubDirection));
          }
        })
        .onEnd(() => {
          if (gestureAxis.current === "horizontal") onEnd();
        })
        .onFinalize((_event, succeeded) => {
          if (gestureAxis.current === "horizontal" && !succeeded) onCancel();
          if (gestureAxis.current === "horizontal") {
            onHorizontalLockChange(false);
          }
          gestureAxis.current = null;
        });
  },
    [
      onBegin,
      onCancel,
      onEnd,
      onHorizontalLockChange,
      onUpdate,
      scrollGesture,
      scrubDirection,
      testId,
    ],
  );
}

function AdjustableSurface({
  nativeId,
  accessibilityLabel,
  accessibilityHint,
  accessibilityValue,
  scrubDirection,
  targetRef,
  style,
  children,
  onAdjust,
  onFocus,
}: {
  readonly nativeId?: string;
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  readonly accessibilityValue: string;
  readonly scrubDirection: ScrubDirection;
  readonly targetRef?: Ref<View>;
  readonly style: ComponentProps<typeof View>["style"];
  readonly children: ReactNode;
  readonly onAdjust: (direction: "earlier" | "later") => void;
  readonly onFocus?: () => void;
}) {
  const rightward = scrubDirection === "rightEarlier" ? "earlier" : "later";
  const leftward = scrubDirection === "rightEarlier" ? "later" : "earlier";
  const hardwareKeyProps = {
    onKeyDown: (event: { readonly nativeEvent: { readonly key?: string } }) => {
      if (event.nativeEvent.key === "ArrowRight") onAdjust(rightward);
      if (event.nativeEvent.key === "ArrowLeft") onAdjust(leftward);
    },
  };

  return (
    <View
      {...hardwareKeyProps}
      nativeID={nativeId}
      ref={targetRef}
      accessible
      focusable
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityValue={{ text: accessibilityValue }}
      accessibilityActions={[
        { name: "decrement", label: "Earlier" },
        { name: "increment", label: "Later" },
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "decrement") onAdjust("earlier");
        if (nativeEvent.actionName === "increment") onAdjust("later");
      }}
      onFocus={onFocus}
      style={style}
    >
      {children}
    </View>
  );
}

function analogFaceSize(
  design: DesignVariant,
  isHero: boolean,
  stackDenseContent: boolean,
): number {
  if (isHero) return stackDenseContent ? 72 : 96;
  if (stackDenseContent) return 48;
  return design === "tiles" ? 52 : 56;
}

function ClockRow({
  clock,
  model,
  colors,
  design,
  clockFace,
  isHero,
  scrubDirection,
  stackDenseContent,
  chevronPulse,
  rowRef,
  onLayout,
  onEdit,
  onDelete,
  scrollGesture,
  onHorizontalLockChange,
  onBeginScrub,
  onUpdateScrub,
  onEndScrub,
  onCancelScrub,
  onAdjust,
  onFocus,
}: {
  readonly clock: ClockCollectionProjection;
  readonly model: LiveClockScreenModel;
  readonly colors: SemanticTheme;
  readonly design: DesignVariant;
  readonly clockFace: ClockFace;
  readonly isHero: boolean;
  readonly scrubDirection: ScrubDirection;
  readonly stackDenseContent: boolean;
  readonly chevronPulse: Animated.Value;
  readonly rowRef: Ref<View>;
  readonly onLayout: (event: LayoutChangeEvent) => void;
  readonly onEdit: (selectionId: string) => void;
  readonly onDelete: (selectionId: string) => void;
  readonly scrollGesture: ReturnType<(typeof Gesture)["Native"]>;
  readonly onHorizontalLockChange: (locked: boolean) => void;
  readonly onBeginScrub: (clockId: string) => void;
  readonly onUpdateScrub: (signedStepsFromGestureStart: number) => void;
  readonly onEndScrub: () => void;
  readonly onCancelScrub: () => void;
  readonly onAdjust: (
    clockId: string,
    direction: "earlier" | "later",
  ) => void;
  readonly onFocus: (clockId: string) => void;
}) {
  const scrubValue =
    model.mode === "live"
      ? "Live time"
      : `${model.status.offsetAccessibilityLabel}, ${semanticTime(clock)}`;
  const handleBeginScrub = useCallback(
    () => onBeginScrub(clock.id),
    [clock.id, onBeginScrub],
  );
  const handleAdjust = useCallback(
    (direction: "earlier" | "later") => onAdjust(clock.id, direction),
    [clock.id, onAdjust],
  );
  const panGesture = useScrubPan({
    testId: `row-scrub-${clock.id}`,
    scrubDirection,
    scrollGesture,
    onHorizontalLockChange,
    onBegin: handleBeginScrub,
    onUpdate: onUpdateScrub,
    onEnd: onEndScrub,
    onCancel: onCancelScrub,
  });
  const stackedContent = stackDenseContent || isHero || design === "tiles";
  const analogFace = clockFace === "analog";
  const analogSize = analogFaceSize(design, isHero, stackDenseContent);
  const analogInk =
    isHero && design === "airy" ? colors.accent : colors.primary;
  const analogMinuteInk =
    isHero && design === "airy" ? colors.primary : colors.accent;
  return (
    <GestureDetector gesture={panGesture}>
    <View
      onLayout={onLayout}
      testID={`clock-${clock.id}`}
      style={[
        styles.clockSurface,
        design === "airy" && styles.airyRowSurface,
        design === "tiles" && !isHero && [
          styles.tileSurface,
          { backgroundColor: colors.surface },
          stackDenseContent && styles.tileSurfaceDense,
        ],
        isHero && styles.heroSurface,
        isHero && design === "grouped" && [
          styles.groupedHeroSurface,
          { backgroundColor: colors.localSurface },
        ],
        isHero && design === "tiles" && styles.tilesHeroSurface,
        stackDenseContent && styles.clockSurfaceDense,
      ]}
    >
      <View
        testID={`clock-summary-${clock.id}`}
        style={[
          styles.clockSummary,
          stackedContent && styles.clockSummaryStacked,
          isHero && design === "tiles" && styles.clockSummaryCentered,
        ]}
      >
        <AdjustableSurface
          nativeId={`clock-time-${clock.id}`}
          accessibilityLabel={semanticTime(clock)}
          accessibilityHint={`Adjust ${clock.name} time`}
          accessibilityValue={scrubValue}
          scrubDirection={scrubDirection}
          targetRef={rowRef}
          style={[
            styles.rowTimeAdjustable,
            stackDenseContent && styles.rowTimeAdjustableDense,
          ]}
          onAdjust={handleAdjust}
          onFocus={() => onFocus(clock.id)}
        >
          <View
            testID={`clock-time-line-${clock.id}`}
            style={[
              styles.timeLine,
              isHero && design === "tiles" && styles.timeLineCentered,
              stackDenseContent && styles.timeLineDense,
            ]}
            accessibilityElementsHidden
          >
            <Animated.Text
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.rowChevron,
                stackDenseContent && styles.rowChevronDenseLeft,
                { color: colors.accent, opacity: chevronPulse },
              ]}
            >
              ‹
            </Animated.Text>
            <View
              style={[
                styles.timeValue,
                (stackDenseContent || analogFace) && styles.timeValueDense,
              ]}
            >
              {analogFace ? (
                <AnalogClockFace
                  testID={`clock-analog-${clock.id}`}
                  wallMinuteOfDay={clock.wallMinuteOfDay}
                  size={analogSize}
                  rimColor={analogInk}
                  hourHandColor={analogInk}
                  minuteHandColor={analogMinuteInk}
                />
              ) : null}
              <Text
                testID={`clock-time-${clock.id}`}
                style={[
                  styles.time,
                  analogFace
                    ? styles.timeAnalogCaption
                    : [
                        design === "airy" && styles.timeAiry,
                        design === "tiles" && styles.timeTile,
                        isHero && styles.timeHero,
                        stackDenseContent && styles.timeDense,
                      ],
                  {
                    color:
                      isHero && design === "airy"
                        ? colors.accent
                        : colors.primary,
                  },
                ]}
              >
                {clock.time}
              </Text>
              {clock.period ? (
                <Text
                  style={[
                    styles.period,
                    analogFace && styles.periodAnalogCaption,
                    { color: colors.secondary },
                  ]}
                >
                  {clock.period}
                </Text>
              ) : null}
            </View>
            <Animated.Text
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.rowChevron,
                stackDenseContent && styles.rowChevronDenseRight,
                { color: colors.accent, opacity: chevronPulse },
              ]}
            >
              ›
            </Animated.Text>
          </View>
        </AdjustableSurface>
        <View
          accessible
          accessibilityRole="summary"
          nativeID={`clock-details-${clock.id}`}
          accessibilityLabel={semanticClockDetails(clock)}
          onFocus={() => onFocus(clock.id)}
          style={styles.clockDetails}
        >
          <View accessibilityElementsHidden>
            <Text style={[styles.clockName, { color: colors.primary }]}>
              {clock.name}
            </Text>
            <View style={styles.metadataLine}>
              <Text style={[styles.offset, { color: colors.secondary }]}>
                {clock.effectiveOffset}
              </Text>
              {clock.kind !== "local" && clock.dayDifference !== undefined ? (
                <Text style={[styles.dayDifference, { color: colors.primary }]}>
                  {clock.dayDifference}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
      {clock.kind === "local" ? null : (
        <View
          testID={`clock-actions-${clock.id}`}
          style={[
            styles.rowActions,
            design === "tiles" && styles.rowActionsTiles,
          ]}
        >
          {clock.kind === "custom" ? (
            <Pressable
              accessibilityRole="button"
              nativeID={`clock-edit-${clock.id}`}
              accessibilityLabel={`Edit ${clock.name}`}
              onFocus={() => onFocus(clock.id)}
              onPress={() => onEdit(clock.id)}
              style={({ pressed }) => [styles.rowAction, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.rowActionText, { color: colors.accent }]}>Edit</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            nativeID={`clock-delete-${clock.id}`}
            accessibilityLabel={`Delete ${clock.name}`}
            onFocus={() => onFocus(clock.id)}
            onPress={() => onDelete(clock.id)}
            style={({ pressed }) => [styles.rowAction, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text importantForAccessibility="no-hide-descendants" style={[styles.deleteGlyph, { color: colors.accent }]}>×</Text>
          </Pressable>
        </View>
      )}
    </View>
    </GestureDetector>
  );
}

function SelectorResult({
  result,
  isAdding,
  colors,
  design,
  isFirst,
  isLast,
  onAddCity,
}: {
  readonly result: SelectorResultModel;
  readonly isAdding: boolean;
  readonly colors: SemanticTheme;
  readonly design: DesignVariant;
  readonly isFirst: boolean;
  readonly isLast: boolean;
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
        design === "grouped" && isFirst && styles.resultGroupedFirst,
        design === "grouped" && isLast && styles.resultGroupedLast,
        design === "airy" && styles.resultAiry,
        design === "tiles" && styles.resultTile,
        {
          backgroundColor:
            design === "airy" ? "transparent" : colors.surface,
          opacity: pressed ? 0.72 : 1,
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

function PersistenceError({
  error,
  colors,
  stackDenseContent,
  onRetry,
}: {
  readonly error: NonNullable<LiveClockScreenModel["persistenceError"]>;
  readonly colors: SemanticTheme;
  readonly stackDenseContent: boolean;
  readonly onRetry: () => void;
}) {
  return (
    <View
      testID="persistence-error"
      style={[
        styles.errorBanner,
        stackDenseContent && styles.errorBannerStacked,
        { backgroundColor: colors.surface },
      ]}
    >
      <Text
        accessible
        accessibilityLabel={error.message}
        style={[styles.errorMessage, { color: colors.primary }]}
      >
        {error.message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={error.retryLabel}
        onPress={onRetry}
        style={styles.retryAction}
      >
        <Text style={[styles.headerActionText, { color: colors.accent }]}>Retry</Text>
      </Pressable>
    </View>
  );
}

function StatusSurface({
  model,
  colors,
  scrubDirection,
  stackDenseContent,
  chevronPulse,
  onBeginScrub,
  onUpdateScrub,
  onEndScrub,
  onCancelScrub,
  onAdjust,
  onBack,
  scrollGesture,
  onHorizontalLockChange,
  onFocus,
}: {
  readonly model: LiveClockScreenModel;
  readonly colors: SemanticTheme;
  readonly scrubDirection: ScrubDirection;
  readonly stackDenseContent: boolean;
  readonly chevronPulse: Animated.Value;
  readonly onBeginScrub: () => void;
  readonly onUpdateScrub: (translationX: number) => void;
  readonly onEndScrub: () => void;
  readonly onCancelScrub: () => void;
  readonly onAdjust: (direction: "earlier" | "later") => void;
  readonly onBack: () => void;
  readonly scrollGesture: ReturnType<(typeof Gesture)["Native"]>;
  readonly onHorizontalLockChange: (locked: boolean) => void;
  readonly onFocus: () => void;
}) {
  const status = model.status;
  const panGesture = useScrubPan({
    testId: "status-scrub-gesture",
    scrubDirection,
    scrollGesture,
    onHorizontalLockChange,
    onBegin: onBeginScrub,
    onUpdate: onUpdateScrub,
    onEnd: onEndScrub,
    onCancel: onCancelScrub,
  });
  const virtual = model.mode === "virtual";
  const statusPrimary = virtual ? colors.background : colors.primary;
  const statusAccent = virtual ? colors.background : colors.accent;

  return (
    <GestureDetector gesture={panGesture}>
    <View
      style={[
        styles.statusSurface,
        stackDenseContent && styles.statusSurfaceDense,
        { backgroundColor: virtual ? colors.accent : colors.surface },
      ]}
    >
      <AdjustableSurface
        accessibilityLabel="Adjust comparison time"
        accessibilityValue={status.accessibilityValue}
        scrubDirection={scrubDirection}
        style={styles.statusAdjustable}
        onAdjust={onAdjust}
        onFocus={onFocus}
      >
        <View
          testID="status-text"
          style={[styles.statusText, stackDenseContent && styles.statusTextStacked]}
          accessibilityElementsHidden
        >
          <Text style={[styles.statusLabel, { color: statusPrimary }]}>
            {status.label}
          </Text>
          <View style={styles.statusOffsetLine}>
            <Animated.Text
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.chevron,
                { color: statusAccent, opacity: chevronPulse },
              ]}
            >
              ‹
            </Animated.Text>
            <Text style={[styles.statusOffset, { color: statusPrimary }]}>
              {status.offset}
            </Text>
            <Animated.Text
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.chevron,
                { color: statusAccent, opacity: chevronPulse },
              ]}
            >
              ›
            </Animated.Text>
          </View>
        </View>
      </AdjustableSurface>
      {model.mode === "virtual" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityHint="Return to current time"
          onPress={onBack}
          style={styles.statusBack}
        >
          <Text
            importantForAccessibility="no-hide-descendants"
            style={[styles.backGlyph, { color: statusAccent }]}
          >
            ↶
          </Text>
        </Pressable>
      ) : (
        <View importantForAccessibility="no-hide-descendants" style={styles.statusActionSpacer} />
      )}
    </View>
    </GestureDetector>
  );
}

export function ClockScreen({
  model,
  onOpenSelector,
  onSearchSelector,
  onCancelSelector,
  onAddCity,
  onOpenCustomCreator,
  onOpenCustomEditor,
  onUpdateCustomName,
  onSelectCustomOffset,
  onCancelCustomForm,
  onSaveCustom,
  onOpenDelete,
  onCancelDelete,
  onConfirmDelete,
  onRetryPersistence,
  onBeginStatusScrub,
  onUpdateStatusScrub,
  onEndStatusScrub,
  onCancelStatusScrub,
  onAdjustStatus,
  onBeginRowScrub,
  onUpdateRowScrub,
  onEndRowScrub,
  onCancelRowScrub,
  onAdjustRow,
  onFocusClock,
  onBackToLive,
  design = "grouped",
  onSelectDesign,
  clockFace = "digital",
  onSelectClockFace,
  scrubDirection = "rightEarlier",
  onSelectScrubDirection,
  onOpenPrivacyPolicy,
}: ClockScreenProps) {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const viewport = useWindowDimensions();
  const colors = resolveSemanticTheme(colorScheme);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const presentation = resolvePresentation(viewport);
  const scrollView = useRef<ScrollView>(null);
  const clockViews = useRef(new Map<string, View>());
  const clockPositions = useRef(new Map<string, number>());
  const addTimezoneView = useRef<View>(null);
  const selectorSearchView = useRef<TextInput>(null);
  const customNameView = useRef<TextInput>(null);
  const deleteCancelView = useRef<View>(null);
  const addTimezonePosition = useRef<number | undefined>(undefined);
  const scrollGesture = useMemo(() => Gesture.Native(), []);
  const chevronPulse = useChevronPulse();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const handleHorizontalLockChange = useCallback((locked: boolean) => {
    setScrollEnabled(!locked);
  }, []);

  useEffect(() => {
    if (
      model.selector === undefined &&
      model.customForm === undefined &&
      model.mode !== "virtual"
    ) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (model.customForm !== undefined) {
          if (!model.customForm.isSaving) onCancelCustomForm();
        } else if (!model.selector?.isAdding) {
          if (model.selector !== undefined) onCancelSelector();
          else onBackToLive();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [
    model.customForm,
    model.mode,
    model.selector,
    onBackToLive,
    onCancelCustomForm,
    onCancelSelector,
  ]);

  useEffect(() => {
    const request = model.focusRequest;
    if (request === undefined) return;
    const targetsAddTimezone = "addTimezone" in request;
    const overlayTarget =
      "overlay" in request
        ? request.overlay === "selector-search"
          ? selectorSearchView.current
          : request.overlay === "custom-name"
            ? customNameView.current
            : deleteCancelView.current
        : null;
    const frame = requestAnimationFrame(() => {
      revealClock({
        scrollView: "overlay" in request ? null : scrollView.current,
        clockView:
          overlayTarget ??
          (targetsAddTimezone
            ? addTimezoneView.current
            : "clockId" in request
              ? (clockViews.current.get(request.clockId) ?? null)
              : null),
        position: targetsAddTimezone
          ? addTimezonePosition.current
          : "clockId" in request
            ? clockPositions.current.get(request.clockId)
            : undefined,
        scrollIntoView: request.scrollIntoView,
        focus: request.focus,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [model.focusRequest]);

  useEffect(() => {
    if (model.announcement === undefined) return;
    AccessibilityInfo.announceForAccessibility(model.announcement.message);
  }, [model.announcement?.message, model.announcement?.sequence]);

  if (model.customForm !== undefined) {
    const form = model.customForm;
    const optionIndex = form.offsetOptions.indexOf(form.offsetMinutes);
    const previousOffset = optionIndex > 0 ? form.offsetOptions[optionIndex - 1] : undefined;
    const nextOffset = optionIndex >= 0 ? form.offsetOptions[optionIndex + 1] : undefined;
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          testID="custom-form-header"
          style={[
            styles.selectorHeader,
            presentation.stackDenseContent && styles.selectorHeaderStacked,
            { paddingHorizontal: presentation.horizontalPadding },
          ]}
        >
          <Text style={[styles.selectorTitle, { color: colors.primary }]}>
            {form.mode === "create" ? "Create custom timezone" : "Edit custom timezone"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel custom timezone"
            accessibilityState={{ disabled: form.isSaving }}
            disabled={form.isSaving}
            onPress={onCancelCustomForm}
            style={styles.headerAction}
          >
            <Text style={[styles.headerActionText, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
        </View>
        <ScrollView
          testID="custom-form-scroll"
          horizontal={false}
          style={styles.overlayScroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.formScrollContent}
        >
          {model.persistenceError === undefined ? null : (
            <PersistenceError
              error={model.persistenceError}
              colors={colors}
              stackDenseContent={presentation.stackDenseContent}
              onRetry={onRetryPersistence}
            />
          )}
        <View style={[styles.form, { paddingHorizontal: presentation.horizontalPadding }]}>
          <Text style={[styles.fieldLabel, { color: colors.primary }]}>Name</Text>
          <TextInput
            ref={customNameView}
            accessibilityLabel="Custom timezone name"
            value={form.name}
            onChangeText={onUpdateCustomName}
            multiline={false}
            editable={!form.isSaving}
            autoCorrect={false}
            style={[styles.searchInput, styles.formInput, { color: colors.primary, backgroundColor: colors.surface, borderColor: colors.border }]}
          />
          {form.nameError === undefined ? null : (
            <Text accessible accessibilityLabel={form.nameError} style={[styles.error, { color: colors.primary }]}>{form.nameError}</Text>
          )}
          <Text style={[styles.fieldLabel, { color: colors.primary }]}>UTC offset</Text>
          <View
            testID="offset-picker"
            style={[
              styles.offsetPicker,
              presentation.stackDenseContent && styles.offsetPickerStacked,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease offset"
              accessibilityState={{ disabled: previousOffset === undefined || form.isSaving }}
              disabled={previousOffset === undefined || form.isSaving}
              onPress={() => previousOffset !== undefined && onSelectCustomOffset(previousOffset)}
              style={styles.offsetAction}
            ><Text style={[styles.offsetActionText, { color: colors.accent }]}>−15 min</Text></Pressable>
            <Text accessibilityLabel={`Selected offset ${formatEffectiveOffset(form.offsetMinutes)}`} style={[styles.selectedOffset, { color: colors.primary }]}>{formatEffectiveOffset(form.offsetMinutes)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase offset"
              accessibilityState={{ disabled: nextOffset === undefined || form.isSaving }}
              disabled={nextOffset === undefined || form.isSaving}
              onPress={() => nextOffset !== undefined && onSelectCustomOffset(nextOffset)}
              style={styles.offsetAction}
            ><Text style={[styles.offsetActionText, { color: colors.accent }]}>+15 min</Text></Pressable>
          </View>
          {form.offsetError === undefined ? null : (
            <Text accessible accessibilityLabel={form.offsetError} style={[styles.error, { color: colors.primary }]}>{form.offsetError}</Text>
          )}
          {form.duplicateError === undefined ? null : (
            <Text accessible accessibilityLabel={form.duplicateError} style={[styles.error, { color: colors.primary }]}>{form.duplicateError}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save custom timezone"
            accessibilityState={{ disabled: form.isSaving }}
            disabled={form.isSaving}
            onPress={onSaveCustom}
            style={[styles.addButton, { backgroundColor: colors.accent }]}
          ><Text style={[styles.addButtonText, { color: colors.background }]}>Save</Text></Pressable>
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (model.selector !== undefined) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View
          testID="selector-header"
          style={[
            styles.selectorHeader,
            presentation.stackDenseContent && styles.selectorHeaderStacked,
            { paddingHorizontal: presentation.horizontalPadding },
          ]}
        >
          <Text style={[styles.selectorTitle, { color: colors.primary }]}>Add timezone</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel timezone selection"
            accessibilityState={{ disabled: model.selector.isAdding }}
            disabled={model.selector.isAdding}
            onPress={onCancelSelector}
            style={({ pressed }) => [
              styles.headerAction,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.headerActionText, { color: colors.accent }]}>Cancel</Text>
          </Pressable>
        </View>
        {model.persistenceError === undefined ? null : (
          <PersistenceError
            error={model.persistenceError}
            colors={colors}
            stackDenseContent={presentation.stackDenseContent}
            onRetry={onRetryPersistence}
          />
        )}
        <TextInput
          ref={selectorSearchView}
          accessibilityLabel="Search timezones"
          value={model.selector.query}
          onChangeText={onSearchSelector}
          placeholder="City, country, or code"
          placeholderTextColor={colors.disabled}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.searchInput,
            { marginHorizontal: presentation.horizontalPadding },
            {
              color: colors.primary,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create custom timezone"
          disabled={model.selector.isAdding}
          onPress={onOpenCustomCreator}
          style={[
            styles.customPath,
            { marginHorizontal: presentation.horizontalPadding },
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        ><Text style={[styles.addButtonText, { color: colors.accent }]}>Create custom timezone</Text></Pressable>
        <FlatList
          key={design}
          testID="selector-results"
          horizontal={false}
          numColumns={design === "tiles" ? 2 : 1}
          {...(design === "tiles"
            ? { columnWrapperStyle: styles.resultsColumns }
            : {})}
          ItemSeparatorComponent={
            design === "grouped"
              ? () => (
                  <View
                    style={[
                      styles.groupedDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )
              : undefined
          }
          style={styles.overlayScroll}
          data={model.selector.results}
          keyExtractor={({ catalogId }) => catalogId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.results,
            design === "grouped" && styles.resultsGrouped,
            design === "tiles" && styles.resultsTiles,
            { paddingHorizontal: presentation.horizontalPadding },
          ]}
          renderItem={({ item, index }) => (
            <SelectorResult
              result={item}
              isAdding={model.selector?.isAdding ?? false}
              colors={colors}
              design={design}
              isFirst={index === 0}
              isLast={index === (model.selector?.results.length ?? 0) - 1}
              onAddCity={onAddCity}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      testID="clock-screen"
      accessibilityLabel={
        model.mode === "virtual" ? "Virtual time screen" : "Live time screen"
      }
      style={[
        styles.safeArea,
        {
          backgroundColor:
            model.mode === "virtual"
              ? colors.virtualBackground
              : colors.background,
        },
      ]}
    >
      <GestureDetector gesture={scrollGesture}>
        <ScrollView
          ref={scrollView}
          testID="clock-scroll"
          horizontal={false}
          scrollEnabled={scrollEnabled}
          contentContainerStyle={[
            styles.viewport,
            { paddingHorizontal: presentation.horizontalPadding },
          ]}
          alwaysBounceVertical={false}
          stickyHeaderIndices={[0]}
        >
        <StatusSurface
          model={model}
          colors={colors}
          scrubDirection={scrubDirection}
          stackDenseContent={presentation.stackDenseContent}
          chevronPulse={chevronPulse}
          onBeginScrub={onBeginStatusScrub}
          onUpdateScrub={onUpdateStatusScrub}
          onEndScrub={onEndStatusScrub}
          onCancelScrub={onCancelStatusScrub}
          onAdjust={onAdjustStatus}
          onFocus={() => onFocusClock(undefined)}
          onBack={onBackToLive}
          scrollGesture={scrollGesture}
          onHorizontalLockChange={handleHorizontalLockChange}
        />
        <View
          testID="clock-content"
          style={[
            styles.content,
            { maxWidth: presentation.contentMaxWidth },
          ]}
        >
          <View style={styles.titleRow}>
            {design === "grouped" ? (
              <Text style={[styles.title, { color: colors.primary }]}>World Clock</Text>
            ) : (
              <View />
            )}
            {onSelectDesign === undefined &&
            onSelectClockFace === undefined &&
            onSelectScrubDirection === undefined &&
            onOpenPrivacyPolicy === undefined ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                onPress={() => setSettingsVisible(true)}
                style={({ pressed }) => [
                  styles.headerAction,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text
                  importantForAccessibility="no-hide-descendants"
                  style={[styles.settingsGlyph, { color: colors.secondary }]}
                >
                  ⚙
                </Text>
              </Pressable>
            )}
          </View>

          {model.persistenceError === undefined ||
          model.deleteConfirmation !== undefined ? null : (
            <PersistenceError
              error={model.persistenceError}
              colors={colors}
              stackDenseContent={presentation.stackDenseContent}
              onRetry={onRetryPersistence}
            />
          )}

          {(() => {
            const renderRow = (
              clock: ClockCollectionProjection,
              isHero: boolean,
            ) => (
              <ClockRow
                key={clock.id}
                clock={clock}
                model={model}
                colors={colors}
                design={design}
                clockFace={clockFace}
                isHero={isHero}
                scrubDirection={scrubDirection}
                stackDenseContent={presentation.stackDenseContent}
                chevronPulse={chevronPulse}
                rowRef={(view) => {
                  if (view === null) clockViews.current.delete(clock.id);
                  else clockViews.current.set(clock.id, view);
                }}
                onLayout={(event) => {
                  clockPositions.current.set(clock.id, event.nativeEvent.layout.y);
                }}
                onEdit={onOpenCustomEditor}
                onDelete={onOpenDelete}
                scrollGesture={scrollGesture}
                onHorizontalLockChange={handleHorizontalLockChange}
                onBeginScrub={onBeginRowScrub}
                onUpdateScrub={onUpdateRowScrub}
                onEndScrub={onEndRowScrub}
                onCancelScrub={onCancelRowScrub}
                onAdjust={onAdjustRow}
                onFocus={onFocusClock}
              />
            );
            const heroClock = model.clocks.find(({ kind }) => kind === "local");
            const selectedClocks = model.clocks.filter(
              ({ kind }) => kind !== "local",
            );
            return (
              <>
                {heroClock === undefined ? null : renderRow(heroClock, true)}
                {selectedClocks.length === 0 ? null : design === "grouped" ? (
                  <View
                    style={[
                      styles.groupedList,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    {selectedClocks.map((clock, index) => (
                      <View key={clock.id}>
                        {index === 0 ? null : (
                          <View
                            style={[
                              styles.groupedDivider,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        )}
                        {renderRow(clock, false)}
                      </View>
                    ))}
                  </View>
                ) : design === "tiles" ? (
                  <View style={styles.tilesGrid}>
                    {selectedClocks.map((clock) => renderRow(clock, false))}
                  </View>
                ) : (
                  <View style={styles.clockCollection}>
                    {selectedClocks.map((clock) => renderRow(clock, false))}
                  </View>
                )}
              </>
            );
          })()}

          {model.emptyGuidance === undefined ? null : (
            <Text style={[styles.guidance, { color: colors.secondary }]}>
              {model.emptyGuidance}
            </Text>
          )}

          {model.addTimezoneUnavailableReason === undefined ? null : (
            <Text style={[styles.capacityMessage, { color: colors.secondary }]}>
              {model.addTimezoneUnavailableReason}
            </Text>
          )}
        </View>
        </ScrollView>
      </GestureDetector>
      <Pressable
        ref={addTimezoneView}
        onLayout={(event) => {
          addTimezonePosition.current = event.nativeEvent.layout.y;
        }}
        accessibilityRole="button"
        accessibilityLabel="Add timezone"
        accessibilityHint={model.addTimezoneUnavailableReason}
        onFocus={() => onFocusClock(undefined)}
        disabled={
          !model.isReady || model.addTimezoneUnavailableReason !== undefined
        }
        onPress={onOpenSelector}
        style={({ pressed }) => [
          styles.fab,
          design !== "grouped" && styles.fabRound,
          {
            backgroundColor: colors.accent,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.fabText,
            design !== "grouped" && styles.fabTextRound,
            { color: colors.background },
          ]}
        >
          {design === "grouped" ? "+  Add timezone" : "+"}
        </Text>
      </Pressable>
      {settingsVisible &&
      (onSelectDesign !== undefined ||
        onSelectClockFace !== undefined ||
        onSelectScrubDirection !== undefined ||
        onOpenPrivacyPolicy !== undefined) ? (
        <Modal
          testID="settings-modal"
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <ScrollView
              testID="settings-scroll"
              horizontal={false}
              contentContainerStyle={styles.modalScrollContent}
              style={{ maxHeight: presentation.modalMaxHeight }}
            >
            <View
              accessibilityViewIsModal
              style={[styles.modalSurface, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.modalTitle, { color: colors.primary }]}>
                Settings
              </Text>
              {onSelectDesign === undefined ? null : (
                <View accessibilityRole="radiogroup" style={styles.settingGroup}>
                  <Text
                    style={[styles.settingGroupLabel, { color: colors.secondary }]}
                  >
                    Design
                  </Text>
                  {designVariants.map(({ key, label }) => (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: design === key }}
                      onPress={() => onSelectDesign(key)}
                      style={({ pressed }) => [
                        styles.settingRadio,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text
                        importantForAccessibility="no-hide-descendants"
                        style={[styles.settingRadioMark, { color: colors.accent }]}
                      >
                        {design === key ? "◉" : "○"}
                      </Text>
                      <Text style={[styles.settingLabel, { color: colors.primary }]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {onSelectClockFace === undefined ? null : (
                <View accessibilityRole="radiogroup" style={styles.settingGroup}>
                  <Text
                    style={[styles.settingGroupLabel, { color: colors.secondary }]}
                  >
                    Clock face
                  </Text>
                  {clockFaces.map(({ key, label }) => (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: clockFace === key }}
                      onPress={() => onSelectClockFace(key)}
                      style={({ pressed }) => [
                        styles.settingRadio,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text
                        importantForAccessibility="no-hide-descendants"
                        style={[styles.settingRadioMark, { color: colors.accent }]}
                      >
                        {clockFace === key ? "◉" : "○"}
                      </Text>
                      <Text style={[styles.settingLabel, { color: colors.primary }]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {onSelectScrubDirection === undefined ? null : (
                <View accessibilityRole="radiogroup" style={styles.settingGroup}>
                  <Text
                    style={[styles.settingGroupLabel, { color: colors.secondary }]}
                  >
                    Scrub direction
                  </Text>
                  {scrubDirections.map(({ key, label }) => (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: scrubDirection === key }}
                      onPress={() => onSelectScrubDirection(key)}
                      style={({ pressed }) => [
                        styles.settingRadio,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text
                        importantForAccessibility="no-hide-descendants"
                        style={[styles.settingRadioMark, { color: colors.accent }]}
                      >
                        {scrubDirection === key ? "◉" : "○"}
                      </Text>
                      <Text style={[styles.settingLabel, { color: colors.primary }]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {onOpenPrivacyPolicy === undefined ? null : (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Privacy policy"
                  onPress={onOpenPrivacyPolicy}
                  style={({ pressed }) => [
                    styles.settingLink,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.settingLabel, { color: colors.accent }]}>
                    Privacy policy
                  </Text>
                </Pressable>
              )}
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close settings"
                  onPress={() => setSettingsVisible(false)}
                  style={styles.modalAction}
                >
                  <Text style={[styles.modalActionText, { color: colors.accent }]}>Done</Text>
                </Pressable>
              </View>
            </View>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
      {model.deleteConfirmation === undefined ? null : (
        <Modal
          testID="delete-confirmation"
          visible
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!model.deleteConfirmation?.isDeleting) onCancelDelete();
          }}
        >
          <View style={styles.modalBackdrop}>
            <ScrollView
              testID="delete-dialog-scroll"
              horizontal={false}
              contentContainerStyle={styles.modalScrollContent}
              style={{ maxHeight: presentation.modalMaxHeight }}
            >
            <View
              accessibilityViewIsModal
              style={[styles.modalSurface, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.modalTitle, { color: colors.primary }]}>
                {`Delete ${model.deleteConfirmation.name}?`}
              </Text>
              <Text style={[styles.modalBody, { color: colors.secondary }]}>
                {`${model.deleteConfirmation.name} will be removed. This cannot be undone.`}
              </Text>
              {model.persistenceError === undefined ? null : (
                <PersistenceError
                  error={model.persistenceError}
                  colors={colors}
                  stackDenseContent={presentation.stackDenseContent}
                  onRetry={onRetryPersistence}
                />
              )}
              <View
                testID="delete-dialog-actions"
                style={[
                  styles.modalActions,
                  presentation.stackDenseContent && styles.modalActionsStacked,
                ]}
              >
                <Pressable
                  ref={deleteCancelView}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel deletion"
                  accessibilityState={{
                    disabled: model.deleteConfirmation.isDeleting,
                  }}
                  disabled={model.deleteConfirmation.isDeleting}
                  onPress={onCancelDelete}
                  style={styles.modalAction}
                >
                  <Text style={[styles.modalActionText, { color: colors.accent }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${model.deleteConfirmation.name}`}
                  accessibilityState={{
                    disabled: model.deleteConfirmation.isDeleting,
                  }}
                  disabled={model.deleteConfirmation.isDeleting}
                  onPress={onConfirmDelete}
                  style={styles.modalAction}
                >
                  <Text style={[styles.modalActionText, { color: colors.destructive }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  overlayScroll: { flex: 1 },
  viewport: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  content: { width: "100%", alignSelf: "center" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { fontSize: 30, fontWeight: "700" },
  settingsGlyph: { fontSize: 22, fontWeight: "400" },
  settingLabel: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 22 },
  settingGroup: { marginTop: 20 },
  settingGroupLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  settingRadio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  settingRadioMark: { fontSize: 18 },
  settingLink: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    marginTop: 20,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    minWidth: 56,
    minHeight: 48,
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fabRound: { width: 56, paddingHorizontal: 0 },
  fabText: { fontSize: 16, fontWeight: "600" },
  fabTextRound: { fontSize: 26, fontWeight: "400", includeFontPadding: false },
  statusSurface: {
    width: "100%",
    maxWidth: 680,
    minHeight: 56,
    alignSelf: "center",
    borderRadius: 28,
    paddingLeft: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    elevation: 1,
  },
  statusSurfaceDense: { paddingLeft: 14 },
  statusText: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  statusTextStacked: { flexDirection: "column", alignItems: "flex-start", gap: 2, paddingVertical: 8 },
  statusAdjustable: { flex: 1, minHeight: 64, justifyContent: "center" },
  statusLabel: { fontSize: 18, fontWeight: "700" },
  statusOffsetLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusOffset: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  chevron: {
    fontSize: 21,
    fontWeight: "700",
    opacity: 0.55,
    includeFontPadding: false,
  },
  statusBack: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  statusActionSpacer: { width: 48, height: 48 },
  backGlyph: { fontSize: 26, fontWeight: "700" },
  clockCollection: { gap: 4 },
  clockSurface: {
    minHeight: 80,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clockSurfaceDense: { paddingHorizontal: 12, paddingVertical: 12, alignItems: "flex-start" },
  airyRowSurface: { paddingHorizontal: 4, paddingVertical: 10, minHeight: 72 },
  heroSurface: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingVertical: 18,
    marginBottom: 8,
  },
  groupedHeroSurface: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 22,
    marginBottom: 12,
  },
  tilesHeroSurface: { paddingVertical: 8, marginBottom: 4 },
  groupedList: { borderRadius: 28, overflow: "hidden" },
  groupedDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
    marginHorizontal: 20,
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  tileSurface: {
    width: "48%",
    minHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "column",
    alignItems: "stretch",
  },
  tileSurfaceDense: { width: "100%" },
  clockSummary: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 20 },
  clockSummaryStacked: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  clockSummaryCentered: { alignItems: "center" },
  rowTimeAdjustable: { minHeight: 48, justifyContent: "center", flexShrink: 0 },
  rowTimeAdjustableDense: { width: "100%", flexShrink: 1 },
  timeLine: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  timeLineCentered: { justifyContent: "center" },
  timeLineDense: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    position: "relative",
  },
  timeValue: { flexDirection: "row", alignItems: "baseline" },
  timeValueDense: { flexDirection: "column", alignItems: "center" },
  rowChevron: {
    fontSize: 21,
    fontWeight: "700",
    marginHorizontal: 4,
    includeFontPadding: false,
  },
  rowChevronDenseLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    marginHorizontal: 0,
    textAlignVertical: "center",
  },
  rowChevronDenseRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    marginHorizontal: 0,
    textAlignVertical: "center",
  },
  time: {
    fontSize: 32,
    fontVariant: ["tabular-nums"],
    fontWeight: "400",
    includeFontPadding: false,
  },
  timeAiry: { fontSize: 34, fontWeight: "300" },
  timeTile: { fontSize: 28 },
  timeHero: { fontSize: 56, fontWeight: "300", letterSpacing: -1 },
  timeDense: { fontSize: 30 },
  timeAnalogCaption: { fontSize: 16, fontWeight: "600" },
  period: { fontSize: 16, fontWeight: "600", marginLeft: 5 },
  periodAnalogCaption: { marginLeft: 0 },
  clockDetails: { flex: 1, minWidth: 0 },
  clockName: { fontSize: 19, fontWeight: "600" },
  metadataLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4 },
  offset: { fontSize: 15, fontVariant: ["tabular-nums"] },
  dayDifference: { fontSize: 15, fontWeight: "700" },
  rowAction: { width: 48, minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  rowActions: { width: 48, flexDirection: "column", alignItems: "center" },
  rowActionsTiles: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  rowActionText: { fontSize: 15, fontWeight: "700" },
  deleteGlyph: { fontSize: 28, fontWeight: "400", lineHeight: 32 },
  guidance: { fontSize: 16, lineHeight: 23, marginTop: 20 },
  capacityMessage: { fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
  addButton: {
    minHeight: 48,
    marginTop: 20,
    borderRadius: 24,
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
  selectorHeaderStacked: { flexDirection: "column", alignItems: "stretch", paddingVertical: 8 },
  selectorTitle: { minWidth: 0, flexShrink: 1, fontSize: 26, fontWeight: "700" },
  headerAction: { minWidth: 48, minHeight: 48, justifyContent: "center", alignItems: "flex-end" },
  headerActionText: { fontSize: 16, fontWeight: "700" },
  searchInput: {
    minHeight: 48,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 24,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  customPath: {
    minHeight: 48,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  formScrollContent: { flexGrow: 1, paddingBottom: 24 },
  form: { paddingHorizontal: 20 },
  fieldLabel: { fontSize: 16, fontWeight: "700", marginBottom: 8, marginTop: 12 },
  formInput: { marginHorizontal: 0, marginBottom: 0 },
  error: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  errorBanner: { marginHorizontal: 20, marginBottom: 12, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  errorBannerStacked: { flexDirection: "column", alignItems: "stretch" },
  errorMessage: { flex: 1, fontSize: 15, lineHeight: 21 },
  retryAction: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  offsetPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  offsetPickerStacked: { flexDirection: "column", alignItems: "stretch" },
  offsetAction: { minWidth: 80, minHeight: 48, alignItems: "center", justifyContent: "center" },
  offsetActionText: { fontSize: 15, fontWeight: "700" },
  selectedOffset: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  results: { paddingHorizontal: 20, paddingBottom: 24, gap: 6 },
  resultsGrouped: { gap: 0 },
  resultsTiles: { gap: 12 },
  resultsColumns: { gap: 12 },
  result: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultGroupedFirst: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  resultGroupedLast: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  resultAiry: { paddingHorizontal: 4 },
  resultTile: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 14,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
  },
  resultLabels: { flex: 1, minWidth: 0 },
  resultCity: { fontSize: 17, fontWeight: "600" },
  resultCountry: { fontSize: 14, marginTop: 2 },
  resultState: { fontSize: 15, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalScrollContent: { flexGrow: 1, justifyContent: "center" },
  modalSurface: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  modalBody: { fontSize: 16, lineHeight: 23, marginTop: 12 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 20,
  },
  modalActionsStacked: { flexDirection: "column", alignItems: "stretch" },
  modalAction: {
    minWidth: 72,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActionText: { fontSize: 16, fontWeight: "700" },
});
