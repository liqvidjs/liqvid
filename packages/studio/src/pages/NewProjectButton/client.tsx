"use client";

import { PlusIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { RelativeDir } from "effect-paths";
import { useCallback, useEffect, useId, useState } from "react";

import type { Localized } from "#_/i18n/shared.mjs";
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

import { form } from "../root.sx.ts";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

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
          <form onSubmit={handleSubmit} sx={form.dialogForm}>
            <div sx={form.formField}>
              <label htmlFor={ids.projectName}>{t.dialog.name}</label>
              <input
                autoComplete="off"
                disabled={isCreating}
                id={ids.projectName}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.dialog.namePlaceholder}
                required
                type="text"
                value={name}
              />
            </div>

            <div sx={form.formField}>
              <label htmlFor={ids.projectPath}>{t.dialog.path}</label>
              <input
                autoComplete="off"
                disabled={isCreating}
                id={ids.projectPath}
                onChange={(e) => setProjectPath(RelativeDir(e.target.value))}
                placeholder="category/project-slug"
                required
                type="text"
                value={projectPath}
              />
              {pathError ? (
                <span sx={form.fieldError}>{pathError}</span>
              ) : (
                <span sx={form.fieldHint}>{t.path}</span>
              )}
            </div>

            <div sx={form.formField}>
              <label htmlFor={ids.projectTemplate}>{t.dialog.template}</label>
              <SelectRoot
                disabled={isCreating || templates.length === 0}
                onValueChange={(value) => value && setTemplateId(value)}
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

            {error && <div sx={form.error}>{error}</div>}

            <div sx={form.dialogActions}>
              <DialogClose
                disabled={isCreating}
                // biome-ignore lint/correctness/noRestrictedElements: this is different
                render={<button type="button" />}
              >
                {t.dialog.cancel}
              </DialogClose>
              <Button
                className={stylex.props(form.submitButton).className}
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
