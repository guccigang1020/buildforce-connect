import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const mod = require("react-is/cjs/react-is.development.js");
export default mod;
export const {
  typeOf, isValidElementType, isElement, isFragment, isPortal, isProfiler,
  isStrictMode, isSuspense, isSuspenseList, isContextConsumer, isContextProvider,
  isForwardRef, isLazy, isMemo, isAsyncMode, isConcurrentMode, AsyncMode,
  ConcurrentMode, ContextConsumer, ContextProvider, Element, ForwardRef, Fragment,
  Lazy, Memo, Portal, Profiler, StrictMode, Suspense, SuspenseList
} = mod;
