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
import { revealClock } from "./nativeClockReveal";
import {
  resolvePresentation,
  semanticThemes,
  type SemanticTheme,
} from "./presentation";
import { scrubStepsFromTravel } from "./scrubGesture";

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
}

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

function ScrubSurface({
  testId,
  nativeId,
  accessibilityLabel,
  accessibilityHint,
  accessibilityValue,
  targetRef,
  style,
  children,
  scrollGesture,
  onHorizontalLockChange,
  onBegin,
  onUpdate,
  onEnd,
  onCancel,
  onAdjust,
  onFocus,
}: {
  readonly testId: string;
  readonly nativeId?: string;
  readonly accessibilityLabel: string;
  readonly accessibilityHint?: string;
  readonly accessibilityValue: string;
  readonly targetRef?: Ref<View>;
  readonly style: ComponentProps<typeof View>["style"];
  readonly children: ReactNode;
  readonly scrollGesture: ReturnType<(typeof Gesture)["Native"]>;
  readonly onHorizontalLockChange: (locked: boolean) => void;
  readonly onBegin: () => void;
  readonly onUpdate: (signedStepsFromGestureStart: number) => void;
  readonly onEnd: () => void;
  readonly onCancel: () => void;
  readonly onAdjust: (direction: "earlier" | "later") => void;
  readonly onFocus?: () => void;
}) {
  const gestureAxis = useRef<"horizontal" | "vertical" | null>(null);
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(testId)
        .simultaneousWithExternalGesture(scrollGesture)
        .runOnJS(true)
        .onStart(({ translationX, translationY }) => {
          gestureAxis.current =
            Math.abs(translationX) > Math.abs(translationY)
              ? "horizontal"
              : "vertical";
          if (gestureAxis.current !== "horizontal") return;
          onHorizontalLockChange(true);
          onBegin();
          onUpdate(scrubStepsFromTravel(translationX));
        })
        .onUpdate(({ translationX }) => {
          if (gestureAxis.current === "horizontal") {
            onUpdate(scrubStepsFromTravel(translationX));
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
        }),
    [
      onBegin,
      onCancel,
      onEnd,
      onHorizontalLockChange,
      onUpdate,
      scrollGesture,
      testId,
    ],
  );
  const hardwareKeyProps = {
    onKeyDown: (event: { readonly nativeEvent: { readonly key?: string } }) => {
      if (event.nativeEvent.key === "ArrowRight") onAdjust("earlier");
      if (event.nativeEvent.key === "ArrowLeft") onAdjust("later");
    },
  };

  return (
    <GestureDetector gesture={panGesture}>
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
    </GestureDetector>
  );
}

function ClockRow({
  clock,
  model,
  colors,
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
  return (
    <View
      onLayout={onLayout}
      testID={`clock-${clock.id}`}
      style={[
        styles.clockSurface,
        stackDenseContent && styles.clockSurfaceDense,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        testID={`clock-summary-${clock.id}`}
        style={[styles.clockSummary, stackDenseContent && styles.clockSummaryStacked]}
      >
        <ScrubSurface
          testId={`row-scrub-${clock.id}`}
          nativeId={`clock-time-${clock.id}`}
          accessibilityLabel={semanticTime(clock)}
          accessibilityHint={`Adjust ${clock.name} time`}
          accessibilityValue={scrubValue}
          targetRef={rowRef}
          style={[
            styles.rowTimeAdjustable,
            stackDenseContent && styles.rowTimeAdjustableDense,
          ]}
          scrollGesture={scrollGesture}
          onHorizontalLockChange={onHorizontalLockChange}
          onBegin={handleBeginScrub}
          onUpdate={onUpdateScrub}
          onEnd={onEndScrub}
          onCancel={onCancelScrub}
          onAdjust={handleAdjust}
          onFocus={() => onFocus(clock.id)}
        >
          <View
            testID={`clock-time-line-${clock.id}`}
            style={[styles.timeLine, stackDenseContent && styles.timeLineDense]}
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
            <View style={[styles.timeValue, stackDenseContent && styles.timeValueDense]}>
              <Text
                testID={`clock-time-${clock.id}`}
                style={[
                  styles.time,
                  stackDenseContent && styles.timeDense,
                  { color: colors.primary },
                ]}
              >
                {clock.time}
              </Text>
              {clock.period ? (
                <Text style={[styles.period, { color: colors.secondary }]}>
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
        </ScrubSurface>
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
        <View testID={`clock-actions-${clock.id}`} style={styles.rowActions}>
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
  readonly colors: SemanticTheme;
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
        { borderColor: colors.border },
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

  return (
    <View
      style={[
        styles.statusSurface,
        stackDenseContent && styles.statusSurfaceDense,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <ScrubSurface
        testId="status-scrub-gesture"
        accessibilityLabel="Adjust comparison time"
        accessibilityValue={status.accessibilityValue}
        style={styles.statusAdjustable}
        scrollGesture={scrollGesture}
        onHorizontalLockChange={onHorizontalLockChange}
        onBegin={onBeginScrub}
        onUpdate={onUpdateScrub}
        onEnd={onEndScrub}
        onCancel={onCancelScrub}
        onAdjust={onAdjust}
        onFocus={onFocus}
      >
        <View
          testID="status-text"
          style={[styles.statusText, stackDenseContent && styles.statusTextStacked]}
          accessibilityElementsHidden
        >
          <Text style={[styles.statusLabel, { color: colors.primary }]}>
            {status.label}
          </Text>
          <View style={styles.statusOffsetLine}>
            <Animated.Text
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.chevron,
                { color: colors.accent, opacity: chevronPulse },
              ]}
            >
              ‹
            </Animated.Text>
            <Text style={[styles.statusOffset, { color: colors.primary }]}>
              {status.offset}
            </Text>
            <Animated.Text
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.chevron,
                { color: colors.accent, opacity: chevronPulse },
              ]}
            >
              ›
            </Animated.Text>
          </View>
        </View>
      </ScrubSurface>
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
            style={[styles.backGlyph, { color: colors.accent }]}
          >
            ↶
          </Text>
        </Pressable>
      ) : (
        <View importantForAccessibility="no-hide-descendants" style={styles.statusActionSpacer} />
      )}
    </View>
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
}: ClockScreenProps) {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const viewport = useWindowDimensions();
  const colors = semanticThemes[colorScheme];
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
            style={[styles.addButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          ><Text style={[styles.addButtonText, { color: colors.accent }]}>Save</Text></Pressable>
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
          testID="selector-results"
          horizontal={false}
          style={styles.overlayScroll}
          data={model.selector.results}
          keyExtractor={({ catalogId }) => catalogId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.results,
            { paddingHorizontal: presentation.horizontalPadding },
          ]}
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
            {
              maxWidth: presentation.contentMaxWidth,
              minHeight: Math.max(viewport.height - 48, 0),
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.primary }]}>World Clock</Text>

          {model.persistenceError === undefined ||
          model.deleteConfirmation !== undefined ? null : (
            <PersistenceError
              error={model.persistenceError}
              colors={colors}
              stackDenseContent={presentation.stackDenseContent}
              onRetry={onRetryPersistence}
            />
          )}

          <View style={styles.clockCollection}>
            {model.clocks.map((clock) => (
              <ClockRow
                key={clock.id}
                clock={clock}
                model={model}
                colors={colors}
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
            ))}
          </View>

          {model.emptyGuidance === undefined ? null : (
            <Text style={[styles.guidance, { color: colors.secondary }]}>
              {model.emptyGuidance}
            </Text>
          )}

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
              styles.addButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity:
                  pressed
                    ? 0.72
                    : model.isReady &&
                        model.addTimezoneUnavailableReason === undefined
                      ? 1
                      : 1,
              },
            ]}
          >
            <Text style={[styles.addButtonText, { color: colors.accent }]}>+ Add timezone</Text>
          </Pressable>
          {model.addTimezoneUnavailableReason === undefined ? null : (
            <Text style={[styles.capacityMessage, { color: colors.secondary }]}>
              {model.addTimezoneUnavailableReason}
            </Text>
          )}
        </View>
        </ScrollView>
      </GestureDetector>
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
  viewport: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 },
  content: { width: "100%", alignSelf: "center" },
  title: { fontSize: 30, fontWeight: "700", marginBottom: 24 },
  statusSurface: {
    width: "100%",
    maxWidth: 680,
    minHeight: 64,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusSurfaceDense: { paddingLeft: 12 },
  statusText: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  statusTextStacked: { flexDirection: "column", alignItems: "flex-start", gap: 2, paddingVertical: 8 },
  statusAdjustable: { flex: 1, minHeight: 64, justifyContent: "center" },
  statusLabel: { fontSize: 18, fontWeight: "700" },
  statusOffsetLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusOffset: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  chevron: { fontSize: 21, fontWeight: "700", opacity: 0.55 },
  statusBack: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  statusActionSpacer: { width: 48, height: 48 },
  backGlyph: { fontSize: 26, fontWeight: "700" },
  clockCollection: { gap: 12 },
  clockSurface: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clockSurfaceDense: { paddingHorizontal: 12, paddingVertical: 14, alignItems: "flex-start" },
  clockSummary: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 20 },
  clockSummaryStacked: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  rowTimeAdjustable: { minHeight: 48, justifyContent: "center", flexShrink: 0 },
  rowTimeAdjustableDense: { width: "100%", flexShrink: 1 },
  timeLine: { flexDirection: "row", alignItems: "baseline", flexShrink: 0 },
  timeLineDense: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    position: "relative",
  },
  timeValue: { flexDirection: "row", alignItems: "baseline" },
  timeValueDense: { flexDirection: "column", alignItems: "center" },
  rowChevron: { fontSize: 21, fontWeight: "700", marginHorizontal: 4 },
  rowChevronDenseLeft: { position: "absolute", left: 0, top: 0, marginHorizontal: 0 },
  rowChevronDenseRight: { position: "absolute", right: 0, top: 0, marginHorizontal: 0 },
  time: {
    fontSize: 42,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
    includeFontPadding: false,
  },
  timeDense: { fontSize: 30 },
  period: { fontSize: 16, fontWeight: "600", marginLeft: 5 },
  clockDetails: { flex: 1, minWidth: 0 },
  clockName: { fontSize: 19, fontWeight: "600" },
  metadataLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4 },
  offset: { fontSize: 15, fontVariant: ["tabular-nums"] },
  dayDifference: { fontSize: 15, fontWeight: "700" },
  rowAction: { width: 48, minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  rowActions: { width: 48, flexDirection: "column", alignItems: "center" },
  rowActionText: { fontSize: 15, fontWeight: "700" },
  deleteGlyph: { fontSize: 28, fontWeight: "400", lineHeight: 32 },
  guidance: { fontSize: 16, lineHeight: 23, marginTop: 20 },
  capacityMessage: { fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
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
  selectorHeaderStacked: { flexDirection: "column", alignItems: "stretch", paddingVertical: 8 },
  selectorTitle: { minWidth: 0, flexShrink: 1, fontSize: 26, fontWeight: "700" },
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
  customPath: { minHeight: 48, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  formScrollContent: { flexGrow: 1, paddingBottom: 24 },
  form: { paddingHorizontal: 20 },
  fieldLabel: { fontSize: 16, fontWeight: "700", marginBottom: 8, marginTop: 12 },
  formInput: { marginHorizontal: 0, marginBottom: 0 },
  error: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  errorBanner: { marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  errorBannerStacked: { flexDirection: "column", alignItems: "stretch" },
  errorMessage: { flex: 1, fontSize: 15, lineHeight: 21 },
  retryAction: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  offsetPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  offsetPickerStacked: { flexDirection: "column", alignItems: "stretch" },
  offsetAction: { minWidth: 80, minHeight: 48, alignItems: "center", justifyContent: "center" },
  offsetActionText: { fontSize: 15, fontWeight: "700" },
  selectedOffset: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
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
