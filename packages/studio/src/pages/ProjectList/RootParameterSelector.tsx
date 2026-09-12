import * as stylex from "@stylexjs/stylex";
import { Duration } from "effect";
import { useMemo } from "react";
import Cookies from "universal-cookie";

import { useLiqvidConfig } from "#_/contexts/liqvid-config.js";
import {
  type SelectedRootParameters,
  useSelectedRootParameters,
} from "#_/contexts/selected-root-parameters.js";
import { ROOT_PARAMS_COOKIE } from "#_/cookies.js";
import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import { PlainString } from "#_/i18n/shared.mjs";
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

interface RootParameterSelectorProps {
  /** Callback when root parameter values change */
  onRootParamsChange: (params: SelectedRootParameters) => void;
}

const styles = stylex.create({
  rootParameterField: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
  },
  rootParameterLabel: {
    color: colors.grayDim,
    fontSize: text.md,
    fontWeight: 500,
    textTransform: "capitalize",
  },
  rootParameterSelector: {
    alignItems: "center",
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.xl,
    paddingBlock: spacing.md,
    paddingInline: spacing.xl,
  },
});

const cookieOptions = {
  maxAge: Duration.toSeconds(Duration.days(365)),
  path: "/",
  sameSite: "lax" as const,
};

/**
 * A row of dropdowns for selecting root parameter values.
 * Displayed at the top of the project list page.
 * Persists selection to a server-side cookie.
 */
export function RootParameterSelector({
  onRootParamsChange,
}: RootParameterSelectorProps) {
  const { rootParameters } = useLiqvidConfig();
  const selectedRootParams = useSelectedRootParameters();

  const paramEntries = useMemo(
    () =>
      Object.entries(rootParameters).filter(([, values]) => values.length > 0),
    [rootParameters],
  );

  if (paramEntries.length === 0) {
    return null;
  }

  function handleChange(paramName: string, value: string) {
    const newParams = { ...selectedRootParams, [paramName]: value };
    onRootParamsChange(newParams);

    // Persist to cookie
    const cookies = new Cookies();
    cookies.set(ROOT_PARAMS_COOKIE, JSON.stringify(newParams), cookieOptions);
  }

  return (
    <div sx={styles.rootParameterSelector}>
      {paramEntries.map(([paramName, values]) => (
        <div key={paramName} sx={styles.rootParameterField}>
          <span sx={styles.rootParameterLabel}>{paramName}</span>
          <SelectRoot
            onValueChange={(value) => handleChange(paramName, value as string)}
            value={selectedRootParams[paramName] ?? values[0]}
          >
            <SelectTrigger>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectPortal>
              <SelectPositioner sideOffset={4}>
                <SelectPopup>
                  <SelectList>
                    {values.map((value) => (
                      <SelectItem key={value} value={value}>
                        <SelectItemText>{PlainString(value)}</SelectItemText>
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
    </div>
  );
}
