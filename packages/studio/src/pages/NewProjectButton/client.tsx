"use client";

import { PlusIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { RelativeDir } from "effect-paths";
import { useCallback, useEffect, useId, useState } from "react";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import { type Localized, PlainString } from "#_/i18n/shared.mjs";
import {
  createProjectAction,
  loadTemplatesAction,
  type TemplateInfo,
} from "#_/pages/root-actions.js";
import { Button } from "#_/ui/Button.js";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "#_/ui/Dialog.js";
import { IconButton } from "#_/ui/IconButton.js";
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
} from "#_/ui/Select.js";
import { TextField } from "#_/ui/TextField.js";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

const styles = stylex.create({
  dialogActions: {
    columnGap: spacing.lg,
    display: "flex",
    justifyContent: "flex-end",
    marginTop: spacing.lg,
    rowGap: spacing.lg,
  },
  dialogForm: {
    columnGap: spacing.xl,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.xl,
  },
  error: {
    backgroundColor: colors.errorSubtle,
    borderColor: colors.errorBorder,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.errorText,
    fontSize: text.md,
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
  },
  fieldError: {
    color: colors.errorText,
    fontSize: text.md,
  },
  fieldHint: {
    color: colors.grayDim,
    fontSize: text.md,
  },
  formField: {
    columnGap: spacing.lg,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.lg,
  },
});

/** @package */
export function NewProjectButtonClient({ t }: { t: T }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [projectPath, setProjectPath] = useState<RelativeDir>(RelativeDir(""));
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation: disallow dots in project path
  const pathHasDot = projectPath.includes(".");
  const pathError = pathHasDot ? t.dotWarning : null;

  // Load templates when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplatesAction().then((loadedTemplates) => {
        setTemplates(loadedTemplates);
        // Select the default template, or the first one if none is marked as default
        // (templates are sorted with default first)
        if (loadedTemplates.length > 0) {
          const defaultTemplate = loadedTemplates.find((t) => t.default);
          setTemplateId(defaultTemplate?.id ?? loadedTemplates[0]!.id);
        }
      });
    }
  }, [open]);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setName("");
    setProjectPath(RelativeDir(""));
    setTemplateId("");
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();
      setIsCreating(true);
      setError(null);

      try {
        const result = await createProjectAction({
          name,
          projectPath,
          templateId,
        });

        if (result.success) {
          closeDialog();
        } else {
          setError(result.error ?? t.error);
        }
      } finally {
        setIsCreating(false);
      }
    },
    [name, projectPath, templateId, closeDialog, t.error],
  );

  const ids = {
    projectName: useId(),
    projectPath: useId(),
    projectTemplate: useId(),
  };

  return (
    <DialogRoot onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={<IconButton title={t.newProject} variant="primary" />}
      >
        <PlusIcon />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>{t.dialog.title}</DialogTitle>
          <form onSubmit={handleSubmit} sx={styles.dialogForm}>
            <div sx={styles.formField}>
              <TextField
                autoComplete="off"
                disabled={isCreating}
                id={ids.projectName}
                label={t.dialog.name}
                onChange={setName}
                placeholder={t.dialog.namePlaceholder}
                required
                value={name}
              />
            </div>

            <div sx={styles.formField}>
              <TextField
                autoComplete="off"
                disabled={isCreating}
                id={ids.projectPath}
                label={t.dialog.path}
                onChange={(value) => setProjectPath(RelativeDir(value))}
                placeholder={PlainString("category/project-slug")}
                required
                value={projectPath}
              />
              {pathError ? (
                <span sx={styles.fieldError}>{pathError}</span>
              ) : (
                <span sx={styles.fieldHint}>{t.path}</span>
              )}
            </div>

            <div sx={styles.formField}>
              <label htmlFor={ids.projectTemplate}>{t.dialog.template}</label>
              <SelectRoot
                disabled={isCreating || templates.length === 0}
                onValueChange={(value) =>
                  value && setTemplateId(value as string)
                }
                value={templateId}
              >
                <SelectTrigger id={ids.projectTemplate}>
                  <SelectValue placeholder={t.dialog.selectTemplate} />
                  <SelectIcon />
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner sideOffset={4}>
                    <SelectPopup>
                      <SelectList>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <SelectItemText>{template.name}</SelectItemText>
                            <SelectItemIndicator />
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </SelectRoot>
            </div>

            {error && <div sx={styles.error}>{error}</div>}

            <div sx={styles.dialogActions}>
              <DialogClose
                disabled={isCreating}
                // biome-ignore lint/correctness/noRestrictedElements: this is different
                render={<button type="button" />}
              >
                {t.dialog.cancel}
              </DialogClose>
              <Button
                disabled={
                  isCreating ||
                  !name ||
                  !projectPath ||
                  !templateId ||
                  pathHasDot
                }
                type="submit"
              >
                {isCreating ? t.dialog.creating : t.dialog.action}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
