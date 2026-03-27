"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { IconButton } from "../ui/IconButton";

import {
  createProjectAction,
  loadTemplatesAction,
  type TemplateInfo,
} from "./root-actions";

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
          setTemplateId(defaultTemplate?.id ?? loadedTemplates[0].id);
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

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger
        render={<IconButton title="Create a new project" variant="primary" />}
      >
        <Plus />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.dialogOverlay} />
        <Dialog.Popup className={styles.dialog}>
          <Dialog.Title className={styles.dialogTitle}>
            Create New Project
          </Dialog.Title>
          <form className={styles.dialogForm} onSubmit={handleSubmit}>
            <div className={styles.formField}>
              <label htmlFor="project-name">Project Name</label>
              <input
                autoComplete="off"
                disabled={isCreating}
                id="project-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                required
                type="text"
                value={name}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="project-path">Project Path</label>
              <input
                autoComplete="off"
                disabled={isCreating}
                id="project-path"
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
                <Select.Trigger
                  className={styles.selectTrigger}
                  id="project-template"
                >
                  <Select.Value placeholder="Select a template" />
                  <Select.Icon className={styles.selectIcon}>
                    <ChevronDown />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={4}>
                    <Select.Popup className={styles.selectContent}>
                      <Select.List className={styles.selectViewport}>
                        {templates.map((template) => (
                          <Select.Item
                            className={styles.selectItem}
                            key={template.id}
                            value={template.id}
                          >
                            <Select.ItemText>{template.name}</Select.ItemText>
                            <Select.ItemIndicator
                              className={styles.selectItemIndicator}
                            >
                              <Check />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.dialogActions}>
              <Dialog.Close
                className={styles.cancelButton}
                disabled={isCreating}
                render={<button type="button" />}
              >
                Cancel
              </Dialog.Close>
              <button
                className={styles.submitButton}
                disabled={
                  isCreating || !name || !projectPath || !templateId || pathHasDot
                }
                type="submit"
              >
                {isCreating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
