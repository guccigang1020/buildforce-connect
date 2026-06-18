import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Lets a deep page (e.g. the project workspace) supply a human label for the
// last breadcrumb crumb instead of a raw id in the URL. Provider sits at the
// root so both AppBreadcrumbs and any page are inside it.
type Ctx = { label: string | null; setLabel: (l: string | null) => void };
const PageCrumbContext = createContext<Ctx>({ label: null, setLabel: () => {} });

export function PageCrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return (
    <PageCrumbContext.Provider value={{ label, setLabel }}>{children}</PageCrumbContext.Provider>
  );
}

export function usePageCrumb() {
  return useContext(PageCrumbContext);
}

/** Mount inside a page to set the last breadcrumb label; clears on unmount. */
export function SetPageCrumb({ label }: { label: string | null }) {
  const { setLabel } = usePageCrumb();
  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
  return null;
}
