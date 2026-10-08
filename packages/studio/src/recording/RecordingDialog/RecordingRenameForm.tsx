import type { ParameterValues, RecordingMeta } from "@liqvid/schemas";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { useCallback, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import type { Localized } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import { TextField } from "#_/ui/TextField";
import { useTranslations } from "#_/utils/react";

import type Translations from "../.translations/en.json";

type T = Localized<typeof Translations>;

export function RecordingRenameForm({
  onRename,
  projectParams,
  projectPath,
  recordingName,
}: {
  onRename: (newName: string) => void;
  projectParams: ParameterValues;
  projectPath: RelativeDir;
  recordingName: RecordingMeta["name"];
}) {
  const {
    tabs: { saved: t },
  } = useTranslations<T>();
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(recordingName);
  const [failed, setFailed] = useState(false);

  const rename = useCallback(() => {
    const newName = name.trim();
    if (!newName || newName === recordingName) return;

    setIsRenaming(true);
    setFailed(false);
    clientRuntime
      .runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          return yield* client.recordings.rename({
            payload: { newName, recordingName },
            query: {
              params: JSON.stringify(projectParams),
              projectPath,
            },
          });
        }),
      )
      .then(({ newName: renamed }) => {
        onRename(renamed);
        setName(renamed);
        setIsOpen(false);
      })
      .catch((cause: unknown) => {
        console.error("Failed to rename recording:", cause);
        setFailed(true);
      })
      .finally(() => setIsRenaming(false));
  }, [name, onRename, projectParams, projectPath, recordingName]);

  return (
    <>
      <Button
        disabled={isRenaming}
        onClick={() => {
          setName(recordingName);
          setFailed(false);
          setIsOpen(true);
        }}
        title={t.rename.action}
      >
        {t.rename.action}
      </Button>
      {isOpen && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            rename();
          }}
        >
          <TextField
            aria-label={t.rename.name}
            autoFocus
            disabled={isRenaming}
            onChange={setName}
            value={name}
          />
          <Button disabled={isRenaming || !name.trim()} type="submit">
            {isRenaming ? t.rename.renaming : t.rename.action}
          </Button>
          <Button disabled={isRenaming} onClick={() => setIsOpen(false)}>
            {t.rename.cancel}
          </Button>
          {failed && <span role="alert">{t.rename.failed}</span>}
        </form>
      )}
    </>
  );
}
