"use client";

import { Select } from "@base-ui/react/select";
import { CaretDownIcon, CheckIcon, PlusIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useState } from "react";

import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/Dialog.tsx";
import { IconButton } from "../ui/IconButton.tsx";
import {
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectList,
  SelectPopup,
  SelectTrigger,
} from "../ui/Select.tsx";

import {
  createProjectAction,
  loadTemplatesAction,
  type TemplateInfo,
} from "./root-actions.ts";

import styles from "./root.module.css";

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation: disallow dots in project path
  const pathHasDot = projectPath.includes(".");
  const pathError = pathHasDot
    ? "Project paths cannot contain dots. They will work during development but break during the build step."
    : null;

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
    setProjectPath("");
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
          // Refresh the page to show the new project
          window.location.reload();
        } else {
          setError(result.error ?? "Failed to create project");
        }
      } finally {
        setIsCreating(false);
      }
    },
    [name, projectPath, templateId, closeDialog],
  );

  const ids = {
    projectName: useId(),
    projectPath: useId(),
  };

  return (
    <DialogRoot onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={<IconButton title="Create a new project" variant="primary" />}
      >
        <PlusIcon />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className={styles.dialog}>
          <DialogTitle>Create New Project</DialogTitle>
          <form className={styles.dialogForm} onSubmit={handleSubmit}>
            <div className={styles.formField}>
              <label htmlFor={ids.projectName}>Project Name</label>
              <input
                autoComplete="off"
                disabled={isCreating}
                id={ids.projectName}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                required
                type="text"
                value={name}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor={ids.projectPath}>Project Path</label>
              <input
                autoComplete="off"
                disabled={isCreating}
                id={ids.projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="category/project-slug"
                required
                type="text"
                value={projectPath}
              />
              {pathError ? (
                <span className={styles.fieldError}>{pathError}</span>
              ) : (
                <span className={styles.fieldHint}>Path under app/</span>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="project-template">Template</label>
              <Select.Root
                disabled={isCreating || templates.length === 0}
                onValueChange={(value) => value && setTemplateId(value)}
                value={templateId}
              >
                <SelectTrigger id="project-template">
                  <Select.Value placeholder="Select a template" />
                  <SelectIcon>
                    <CaretDownIcon />
                  </SelectIcon>
                </SelectTrigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={4}>
                    <SelectPopup>
                      <SelectList>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <Select.ItemText>{template.name}</Select.ItemText>
                            <SelectItemIndicator>
                              <CheckIcon />
                            </SelectItemIndicator>
                          </SelectItem>
                        ))}
                      </SelectList>
                    </SelectPopup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.dialogActions}>
              <DialogClose
                disabled={isCreating}
                render={<button type="button" />}
              >
                Cancel
              </DialogClose>
              <button
                className={styles.submitButton}
                disabled={
                  isCreating ||
                  !name ||
                  !projectPath ||
                  !templateId ||
                  pathHasDot
                }
                type="submit"
              >
                {isCreating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
