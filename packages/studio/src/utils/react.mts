import { useCallback, useState } from "react";

export function useToggle(defaultValue?: boolean): {
  set: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
  value: boolean;
} {
  const [value, set] = useState(!!defaultValue);

  const toggle = useCallback(() => {
    set((x) => !x);
  }, []);

  return { set, toggle, value };
}
