"use client";

import type { ParameterConfig, ParameterValues } from "@liqvid/schemas";
import * as stylex from "@stylexjs/stylex";
import type { RelativeDir } from "effect-paths";
import { useEffect, useMemo, useReducer } from "react";

import {
  colors,
  dims,
  rounded,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex";
import {
  type LocalizedReactNode,
  type LocalizedString,
  PlainString,
} from "#_/i18n/shared";

import { Button } from "./Button.tsx";
import {
  DialogActions,
  DialogClose,
  DialogPopup,
  DialogTitle,
} from "./Dialog.tsx";
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
} from "./Select.tsx";
import { TextField } from "./TextField.tsx";

export type WorkspaceProjects = {
  projects: readonly {
    path: RelativeDir;
    parameters?: ParameterConfig;
  }[];
  rootParameters: ParameterConfig;
};

type WorkspaceProject = WorkspaceProjects["projects"][number];
type ProjectTreeNode = {
  children: ProjectTreeNode[];
  key: string;
  name: string;
  project?: WorkspaceProject;
};

export type CopySavedStateDialogLabels = {
  cancel: LocalizedReactNode;
  copy: LocalizedReactNode;
  copyFailed: LocalizedString;
  copySavedState: LocalizedReactNode;
  loadingProjects: LocalizedReactNode;
  noMatchingProjects: LocalizedReactNode;
  parameters: LocalizedReactNode;
  searchProjects: LocalizedString;
  workspaceProjects: LocalizedReactNode;
};

const styles = stylex.create({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
    minWidth: "min(36rem, 85vw)",
  },
  error: {
    color: colors.destroy,
    margin: spacing.zero,
  },
  fileTree: {
    borderColor: colors.graySep,
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    maxHeight: "18rem",
    minHeight: "8rem",
    overflow: "auto",
    padding: spacing.sm,
  },
  legend: {
    color: colors.secondary,
    fontSize: text.sm,
    paddingInline: spacing.sm,
  },
  loading: { color: colors.secondary, margin: spacing.md },
  noResults: { color: colors.secondary, margin: spacing.md },
  parameterField: { alignItems: "center", display: "flex", gap: spacing.md },
  parameterLabel: {
    color: colors.secondary,
    fontSize: text.sm,
    textTransform: "capitalize",
  },
  parameters: {
    alignItems: "center",
    borderColor: colors.graySep,
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
    flexWrap: "wrap",
    gap: spacing.lg,
    padding: spacing.md,
  },
  projectLabel: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.grayHover,
      default: colors.transparent,
    },
    borderRadius: rounded.sm,
    cursor: "pointer",
    display: "flex",
    fontFamily: typeface.mono,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  projectList: {
    listStyle: "none",
    margin: spacing.zero,
    padding: spacing.zero,
  },
  treeChildren: {
    borderInlineStartColor: colors.graySep,
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: dims.sep,
    listStyle: "none",
    marginInlineStart: spacing.lg,
    paddingInlineStart: spacing.sm,
  },
  treeItem: { margin: spacing.zero, padding: spacing.zero },
});

type CopyDialogState = {
  copying: boolean;
  error: string | null;
  expandedFolders: ReadonlySet<string>;
  loading: boolean;
  query: string;
  selectedParams: ParameterValues;
  selectedPath: RelativeDir;
  workspace: WorkspaceProjects | null;
};

type CopyDialogAction =
  | { error: string; kind: "copyError" }
  | { kind: "copyEnd" }
  | { kind: "copyStart" }
  | {
      expandedFolders: ReadonlySet<string>;
      kind: "loaded";
      workspace: WorkspaceProjects;
    }
  | { error: string; kind: "loadError" }
  | { kind: "open"; params: ParameterValues; projectPath: RelativeDir }
  | { key: string; kind: "toggleFolder" }
  | { key: string; kind: "param"; value: string }
  | { kind: "query"; value: string }
  | { kind: "selectProject"; params: ParameterValues; path: RelativeDir };

function copyDialogReducer(
  state: CopyDialogState,
  action: CopyDialogAction,
): CopyDialogState {
  switch (action.kind) {
    case "copyEnd": {
      return { ...state, copying: false };
    }
    case "copyError": {
      return { ...state, copying: false, error: action.error };
    }
    case "copyStart": {
      return { ...state, copying: true, error: null };
    }
    case "loaded": {
      return {
        ...state,
        expandedFolders: action.expandedFolders,
        loading: false,
        workspace: action.workspace,
      };
    }
    case "loadError": {
      return { ...state, error: action.error, loading: false };
    }
    case "open": {
      return {
        ...state,
        error: null,
        loading: true,
        query: "",
        selectedParams: action.params,
        selectedPath: action.projectPath,
      };
    }
    case "param": {
      return {
        ...state,
        selectedParams: { ...state.selectedParams, [action.key]: action.value },
      };
    }
    case "query": {
      return { ...state, query: action.value };
    }
    case "selectProject": {
      return {
        ...state,
        selectedParams: action.params,
        selectedPath: action.path,
      };
    }
    case "toggleFolder": {
      const next = new Set(state.expandedFolders);
      if (next.has(action.key)) {
        next.delete(action.key);
      } else {
        next.add(action.key);
      }
      return { ...state, expandedFolders: next };
    }
  }
}

export function CopySavedStateDialog({
  currentParams,
  currentProjectPath,
  labels,
  loadProjects,
  onClose,
  onCopy,
  open,
}: {
  currentParams: ParameterValues;
  currentProjectPath: RelativeDir;
  labels: CopySavedStateDialogLabels;
  loadProjects: () => Promise<WorkspaceProjects>;
  onClose: () => void;
  onCopy: (
    targetPath: RelativeDir,
    targetParams: ParameterValues,
  ) => Promise<void>;
  open: boolean;
}) {
  const [state, dispatch] = useReducer(
    copyDialogReducer,
    { params: currentParams, projectPath: currentProjectPath },
    ({ params, projectPath }) => ({
      copying: false,
      error: null,
      expandedFolders: new Set<string>(),
      loading: false,
      query: "",
      selectedParams: params,
      selectedPath: projectPath,
      workspace: null,
    }),
  );
  const {
    copying,
    error,
    expandedFolders,
    loading,
    query,
    selectedParams,
    selectedPath,
    workspace,
  } = state;

  useEffect(() => {
    if (!open) {
      return;
    }
    dispatch({
      kind: "open",
      params: currentParams,
      projectPath: currentProjectPath,
    });
    loadProjects()
      .then((projects) => {
        dispatch({
          expandedFolders: getFolderKeys(buildProjectTree(projects.projects)),
          kind: "loaded",
          workspace: projects,
        });
      })
      .catch((loadError: unknown) => {
        dispatch({
          error:
            loadError instanceof Error
              ? loadError.message
              : "Failed to load workspace projects",
          kind: "loadError",
        });
      });
  }, [currentParams, currentProjectPath, loadProjects, open]);

  const selectedProject = workspace?.projects.find(
    ({ path }) => path === selectedPath,
  );
  const parameters = useMemo(
    () =>
      workspace
        ? getProjectParameters(
            selectedPath,
            workspace.rootParameters,
            selectedProject?.parameters,
          )
        : {},
    [selectedPath, selectedProject?.parameters, workspace],
  );
  const filteredProjects = useMemo(() => {
    if (!workspace) {
      return [];
    }
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? workspace.projects.filter(({ path }) =>
          path.toLocaleLowerCase().includes(normalizedQuery),
        )
      : workspace.projects;
  }, [query, workspace]);
  const tree = useMemo(
    () => buildProjectTree(filteredProjects),
    [filteredProjects],
  );

  const selectProject = (project: WorkspaceProject) => {
    const definitions = getProjectParameters(
      project.path,
      workspace?.rootParameters ?? {},
      project.parameters,
    );
    const params = Object.fromEntries(
      Object.entries(definitions)
        .filter(([, values]) => values.length > 0)
        .map(([key, values]) => [
          key,
          values.includes(selectedParams[key] ?? "")
            ? selectedParams[key]!
            : values[0]!,
        ]),
    );
    dispatch({ kind: "selectProject", params, path: project.path });
  };

  const performCopy = async () => {
    if (!selectedProject) {
      return;
    }
    dispatch({ kind: "copyStart" });
    try {
      const targetParams = Object.fromEntries(
        Object.entries(parameters)
          .filter(([, values]) => values.length > 0)
          .map(([key, values]) => [key, selectedParams[key] ?? values[0]!]),
      );
      await onCopy(selectedProject.path, targetParams);
      onClose();
    } catch (copyError) {
      dispatch({
        error:
          copyError instanceof Error ? copyError.message : labels.copyFailed,
        kind: "copyError",
      });
    } finally {
      dispatch({ kind: "copyEnd" });
    }
  };

  return (
    <DialogPopup aria-describedby={undefined} size="medium">
      <DialogTitle>{labels.copySavedState}</DialogTitle>
      <DialogClose />
      <div {...stylex.props(styles.content)}>
        <TextField
          aria-label={labels.searchProjects}
          onChange={(value) => dispatch({ kind: "query", value })}
          placeholder={PlainString(labels.searchProjects)}
          value={query}
        />
        <fieldset {...stylex.props(styles.fileTree)}>
          <legend {...stylex.props(styles.legend)}>
            {labels.workspaceProjects}
          </legend>
          {loading ? (
            <p {...stylex.props(styles.loading)}>{labels.loadingProjects}</p>
          ) : tree.length > 0 ? (
            <ul {...stylex.props(styles.projectList)}>
              {tree.map((node) => (
                <ProjectTreeItem
                  expandedFolders={expandedFolders}
                  key={node.key}
                  node={node}
                  onFolderToggle={(key) =>
                    dispatch({ key, kind: "toggleFolder" })
                  }
                  onSelect={selectProject}
                  selectedPath={selectedPath}
                />
              ))}
            </ul>
          ) : (
            <p {...stylex.props(styles.noResults)}>
              {labels.noMatchingProjects}
            </p>
          )}
        </fieldset>
        {Object.entries(parameters).some(([, values]) => values.length > 0) && (
          <fieldset {...stylex.props(styles.parameters)}>
            <legend {...stylex.props(styles.legend)}>
              {labels.parameters}
            </legend>
            {Object.entries(parameters)
              .filter(([, values]) => values.length > 0)
              .map(([key, values]) => (
                <div key={key} {...stylex.props(styles.parameterField)}>
                  <span {...stylex.props(styles.parameterLabel)}>{key}</span>
                  <SelectRoot
                    onValueChange={(value) =>
                      dispatch({
                        key,
                        kind: "param",
                        value: value as string,
                      })
                    }
                    value={selectedParams[key] ?? values[0]}
                  >
                    <SelectTrigger size="small">
                      <SelectValue />
                      <SelectIcon />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner sideOffset={4}>
                        <SelectPopup>
                          <SelectList>
                            {values.map((value) => (
                              <SelectItem key={value} value={value}>
                                <SelectItemText>
                                  {PlainString(value)}
                                </SelectItemText>
                                <SelectItemIndicator />
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </SelectRoot>
                </div>
              ))}
          </fieldset>
        )}
        {error && (
          <p role="alert" {...stylex.props(styles.error)}>
            {error}
          </p>
        )}
        <DialogActions>
          <Button disabled={copying} onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button
            disabled={copying || loading || !selectedProject}
            kind="primary"
            onClick={performCopy}
          >
            {labels.copy}
          </Button>
        </DialogActions>
      </div>
    </DialogPopup>
  );
}

function ProjectTreeItem({
  expandedFolders,
  node,
  onFolderToggle,
  onSelect,
  selectedPath,
}: {
  expandedFolders: ReadonlySet<string>;
  node: ProjectTreeNode;
  onFolderToggle: (key: string) => void;
  onSelect: (project: WorkspaceProject) => void;
  selectedPath: RelativeDir;
}) {
  const expanded = expandedFolders.has(node.key);
  const hasChildren = node.children.length > 0;
  return (
    <li {...stylex.props(styles.treeItem)}>
      {hasChildren && (
        <Button
          aria-expanded={expanded}
          kind="ghost"
          onClick={() => onFolderToggle(node.key)}
          size="small"
        >
          <span aria-hidden="true">{PlainString(expanded ? "▾" : "▸")}</span>
          {PlainString(node.name)}
        </Button>
      )}
      {node.project && (
        <label {...stylex.props(styles.projectLabel)}>
          {/* biome-ignore lint/correctness/noRestrictedElements: native radio semantics are needed for this project picker */}
          <input
            checked={selectedPath === node.project.path}
            name="copy-target-project"
            onChange={() => onSelect(node.project!)}
            type="radio"
          />
          {node.name}
        </label>
      )}
      {hasChildren && expanded && (
        <ul {...stylex.props(styles.treeChildren)}>
          {node.children.map((child) => (
            <ProjectTreeItem
              expandedFolders={expandedFolders}
              key={child.key}
              node={child}
              onFolderToggle={onFolderToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function buildProjectTree(
  projects: readonly WorkspaceProject[],
): ProjectTreeNode[] {
  const root: ProjectTreeNode = { children: [], key: "", name: "" };
  for (const project of projects) {
    let current = root;
    for (const segment of project.path.split("/").filter(Boolean)) {
      let child = current.children.find(
        (candidate) => candidate.name === segment,
      );
      if (!child) {
        child = {
          children: [],
          key: current.key ? `${current.key}/${segment}` : segment,
          name: segment,
        };
        current.children.push(child);
      }
      current = child;
    }
    current.project = project;
  }
  const sortChildren = (nodes: ProjectTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };
  sortChildren(root.children);
  return root.children;
}

function getFolderKeys(nodes: readonly ProjectTreeNode[]): Set<string> {
  const keys = new Set<string>();
  for (const node of nodes) {
    if (node.children.length > 0) {
      keys.add(node.key);
      for (const key of getFolderKeys(node.children)) {
        keys.add(key);
      }
    }
  }
  return keys;
}

function getProjectParameters(
  projectPath: RelativeDir,
  rootParameters: ParameterConfig,
  projectParameters?: ParameterConfig,
): ParameterConfig {
  return Object.fromEntries(
    Array.from(projectPath.matchAll(/\[([^\]]+)\]/g), ([, name]) => [
      name!,
      projectParameters?.[name!] ?? rootParameters[name!] ?? [],
    ]),
  );
}
