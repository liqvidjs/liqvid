"use client";

import { CaretDownIcon, CheckIcon, PlusIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { RelativeDir } from "effect-paths";
import { useCallback, useEffect, useId, useState } from "react";

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
import type { Localized } from "#_/utils/i18n.mjs";

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
          <form {...stylex.props(form.dialogForm)} onSubmit={handleSubmit}>
            <div {...stylex.props(form.formField)}>
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

            <div {...stylex.props(form.formField)}>
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
                <span {...stylex.props(form.fieldError)}>{pathError}</span>
              ) : (
                <span {...stylex.props(form.fieldHint)}>{t.path}</span>
              )}
            </div>

            <div {...stylex.props(form.formField)}>
              <label htmlFor={ids.projectTemplate}>{t.dialog.template}</label>
              <SelectRoot
                disabled={isCreating || templates.length === 0}
                onValueChange={(value) => value && setTemplateId(value)}
                value={templateId}
              >
                <SelectTrigger id={ids.projectTemplate}>
                  <SelectValue placeholder={t.dialog.selectTemplate} />
                  <SelectIcon>
                    <CaretDownIcon />
                  </SelectIcon>
                </SelectTrigger>
                <SelectPortal>
                  <SelectPositioner sideOffset={4}>
                    <SelectPopup>
                      <SelectList>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <SelectItemText>{template.name}</SelectItemText>
                            <SelectItemIndicator>
                              <CheckIcon />
                            </SelectItemIndicator>
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectPortal>
              </SelectRoot>
            </div>

            {error && <div {...stylex.props(form.error)}>{error}</div>}

            <div {...stylex.props(form.dialogActions)}>
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
