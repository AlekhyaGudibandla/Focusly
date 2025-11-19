import { useRef } from "react";
import {
  Hourglass as Logo,
  Timer,
  CheckSquare,
  Music2,
  Palette,
  Image as ImageIcon,
} from "lucide-react";

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  activeTab,
  onSelectTab,
}) {
  const items = [
    { id: "pomodoro", label: "Pomodoro", icon: <Timer size={18} /> },
    { id: "tasks", label: "Tasks", icon: <CheckSquare size={18} /> },
    { id: "music", label: "Music", icon: <Music2 size={18} /> },
    { id: "bg", label: "Background", icon: <ImageIcon size={18} /> },
    { id: "themes", label: "Themes", icon: <Palette size={18} /> },
  ];

  const base =
    "h-screen bg-white/80 dark:bg-zinc-900/80 backdrop-blur shadow-lg border-r border-black/5 dark:border-white/5";
  const wide = "w-64";
  const mini = "w-16";

  const leaveTimer = useRef(null);

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (window.innerWidth >= 768) setIsCollapsed(false);
  };

  const handleLeave = () => {
    if (window.innerWidth >= 768) {
      leaveTimer.current = setTimeout(() => setIsCollapsed(true), 160);
    }
  };

  return (
    <aside
      role="navigation"
      aria-label="Main"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`fixed z-50 top-0 left-0 h-screen transition-all ${base}
        ${isCollapsed ? mini : wide}
      `}
      style={{ transitionProperty: "width, transform" }}
    >
      {/* Header row: add more top padding */}
      <div className="flex items-center justify-between px-3 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Logo className="w-7 h-7 shrink-0 ml-[5px]" />
          <span
            className={`hidden md:inline font-bold
              ${isCollapsed ? "opacity-0 invisible -translate-x-2" : "opacity-100 visible translate-x-0"}
              transition-all text-xl`}
          >
            Focusly
          </span>
        </div>

        <button
          className="hidden md:inline-flex p-2 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer"
          onClick={() => setIsCollapsed((v) => !v)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          title="Hover to expand; click to pin/unpin"
        ></button>
      </div>

      {/* Nav items — more gap between logo and items, and between items */}
      <nav className="mt-6 space-y-2 px-2">
        {items.map((it) => {
          const active = it.id === activeTab;
          return (
            <button
              key={it.id}
              onClick={() => onSelectTab(it.id)}
              className={`w-full flex items-center rounded-xl px-3 py-2.5 transition cursor-pointer
                ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                }
              `}
              aria-current={active ? "page" : undefined}
            >
              <div className="shrink-0">{it.icon}</div>
              <span
                className={`ml-3 text-sm hidden md:inline transition-all whitespace-nowrap
                  ${isCollapsed ? "opacity-0 invisible -translate-x-2" : "opacity-100 visible translate-x-0"}
                `}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
