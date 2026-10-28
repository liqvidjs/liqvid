export type SavedState = Readonly<{
  createdAt: string;
  files: Readonly<Record<string, string>>;
  isGlobal: boolean;
  name: string;
}>;
