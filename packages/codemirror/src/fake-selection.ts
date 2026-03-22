import {
  combineConfig,
  EditorSelection,
  type EditorState,
  type Extension,
  Facet,
  Prec,
  SelectionRange,
  StateEffect,
} from "@codemirror/state";
import {
  EditorView,
  layer,
  RectangleMarker,
  type ViewUpdate,
} from "@codemirror/view";

export interface Range {
  anchor: number;
  head: number;
}

export const FakeSelection = StateEffect.define<Range>();

/**
 * A "block" cursor is a solid rectangle over a character.
 * A "column" cursor is a vertical line in between characters.
 */
export type CursorStyle = "block" | "column";

export interface FakeSelectionConfig {
  /**
   * The length of a full cursor blink cycle, in milliseconds.
   * Can be set to 0 to disable blinking.
   * @default 1200
   */
  cursorBlinkRate?: number;

  /**
   * Style of cursor to draw.
   * @default "block"
   */
  cursorStyle?: CursorStyle;

  /**
   * Whether to show a cursor for non-empty ranges.
   * @default true
   */
  drawRangeCursor?: boolean;
}

const fakeSelectionConfig = Facet.define<
  FakeSelectionConfig,
  Required<FakeSelectionConfig>
>({
  combine(configs) {
    return combineConfig(
      configs,
      {
        cursorBlinkRate: 1200,
        cursorStyle: "block",
        drawRangeCursor: true,
      },
      {
        cursorBlinkRate: (a, b) => a ?? b,
        cursorStyle: (a, b) => a ?? b,
        drawRangeCursor: (a, b) => a ?? b,
      },
    );
  },
});

/**
 * CodeMirror extension to imitate selections in replay.
 */
export function fakeSelection(config: FakeSelectionConfig = {}): Extension {
  return [
    fakeSelectionConfig.of(config),
    fakeCursorLayer,
    fakeSelectionLayer,
    style,
  ];
}

/// Retrieve the [`drawSelection`](#view.drawSelection) configuration
/// for this state. (Note that this will return a set of defaults even
/// if `drawSelection` isn't enabled.)
export function getDrawFakeSelectionConfig(
  state: EditorState,
): FakeSelectionConfig {
  return state.facet(fakeSelectionConfig);
}

function configChanged(update: ViewUpdate) {
  return (
    update.startState.facet(fakeSelectionConfig) !==
    update.state.facet(fakeSelectionConfig)
  );
}

const fakeCursorLayer = layer({
  above: true,
  class: "lqv-fakeCursorLayer",
  markers(view) {
    const { state } = view;
    const conf = state.facet(fakeSelectionConfig);
    const cursors: RectangleMarker[] = [];
    if (!this.range) return [];

    for (const r of [this.range]) {
      if (r.empty || conf.drawRangeCursor) {
        const className =
          conf.cursorStyle === "block"
            ? "lqv-fakeCursorBlock"
            : "lqv-fakeCursorColumn";

        const cursor = r.empty
          ? r
          : EditorSelection.cursor(r.head, r.head > r.anchor ? -1 : 1);

        for (const piece of RectangleMarker.forRange(view, className, cursor))
          cursors.push(piece);
      }
    }

    return cursors;
  },
  mount(dom, view) {
    setBlinkRate(view.state, dom);
  },
  update(update, dom) {
    const effects = update.transactions
      .map(
        (tr) =>
          tr.effects.filter((e) => e.is(FakeSelection)) as StateEffect<Range>[],
      )
      .reduce((a, b) => a.concat(b), []);

    const confChange = configChanged(update);
    if (confChange) setBlinkRate(update.state, dom);

    if (effects.length === 0) {
      return update.docChanged || update.selectionSet || confChange;
    }

    if (effects.length > 0) {
      dom.style.animationName =
        dom.style.animationName === "lqv-blink" ? "lqv-blink2" : "lqv-blink";
      this.range = SelectionRange.fromJSON(effects[effects.length - 1].value);
      return true;
    }
  },
});

function setBlinkRate(state: EditorState, dom: HTMLElement) {
  dom.style.animationDuration = `${state.facet(fakeSelectionConfig).cursorBlinkRate}ms`;
}

const fakeSelectionLayer = layer({
  above: false,
  class: "lqv-fakeSelectionLayer",
  markers(view) {
    if (!this.range) {
      return [];
    }

    return RectangleMarker.forRange(
      view,
      "lqv-fakeSelectionBackground",
      this.range,
    );
  },
  update(update) {
    const effects = update.transactions
      .map(
        (tr) =>
          tr.effects.filter((e) => e.is(FakeSelection)) as StateEffect<Range>[],
      )
      .reduce((a, b) => a.concat(b), []);

    if (effects.length === 0) {
      return (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        configChanged(update)
      );
    }

    if (effects.length > 0) {
      this.range = SelectionRange.fromJSON(effects[effects.length - 1].value);
      return true;
    }
  },
});

type StyleSpec = {
  [propOrSelector: string]: string | number | StyleSpec | null;
};

const themeSpec: { [selector: string]: StyleSpec } = {
  ".lqv-fakeCursorBlock": {
    background: "#f00a",
    marginLeft: "-0.6px",
    pointerEvents: "none",
    width: "1ch",
  },

  ".lqv-fakeCursorColumn": {
    borderLeft: "1.2px solid black",
    marginLeft: "-0.6px",
    pointerEvents: "none",
  },

  ".lqv-fakeCursorLayer": {
    animation: "steps(1) lqv-blink 1.2s infinite",
    pointerEvents: "none",
  },
  ".lqv-fakeSelectionBackground": {
    background: "#d7d4f0",
  },

  // Two animations defined so that we can switch between them to
  // restart the animation without forcing another style
  // recomputation.
  "@keyframes lqv-blink": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
  "@keyframes lqv-blink2": { "0%": {}, "50%": { opacity: 0 }, "100%": {} },
};

const style = Prec.highest(EditorView.theme(themeSpec));
