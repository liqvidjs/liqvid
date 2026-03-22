import { ChangeSet, Text } from "@codemirror/state";
import type { ReplayData } from "@liqvid/utils";

interface CMPosition {
  line: number;
  ch: number;
}

interface CMSelection {
  anchor: CMPosition;
  head: CMPosition;
}

interface Change {
  from: CMPosition;
  to: CMPosition;
  text: string[];
  removed: string[];
}

export type OldFormat = ReplayData<
  | ["command", string]
  | ["cursor", CMPosition]
  | ["selection", CMSelection]
  | ["text", Change]
>;

export type Action =
  | string
  | [changes: [number, ...string[]], selection?: [number, number]];
export type NewFormat = ReplayData<Action>;

/**
 * Convert CM5 recording data to CM6
 */
export function convert(oldFormat: OldFormat): NewFormat {
  // document being built
  let doc = Text.of([""]);

  const newFormat: NewFormat = [];

  for (let i = 0; i < oldFormat.length; ++i) {
    const entry = oldFormat[i];
    const [time, action] = entry;

    switch (action[0]) {
      case "command":
        switch (action[1]) {
          case "Enter":
            // const indentLength = (oldFormat[i+1][1] as ["cursor", CMPosition])[1].ch;
            // const cs = ChangeSet.of({from: doc.length, to: doc.length, insert: "\n" + " ".repeat(indentLength)}, doc.length);
            // // process.stdout.write("\n" + " ".repeat(indentLength));
            // doc = cs.apply(doc);
            // newFormat.push([time, [cs.toJSON()]]);
            break;
          default:
            newFormat.push([time, action[1]]);
            break;
        }
        break;
      case "cursor": {
        const pos = convertPosition(action[1], doc);
        newFormat.push([time, [[doc.length], [pos, pos]]]);
        break;
      }
      case "selection": {
        const anchor = convertPosition(action[1].anchor, doc);
        const head = convertPosition(action[1].head, doc);
        newFormat.push([time, [[doc.length], [anchor, head]]]);
        break;
      }
      case "text": {
        const from = convertPosition(action[1].from, doc);
        const to = convertPosition(action[1].to, doc);
        const cs = ChangeSet.of(
          { from, insert: action[1].text.join("\n"), to },
          doc.length,
        );
        doc = cs.apply(doc);
        newFormat.push([time, [cs.toJSON()]]);
        break;
      }
    }
  }

  return newFormat;
}

function convertPosition(position: CMPosition, doc: Text): number {
  if (position.line >= doc.lines) {
    return doc.length;
  }
  return position.ch + doc.line(position.line + 1).from;
}
