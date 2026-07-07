import { useEffect, useState } from "react";

/**
 * Returns true when the device/connection/user preference indicates that
 * heavy 3D animation should be skipped in favour of a static fallback.
 *
 * Signals considered:
 *  - `prefers-reduced-motion: reduce`
 *  - `navigator.hardwareConcurrency <= 4` (low CPU thread count)
 *  - `navigator.deviceMemory <= 4` GB when reported
 *  - `navigator.connection.saveData` or `effectiveType` of `2g` / `slow-2g` / `3g`
 *  - Coarse pointer + small viewport (touch phones)
 *
 * SSR-safe: returns `true` on the server so the first paint is the
 * lightweight poster; the client re-evaluates on mount.
 */
export function useLowPower(): boolean {
  const [low, setLow] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean; effectiveType?: string };
    };

    const cores = nav.hardwareConcurrency ?? 8;
    const memory = nav.deviceMemory ?? 8;
    const conn = nav.connection;
    const slowNet =
      !!conn?.saveData ||
      (conn?.effectiveType ? ["slow-2g", "2g", "3g"].includes(conn.effectiveType) : false);

    const smallTouch =
      window.matchMedia?.("(hover: none) and (pointer: coarse)").matches &&
      window.innerWidth < 640;

    const shouldSkip =
      reduceMotion || cores <= 4 || memory <= 4 || slowNet || !!smallTouch;

    setLow(shouldSkip);
  }, []);

  return low;
}
