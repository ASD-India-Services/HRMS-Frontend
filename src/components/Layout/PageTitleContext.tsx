import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

export interface PageTitleContextValue {
  title: ReactNode;
  setTitle: Dispatch<SetStateAction<ReactNode>>;
}

export const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function usePageTitleContext() {
  return useContext(PageTitleContext);
}
