// src/components/FocusMode.jsx
import { useEffect, useRef } from "react";

export default function FocusMode({
  open,
  onClose,
  children,
  useBrowserFullscreen = true,
}) {
  const wrapRef = useRef(null);

  // enter fullscreen on open
  useEffect(() => {
    if (!open) return;
    const el = wrapRef.current;
    const canFs =
      useBrowserFullscreen &&
      !!(el?.requestFullscreen || el?.webkitRequestFullscreen || el?.msRequestFullscreen);

    if (canFs) {
      try {
        el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.msRequestFullscreen?.();
      } catch {}
    }

  // exit fullscreen on unmount
    return () => {
      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      ) {
        try {
          document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.();
        } catch {}
      }
    };
  }, [open, useBrowserFullscreen]);

  // close on Esc & handle user-initiated fullscreen exit
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        } else {
          const el = wrapRef.current;
          el?.requestFullscreen?.() || el?.webkitRequestFullscreen?.();
        }
      }
    };

    const onFsChange = () => {
      const inFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (!inFs) onClose?.();
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-70 text-zinc-100 theme-scope overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 -z-20 theme-background-layer" aria-hidden="true" />
      

      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          Focus mode • press <span className="font-semibold">Esc</span> to exit •
          <span className="ml-1">press <span className="font-semibold">F</span> to toggle fullscreen</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl px-3 py-1.5 bg-white/10 hover:bg-white/15 cursor-pointer"
        >
          Exit
        </button>
      </div>

      {/* center content */}
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
