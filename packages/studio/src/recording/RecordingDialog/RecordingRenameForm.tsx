import type { ParameterValues, RecordingMeta } from "@liqvid/schemas";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { useCallback, useReducer } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import type { Localized } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import { TextField } from "#_/ui/TextField";
import { useTranslations } from "#_/utils/react";

import type Translations from "../.translations/en.json";

type T = Localized<typeof Translations>;

type RenameState = {
  failed: boolean;
  isOpen: boolean;
  isRenaming: boolean;
  name: string;
};

type RenameAction =
  | { kind: "failed"; value: boolean }
  | { kind: "isOpen"; value: boolean }
  | { kind: "isRenaming"; value: boolean }
  | { kind: "name"; value: string };

function renameReducer(state: RenameState, action: RenameAction): RenameState {
  switch (action.kind) {
    case "failed": {
      return { ...state, failed: action.value };
    }
    case "isOpen": {
      return { ...state, isOpen: action.value };
    }
    case "isRenaming": {
      return { ...state, isRenaming: action.value };
    }
    case "name": {
      return { ...state, name: action.value };
    }
  }
}

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
  const [state, dispatch] = useReducer(renameReducer, {
    failed: false,
    isOpen: false,
    isRenaming: false,
    name: recordingName,
  });
  const { failed, isOpen, isRenaming, name } = state;

  const rename = useCallback(() => {
    const newName = name.trim();
    if (!newName || newName === recordingName) {
      return;
    }

    dispatch({ kind: "isRenaming", value: true });
    dispatch({ kind: "failed", value: false });
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
        dispatch({ kind: "name", value: renamed });
        dispatch({ kind: "isOpen", value: false });
      })
      .catch((cause: unknown) => {
        console.error("Failed to rename recording:", cause);
        dispatch({ kind: "failed", value: true });
      })
      .finally(() => dispatch({ kind: "isRenaming", value: false }));
  }, [name, onRename, projectParams, projectPath, recordingName]);

  return (
    <>
      <Button
        disabled={isRenaming}
        onClick={() => {
          dispatch({ kind: "name", value: recordingName });
          dispatch({ kind: "failed", value: false });
          dispatch({ kind: "isOpen", value: true });
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
            onChange={(value) => dispatch({ kind: "name", value })}
            value={name}
          />
          <Button disabled={isRenaming || !name.trim()} type="submit">
            {isRenaming ? t.rename.renaming : t.rename.action}
          </Button>
          <Button
            disabled={isRenaming}
            onClick={() => dispatch({ kind: "isOpen", value: false })}
          >
            {t.rename.cancel}
          </Button>
          {failed && <span role="alert">{t.rename.failed}</span>}
        </form>
      )}
    </>
  );
}
