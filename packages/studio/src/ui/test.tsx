import { createContext, useContext, useMemo } from "react";

interface DialogContext {
  min: number;
}

const DialogContext = createContext<DialogContext>({
  min: 0,
});

export function useDialog(): DialogContext {
  return useContext(DialogContext);
}

export function DialogProvider({ children }: { children?: React.ReactNode }) {
  const context = useMemo(
    (): DialogContext => ({
      min: 0,
    }),
    [],
  );

  return (
    <DialogContext.Provider value={context}>{children}</DialogContext.Provider>
  );
}
