import { isNativeMobile } from "@/lib/platform";

/** Root page wrapper: full viewport width, safe bottom inset for tab bar */
export const mobilePageShell =
  "w-full max-w-[100vw] min-h-[100dvh] overflow-x-hidden box-border pb-[calc(env(safe-area-inset-bottom)+4.5rem)] md:pb-0";

/** Top offset below fixed navbar + status bar */
export const mobileTopInset =
  "pt-[calc(env(safe-area-inset-top)+4.25rem)] md:pt-24";

/** Auth pages: full viewport scroll without bottom tab bar */
export const authPageShell =
  "flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]";

export const authPageScroll =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-6";


export const applyNativeMobileDocumentClass = (): void => {
  if (isNativeMobile()) {
    document.documentElement.classList.add("native-mobile");
  }
};
