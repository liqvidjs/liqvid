import readline from "node:readline";

import pico from "picocolors";

/**
 * A leaf item in the tree. `value` is what gets returned when selected.
 */
export type TreeItem = {
  title: string;
  value: string;
  selected?: boolean;
};

/**
 * A top-level category. A category may have children (a nested group of
 * togglable items) or be a standalone selectable item (no children).
 */
export type TreeCategory<V extends string = string> = {
  title: string;
  /** Only used when the category has no children (standalone item). */
  value?: V;
  children?: TreeItem[];
  selected?: boolean;
};

type Row =
  | { type: "category"; catIndex: number }
  | { type: "item"; catIndex: number; itemIndex: number };

const isWin = process.platform === "win32";
const figures = {
  checkOff: isWin ? "( )" : "◯",
  checkOn: isWin ? "(*)" : "◉",
  partial: isWin ? "(-)" : "◐",
  pointer: isWin ? ">" : "❯",
};

/**
 * Render an interactive, nested tree of checkbox options. Categories with
 * children can be toggled as a whole (which toggles every child), and
 * individual children can be toggled independently. Standalone categories
 * (no children) behave like a single checkbox.
 *
 * Controls: ↑/↓ move · space toggle · a toggle all · enter confirm ·
 * esc / ctrl-c cancel.
 *
 * @returns The flat list of selected leaf/standalone `value`s, or
 *   `undefined` if the user cancelled.
 */
export function treeSelect(opts: {
  message: string;
  categories: TreeCategory[];
}): Promise<string[] | undefined> {
  const categories = opts.categories.map((cat) => ({
    ...cat,
    children: cat.children?.map((child) => ({ ...child })),
  }));

  // Build the flat, navigable list of rows in display order.
  const rows: Row[] = [];
  categories.forEach((cat, catIndex) => {
    rows.push({ catIndex, type: "category" });
    cat.children?.forEach((_, itemIndex) => {
      rows.push({ catIndex, itemIndex, type: "item" });
    });
  });

  return new Promise((resolvePromise) => {
    const input = process.stdin;
    const output = process.stdout;
    let cursor = 0;
    let rendered = 0;
    let done = false;

    const catState = (cat: (typeof categories)[number]) => {
      if (!cat.children || cat.children.length === 0) {
        return cat.selected ? "all" : "none";
      }
      const total = cat.children.length;
      const on = cat.children.filter((c) => c.selected).length;
      if (on === 0) return "none";
      if (on === total) return "all";
      return "partial";
    };

    const box = (state: "all" | "none" | "partial") =>
      state === "all"
        ? pico.green(figures.checkOn)
        : state === "partial"
          ? pico.yellow(figures.partial)
          : pico.dim(figures.checkOff);

    const toggleRow = (row: Row) => {
      const cat = categories[row.catIndex];
      if (row.type === "category") {
        if (cat.children && cat.children.length > 0) {
          const turnOn = catState(cat) !== "all";
          for (const child of cat.children) child.selected = turnOn;
        } else {
          cat.selected = !cat.selected;
        }
      } else {
        const child = cat.children![row.itemIndex];
        child.selected = !child.selected;
      }
    };

    const toggleAll = () => {
      const anyOff = categories.some((cat) => catState(cat) !== "all");
      for (const cat of categories) {
        if (cat.children && cat.children.length > 0) {
          for (const child of cat.children) child.selected = anyOff;
        } else {
          cat.selected = anyOff;
        }
      }
    };

    const collect = () => {
      const values: string[] = [];
      for (const cat of categories) {
        if (cat.children && cat.children.length > 0) {
          for (const child of cat.children) {
            if (child.selected) values.push(child.value);
          }
        } else if (cat.selected && cat.value !== undefined) {
          values.push(cat.value);
        }
      }
      return values;
    };

    const render = () => {
      const lines: string[] = [];
      lines.push(
        `${pico.green("?")} ${pico.bold(opts.message)} ${pico.dim(
          "(↑/↓ move · space toggle · a all · enter confirm)",
        )}`,
      );

      rows.forEach((row, i) => {
        const active = i === cursor;
        const pointer = active ? pico.cyan(figures.pointer) : " ";
        const cat = categories[row.catIndex];

        if (row.type === "category") {
          const state = catState(cat);
          const label =
            state === "all"
              ? pico.bold(pico.underline(cat.title))
              : active
                ? pico.cyan(cat.title)
                : cat.title;
          lines.push(`${pointer} ${box(state)} ${label}`);
        } else {
          const child = cat.children![row.itemIndex];
          const on = child.selected;
          const label = on
            ? pico.underline(child.title)
            : active
              ? pico.cyan(child.title)
              : child.title;
          lines.push(
            `${pointer}   ${
              on ? pico.green(figures.checkOn) : pico.dim(figures.checkOff)
            } ${label}`,
          );
        }
      });

      // Move cursor back up over the previously rendered block, then repaint.
      if (rendered > 0) {
        readline.moveCursor(output, 0, -rendered);
        readline.cursorTo(output, 0);
        readline.clearScreenDown(output);
      }
      output.write(lines.join("\n") + "\n");
      rendered = lines.length;
    };

    const cleanup = () => {
      if (input.isTTY) input.setRawMode(false);
      input.removeListener("keypress", onKeypress);
      input.pause();
      output.write("\x1B[?25h"); // show cursor
    };

    const finish = (values: string[] | undefined) => {
      if (done) return;
      done = true;
      cleanup();
      resolvePromise(values);
    };

    const onKeypress = (
      _str: string,
      key: { name?: string; ctrl?: boolean; sequence?: string },
    ) => {
      if (!key) return;
      const name = key.name;

      if (key.ctrl && (name === "c" || name === "d")) {
        output.write("\n");
        finish(undefined);
        return;
      }

      switch (name) {
        case "escape":
          output.write("\n");
          finish(undefined);
          return;
        case "up":
        case "k":
          cursor = (cursor - 1 + rows.length) % rows.length;
          break;
        case "down":
        case "j":
          cursor = (cursor + 1) % rows.length;
          break;
        case "space":
          toggleRow(rows[cursor]);
          break;
        case "a":
          toggleAll();
          break;
        case "return":
        case "enter":
          finish(collect());
          return;
        default:
          return;
      }
      render();
    };

    readline.emitKeypressEvents(input);
    if (input.isTTY) input.setRawMode(true);
    input.resume();
    output.write("\x1B[?25l"); // hide cursor
    input.on("keypress", onKeypress);
    render();
  });
}
