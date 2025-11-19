import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import FocusMode from "./components/FocusMode.jsx";
import Pomodoro from "./components/Pomodoro.jsx";
import Tasks from "./components/Tasks.jsx";
import Music from "./components/Music.jsx";
import Background from "./components/Background.jsx";
import Themes from "./components/Themes.jsx";
import { BACKGROUND_OPTIONS, THEME_OPTIONS } from "./config/themePresets.js";
import "./index.css";

const TAB_ROUTES = {
  pomodoro: "/pomodoro",
  tasks: "/tasks",
  music: "/music",
  bg: "/backgrounds",
  themes: "/themes",
};

const DEFAULT_TAB = "pomodoro";

const matchTabFromPath = (path) => {
  const entry = Object.entries(TAB_ROUTES).find(([, route]) => {
    if (route === "/") return path === "/";
    return path === route || path.startsWith(`${route}/`);
  });
  return entry?.[0] ?? null;
};

const getStoredValue = (key, fallback) => {
  try {
    if (typeof window === "undefined") return fallback;
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [focusOpen, setFocusOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [backgroundId, setBackgroundId] = useState(() => getStoredValue("focusly:bg", "none"));
  const [themeId, setThemeId] = useState(() => getStoredValue("focusly:theme", "dark-default"));

  const currentTheme = useMemo(() => THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0], [themeId]);
  const currentBackground = useMemo(
    () => BACKGROUND_OPTIONS.find((b) => b.id === backgroundId) || BACKGROUND_OPTIONS[0],
    [backgroundId]
  );

  const activeTab = matchTabFromPath(location.pathname) ?? DEFAULT_TAB;

  useEffect(() => {
    const isKnownRoute = Boolean(matchTabFromPath(location.pathname));
    if (!isKnownRoute) {
      navigate(TAB_ROUTES[DEFAULT_TAB], { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handle = () => {
      if (window.innerWidth < 768) setIsCollapsed(false);
      else setIsCollapsed(true);
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  useEffect(() => {
    localStorage.setItem("focusly:bg", backgroundId);
    const root = document.documentElement;
    root.style.setProperty("--app-bg-image", currentBackground.image || "none");
    root.setAttribute("data-bg", currentBackground.id);
  }, [backgroundId, currentBackground]);

  useEffect(() => {
    localStorage.setItem("focusly:theme", themeId);
  }, [themeId]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", currentTheme.mode === "dark");
    root.setAttribute("data-theme", currentTheme.id);
    Object.entries(currentTheme.palette).forEach(([token, value]) => {
      root.style.setProperty(`--app-${token}`, value);
    });
  }, [currentTheme]);

  return (
    <div
      className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 theme-scope"
      style={{
        backgroundColor: "var(--app-surface)",
        color: "var(--app-text)",
      }}
    >
      <div className="fixed inset-0 -z-10 theme-background-layer" aria-hidden="true" />

      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        activeTab={activeTab}
        onSelectTab={(tabId) => {
          const route = TAB_ROUTES[tabId] ?? TAB_ROUTES[DEFAULT_TAB];
          if (location.pathname !== route) navigate(route);
        }}
      />

      <main
        className={`pt-4 px-4 transition-all pl-64 
        ${isCollapsed ? "md:pl-20" : "md:pl-72"}`}
      >
        <div className="max-w-5xl mx-auto space-y-4">

          {/* Pomodoro main tab */}
          {activeTab === "pomodoro" && (
            <Pomodoro
              taskTitle={taskTitle}
              onTaskTitleChange={setTaskTitle}
              onOpenFocus={() => setFocusOpen(true)}
            />
          )}

          {/* Tasks tab */}
          {activeTab === "tasks" && (
            <Tasks
              onFocusTask={(task) => {
                setTaskTitle(task.title);
                navigate(TAB_ROUTES.pomodoro);
                setFocusOpen(true);
              }}
            />
          )}

          {/* Music tab (keep mounted so audio persists) */}
          <section
            className={activeTab === "music" ? "block" : "hidden"}
            aria-hidden={activeTab !== "music"}
          >
            <Music isVisible={activeTab === "music"} />
          </section>

          {activeTab === "bg" && (
            <Background
              options={BACKGROUND_OPTIONS}
              value={backgroundId}
              onChange={setBackgroundId}
            />
          )}

          {activeTab === "themes" && (
            <Themes
              options={THEME_OPTIONS}
              value={themeId}
              onChange={setThemeId}
            />
          )}
        </div>
      </main>

      {/* Single FocusMode overlay */}
      <FocusMode
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        useBrowserFullscreen={true}
      >
        <Pomodoro
          variant="focus"
          taskTitle={taskTitle}
          onTaskTitleChange={setTaskTitle}
        />
      </FocusMode>
    </div>
  );
}
