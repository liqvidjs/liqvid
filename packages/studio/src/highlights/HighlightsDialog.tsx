"use client";

import { RadioGroup } from "@base-ui/react/radio-group";
import {
  Duration,
  type DurationOptions,
  type DurationString,
} from "@liqvid/duration";
import { usePlayback } from "@liqvid/playback/react";
import { useScriptOptional } from "@liqvid/script/react";
import { useProjectParams, useProjectPath } from "@liqvid/studio-plugin-api";
import { formatTime } from "@liqvid/utils";
import {
  AlarmIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useId, useMemo, useReducer } from "react";

import type { HighlightEntry } from "#_/api/schemas";
import { colors, dims, rounded, spacing, text } from "#_/design/tokens.stylex";
import type { LocalizedReactNode, LocalizedString } from "#_/i18n/shared";
import { PlainString } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import {
  DialogActions,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from "#_/ui/Dialog";
import { DockableDialog } from "#_/ui/DockableDialog";
import { IconButton } from "#_/ui/IconButton";
import { RadioIndicator, RadioRoot } from "#_/ui/Radio";
import {
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from "#_/ui/Select";
import { TextField } from "#_/ui/TextField";
import { TimeDuration } from "#_/ui/Time";

import { loadHighlights, storeHighlights } from "./api.ts";

type Highlight = HighlightEntry;

const styles = stylex.create({
  addButton: {
    display: "flex",
    marginBlock: spacing.lg,
    marginInline: spacing.zero,
  },

  empty: {
    color: colors.grayDim,
    fontStyle: "italic",
  },

  error: {
    color: colors.destroy,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    marginBlock: spacing.lg,
    marginInline: spacing.zero,
  },

  fieldLabel: {
    color: colors.grayDim,
    fontSize: text.sm,
  },

  formActions: {
    columnGap: spacing.md,
    display: "flex",
    justifyContent: "flex-end",
    marginBlock: spacing.lg,
    marginInline: spacing.zero,
  },

  formPanel: {
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    flex: 1,
    minWidth: 0,
    padding: spacing.lg,
  },

  hint: {
    color: colors.grayDim,
    fontSize: text.sm,
    marginBlock: spacing.sm,
    marginInline: spacing.zero,
  },

  list: {
    display: "flex",
    flexDirection: "column",
    listStyle: "none",
    marginBlock: spacing.zero,
    marginInline: spacing.zero,
    paddingBlock: spacing.zero,
    paddingInline: spacing.zero,
    rowGap: spacing.zero,
  },

  listItem: {
    alignItems: "flex-start",
    columnGap: spacing.md,
    display: "flex",
    paddingBlock: spacing.md,
    paddingInline: spacing.zero,
  },

  listItemBody: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
    rowGap: spacing.xs,
  },

  listItemControls: {
    columnGap: spacing.sm,
    display: "flex",
  },

  listItemTime: {
    color: colors.grayDim,
    fontSize: text.sm,
  },

  listItemTitle: {
    color: colors.grayNormal,
    fontWeight: "bold",
    overflowWrap: "anywhere",
  },

  radioRow: {
    alignItems: "center",
    color: colors.grayNormal,
    columnGap: spacing.md,
    cursor: "pointer",
    display: "flex",
  },
});

const t = {
  add: "Add" as LocalizedString,
  addAtCurrentTime: "Add highlight at current time" as LocalizedString,
  cancel: "Cancel" as LocalizedString,
  capturedAt: "Captured at current playback time: " as LocalizedString,
  delete: "Delete highlight" as LocalizedString,
  edit: "Edit highlight" as LocalizedString,
  empty: "No highlights yet" as LocalizedString,
  failedToLoad: "Failed to load highlights" as LocalizedString,
  failedToSave: "Failed to save highlights — try again." as LocalizedString,
  header: "Highlights" as LocalizedString,
  loading: "Loading highlights…" as LocalizedString,
  marker: "Marker" as LocalizedString,
  markerMode: "Relative to script marker" as LocalizedString,
  newHighlightTitle: "New highlight" as LocalizedString,
  offset: "Offset" as LocalizedString,
  offsetBeforeMarkerHint:
    'Use negative numbers to refer to times before the marker start, e.g. "-0:05".' as LocalizedString,
  offsetBeforeTimeHint:
    'Use negative numbers to refer to times before the current position, e.g. "-0:05".' as LocalizedString,
  overwrite: "Overwrite with current playback time" as LocalizedString,
  save: "Save" as LocalizedString,
  time: "Time" as LocalizedString,
  timePlaceholder: "1:20" as LocalizedString,
  title: "Title" as LocalizedString,
  titlePlaceholder: "Untitled highlight" as LocalizedString,
  untitled: "(untitled)" as LocalizedString,
} as const;

/** Marker-relative offset, e.g. `{ marker: "intro", offset: "-0:05" }`. */
function isMarkerOffset(
  time: Highlight["time"],
): time is { marker: string; offset: string } {
  return typeof time === "object" && time !== null && "marker" in time;
}

/** Human-readable description of a highlight's time. */
function describeTime(time: Highlight["time"]): LocalizedReactNode {
  if (isMarkerOffset(time)) {
    return PlainString(`${time.marker} ${time.offset}`);
  }
  if (typeof time === "string") {
    return PlainString(time);
  }
  return <TimeDuration value={time as DurationOptions} />;
}

/** Resolve a highlight's time to an absolute playback time in milliseconds. */
function timeMs(
  time: Highlight["time"],
  markerStartsMs: ReadonlyMap<string, number> | null,
): number {
  if (isMarkerOffset(time)) {
    const start = markerStartsMs?.get(time.marker);
    return start === undefined
      ? Number.POSITIVE_INFINITY
      : start + Duration.inMilliseconds(time.offset as DurationString);
  }
  return Duration.inMilliseconds(time as DurationOptions);
}

type HighlightsState = {
  editingIndex: number | null;
  highlights: readonly Highlight[] | null;
  loadError: boolean;
  pendingTime: string | null;
  saveError: boolean;
};

type HighlightsAction =
  | { index: number | null; kind: "editingIndex" }
  | { highlights: readonly Highlight[]; kind: "persist" }
  | { kind: "loaded"; value: readonly Highlight[] | undefined }
  | { kind: "pendingTime"; value: string | null }
  | { kind: "saveError"; value: boolean };

function highlightsReducer(
  state: HighlightsState,
  action: HighlightsAction,
): HighlightsState {
  switch (action.kind) {
    case "editingIndex": {
      return { ...state, editingIndex: action.index };
    }
    case "loaded": {
      return {
        ...state,
        highlights: action.value ?? [],
        loadError: action.value === undefined,
      };
    }
    case "pendingTime": {
      return { ...state, pendingTime: action.value };
    }
    case "persist": {
      return {
        ...state,
        editingIndex: null,
        highlights: action.highlights,
        saveError: false,
      };
    }
    case "saveError": {
      return { ...state, saveError: action.value };
    }
  }
}

/**
 * Dialog for managing a project's highlights.
 */
export function HighlightsDialog() {
  const projectPath = useProjectPath();
  const projectParams = useProjectParams();
  const playback = usePlayback();
  const script = useScriptOptional();

  /** Names of script markers, or `null` if no script is available */
  const markerNames = useMemo(
    () => (script ? script.markers.map((marker) => marker.name) : null),
    [script],
  );

  /** Marker name → start time in milliseconds, or `null` if no script */
  const markerStartsMs = useMemo(
    () =>
      script
        ? new Map(
            script.markers.map((marker) => [
              marker.name,
              marker.start.inMilliseconds(),
            ]),
          )
        : null,
    [script],
  );

  const [state, dispatch] = useReducer(highlightsReducer, {
    editingIndex: null,
    highlights: null,
    loadError: false,
    pendingTime: null,
    saveError: false,
  });
  const { editingIndex, highlights, loadError, pendingTime, saveError } = state;

  // load highlights
  useEffect(() => {
    let active = true;

    loadHighlights({ params: projectParams, projectPath }).then((result) => {
      if (!active) {
        return;
      }
      dispatch({ kind: "loaded", value: result });
    });

    return () => {
      active = false;
    };
  }, [projectParams, projectPath]);

  // sorted view of the highlights, paired with their index in the stored list
  // so that editing and deleting still refer to the right entry
  const sorted = useMemo(() => {
    if (highlights === null) {
      return null;
    }
    return highlights
      .map((highlight, index) => ({ highlight, index }))
      .sort(
        (a, b) =>
          timeMs(a.highlight.time, markerStartsMs) -
            timeMs(b.highlight.time, markerStartsMs) || a.index - b.index,
      );
  }, [highlights, markerStartsMs]);

  // persist an updated list of highlights
  const persist = useCallback(
    (next: readonly Highlight[]) => {
      dispatch({ highlights: next, kind: "persist" });

      storeHighlights(next, { params: projectParams, projectPath }).then((ok) =>
        dispatch({ kind: "saveError", value: !ok }),
      );
    },
    [projectParams, projectPath],
  );

  const addHighlight = useCallback(
    (title: string) => {
      if (pendingTime === null || highlights === null) {
        return;
      }
      persist([...highlights, { time: pendingTime, title }]);
      dispatch({ kind: "pendingTime", value: null });
    },
    [highlights, pendingTime, persist],
  );

  const updateHighlight = useCallback(
    (index: number, next: Highlight) => {
      if (highlights === null) {
        return;
      }
      const nextHighlights: Highlight[] = [...highlights];
      nextHighlights[index] = next;
      persist(nextHighlights);
    },
    [highlights, persist],
  );

  const overwriteHighlight = useCallback(
    (index: number) => {
      if (highlights === null) {
        return;
      }

      // read the playback time when the button is clicked, not when the
      // dialog rendered (which would freeze it at the last render time)
      updateHighlight(index, {
        ...highlights[index]!,
        time: formatTime(playback.currentTime$),
      });
    },
    [highlights, playback, updateHighlight],
  );

  const deleteHighlight = useCallback(
    (index: number) => {
      if (highlights === null) {
        return;
      }
      persist(highlights.filter((_, i) => i !== index));
    },
    [highlights, persist],
  );

  const ids = { pendingTitle: useId() };

  return (
    <DockableDialog.Dialog>
      <DockableDialog.Header>
        {t.header}
        <DockableDialog.Close />
      </DockableDialog.Header>
      <DockableDialog.Content>
        <div sx={styles.addButton}>
          <Button
            disabled={loadError}
            onClick={() =>
              dispatch({
                kind: "pendingTime",
                value: formatTime(playback.currentTime$),
              })
            }
            size="small"
          >
            <PlusIcon />
            {t.addAtCurrentTime}
          </Button>
        </div>

        {sorted === null ? (
          <p sx={styles.empty}>{loadError ? t.failedToLoad : t.loading}</p>
        ) : sorted.length === 0 ? (
          <p sx={styles.empty}>{t.empty}</p>
        ) : (
          <ul sx={styles.list}>
            {sorted.map(({ highlight, index }) => (
              <li key={index} sx={styles.listItem}>
                {editingIndex === index ? (
                  <HighlightForm
                    highlight={highlight}
                    markers={markerNames}
                    onCancel={() =>
                      dispatch({ index: null, kind: "editingIndex" })
                    }
                    onSubmit={(next) => updateHighlight(index, next)}
                  />
                ) : (
                  <>
                    <div sx={styles.listItemBody}>
                      <span sx={styles.listItemTitle}>
                        {highlight.title
                          ? PlainString(highlight.title)
                          : t.untitled}
                      </span>
                      <span sx={styles.listItemTime}>
                        {describeTime(highlight.time)}
                      </span>
                    </div>
                    <div sx={styles.listItemControls}>
                      <IconButton
                        aria-label="Overwrite with current playback time"
                        onClick={() => overwriteHighlight(index)}
                        size="sm"
                        title="Overwrite with current playback time"
                        variant="primary"
                      >
                        <AlarmIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Edit highlight"
                        onClick={() =>
                          dispatch({ index, kind: "editingIndex" })
                        }
                        size="sm"
                        title="Edit highlight"
                      >
                        <PencilSimpleIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Delete highlight"
                        onClick={() => deleteHighlight(index)}
                        size="sm"
                        title="Delete highlight"
                      >
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {saveError && <p sx={styles.error}>{t.failedToSave}</p>}

        {/* prompt for the title of a new highlight */}
        <DialogRoot
          onOpenChange={(open) => {
            if (!open) {
              dispatch({ kind: "pendingTime", value: null });
            }
          }}
          open={pendingTime !== null}
        >
          <DialogPortal>
            <DialogBackdrop />
            <DialogPopup size="small">
              <DialogTitle>{t.newHighlightTitle}</DialogTitle>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const title = String(
                    new FormData(e.currentTarget).get("title") ?? "",
                  ).trim();
                  if (title !== "") {
                    addHighlight(title);
                  }
                }}
              >
                <div sx={styles.field}>
                  <span sx={styles.fieldLabel}>{t.title}</span>
                  <TextField
                    autoFocus
                    defaultValue=""
                    id={ids.pendingTitle}
                    name="title"
                    onChange={() => {}}
                    placeholder={t.titlePlaceholder}
                    value={undefined}
                  />
                  <p sx={styles.hint}>
                    {t.capturedAt}{" "}
                    {pendingTime !== null && (
                      <TimeDuration value={pendingTime as DurationString} />
                    )}
                  </p>
                </div>
                <DialogActions>
                  <DialogClose />
                  <Button kind="primary" type="submit">
                    {t.add}
                  </Button>
                </DialogActions>
              </form>
            </DialogPopup>
          </DialogPortal>
        </DialogRoot>
      </DockableDialog.Content>
    </DockableDialog.Dialog>
  );
}

type HighlightFormState = {
  marker: string;
  mode: "absolute" | "marker";
  offset: string;
  time: string;
  title: string;
};

type HighlightFormAction =
  | { kind: "marker"; value: string }
  | { kind: "mode"; value: "absolute" | "marker" }
  | { kind: "offset"; value: string }
  | { kind: "time"; value: string }
  | { kind: "title"; value: string };

function highlightFormReducer(
  state: HighlightFormState,
  action: HighlightFormAction,
): HighlightFormState {
  switch (action.kind) {
    case "marker": {
      return { ...state, marker: action.value };
    }
    case "mode": {
      return { ...state, mode: action.value };
    }
    case "offset": {
      return { ...state, offset: action.value };
    }
    case "time": {
      return { ...state, time: action.value };
    }
    case "title": {
      return { ...state, title: action.value };
    }
  }
}

function createHighlightFormState(
  highlight: Highlight,
  markers: readonly string[] | null,
): HighlightFormState {
  return {
    marker: (() => {
      if (
        markers &&
        isMarkerOffset(highlight.time) &&
        markers.includes(highlight.time.marker)
      ) {
        return highlight.time.marker;
      }
      return markers?.[0] ?? "";
    })(),
    mode: isMarkerOffset(highlight.time) && markers ? "marker" : "absolute",
    offset: isMarkerOffset(highlight.time) ? highlight.time.offset : "0:00",
    time: typeof highlight.time === "string" ? highlight.time : "0:00",
    title: highlight.title,
  };
}

/** Form for adding or editing a highlight's title and time. */
function HighlightForm({
  highlight,
  markers,
  onCancel,
  onSubmit,
}: {
  highlight: Highlight;

  /** Names of script markers, or `null` if no script is available */
  markers: readonly string[] | null;

  onCancel(): void;

  onSubmit(highlight: Highlight): void;
}) {
  const [state, dispatch] = useReducer(
    highlightFormReducer,
    { highlight, markers },
    ({ highlight, markers }) => createHighlightFormState(highlight, markers),
  );
  const { marker, mode, offset, time, title } = state;

  const valid =
    title.trim() !== "" &&
    (mode === "absolute"
      ? Duration.isDurationString(time)
      : marker !== "" && Duration.isDurationString(offset));

  const ids = {
    offset: useId(),
    time: useId(),
    title: useId(),
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) {
          return;
        }

        onSubmit({
          time:
            mode === "absolute" ? time : { marker, offset: offset || "0:00" },
          title: title.trim(),
        });
      }}
      sx={styles.formPanel}
    >
      <div sx={styles.field}>
        <span sx={styles.fieldLabel}>{t.title}</span>
        <TextField
          id={ids.title}
          onChange={(value) => dispatch({ kind: "title", value })}
          placeholder={t.titlePlaceholder}
          value={title}
        />
      </div>

      {markers !== null && (
        <RadioGroup
          onValueChange={(value) =>
            dispatch({ kind: "mode", value: value as "absolute" | "marker" })
          }
          value={mode}
        >
          <label sx={styles.radioRow}>
            <RadioRoot value="absolute">
              <RadioIndicator />
            </RadioRoot>
            {PlainString("Absolute")}
          </label>
          <label sx={styles.radioRow}>
            <RadioRoot value="marker">
              <RadioIndicator />
            </RadioRoot>
            {t.markerMode}
          </label>
        </RadioGroup>
      )}

      {mode === "absolute" || markers === null ? (
        <div sx={styles.field}>
          <span sx={styles.fieldLabel}>{t.time}</span>
          <TextField
            id={ids.time}
            onChange={(value) => dispatch({ kind: "time", value })}
            placeholder={t.timePlaceholder}
            value={time}
          />
          <p sx={styles.hint}>{t.offsetBeforeTimeHint}</p>
        </div>
      ) : (
        <>
          <div sx={styles.field}>
            <span sx={styles.fieldLabel}>{t.marker}</span>
            <SelectRoot
              items={Object.fromEntries(markers.map((m) => [m, m]))}
              onValueChange={(value) => {
                if (value) {
                  dispatch({ kind: "marker", value: value as string });
                }
              }}
              value={marker}
            >
              <SelectTrigger size="small">
                <SelectValue />
                <SelectIcon />
              </SelectTrigger>
              <SelectPortal>
                <SelectPositioner sideOffset={4}>
                  <SelectPopup>
                    <SelectList>
                      {markers.map((name) => (
                        <SelectItem key={name} value={name}>
                          <SelectItemText>{PlainString(name)}</SelectItemText>
                          <SelectItemIndicator />
                        </SelectItem>
                      ))}
                    </SelectList>
                  </SelectPopup>
                </SelectPositioner>
              </SelectPortal>
            </SelectRoot>
          </div>

          <div sx={styles.field}>
            <span sx={styles.fieldLabel}>{t.offset}</span>
            <TextField
              id={ids.offset}
              onChange={(value) => dispatch({ kind: "offset", value })}
              placeholder={PlainString("0:00")}
              value={offset}
            />
            <p sx={styles.hint}>{t.offsetBeforeMarkerHint}</p>
          </div>
        </>
      )}

      <div sx={styles.formActions}>
        <Button onClick={onCancel}>{t.cancel}</Button>
        <Button disabled={!valid} kind="primary" type="submit">
          {t.save}
        </Button>
      </div>
    </form>
  );
}
