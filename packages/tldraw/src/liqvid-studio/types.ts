import type { TLEditorSnapshot } from "tldraw";

export type SavedState = Readonly<{
  createdAt: string;
  name: string;
  snapshot: TLEditorSnapshot;
}>;
