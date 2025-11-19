// src/components/Pomodoro.jsx
import { useEffect, useRef, useState } from "react";
import { Pencil, Eye } from "lucide-react"; // Eye used for Focus

const CYCLES_BEFORE_LONG_BREAK = 4;

/* ----------------------------- Flip Digit ----------------------------- */
function Digit({ value }) {
  const [prevValue, setPrevValue] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setFlipping(true);
      const timeout = setTimeout(() => {
        setFlipping(false);
        setPrevValue(value);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [value, prevValue]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="timer"
      className="relative w-16 h-24 perspective:[1000px] mx-1 select-none"
    >
      <div
        className={[
          "absolute inset-0 rounded-xl shadow-lg",
          "flex items-center justify-center font-mono font-extrabold text-[3.2rem]",
          "bg-zinc-900 text-white border border-white/10",
          flipping ? "animate-[flipOut_0.6s_forwards] origin-bottom backface-hidden" : "",
        ].join(" ")}
      >
        {flipping ? prevValue : value}
      </div>

      {flipping && (
        <div
          className={[
            "absolute inset-0 rounded-xl shadow-lg",
            "flex items-center justify-center font-mono font-extrabold text-[3.2rem]",
            "bg-zinc-900 text-white border border-white/10",
            "animate-[flipIn_0.6s_forwards] origin-top backface-hidden",
          ].join(" ")}
        >
          {value}
        </div>
      )}

      <style>{`
        @keyframes flipOut { 0%{ transform: rotateX(0deg); } 100%{ transform: rotateX(-90deg); opacity:0; } }
        @keyframes flipIn  { 0%{ transform: rotateX(90deg); opacity:0; } 100%{ transform: rotateX(0deg); opacity:1; } }
      `}</style>
    </div>
  );
}

/* -------------------------- Circular Progress ------------------------- */
function CircularProgress({ progress }) {
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="block">
        <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx="60" cy="60" r={radius}
          stroke="currentColor"
          className="text-pink-400 dark:text-pink-300"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute text-xs text-zinc-500">{Math.round(progress)}%</div>
    </div>
  );
}

/* ----------------------------- Encouragement -------------------------- */
function encouragement(mode, pct) {
  if (mode === "work") {
    if (pct >= 75) return "Keep going — strong start!";
    if (pct >= 50) return "Nice pace. Stay with it.";
    if (pct >= 25) return "Over halfway. You’ve got this.";
    if (pct > 0)   return "Almost there — finish strong!";
    return "Done! Take a breath.";
  } else {
    if (pct >= 50) return "Breathe. Relax your shoulders.";
    if (pct >= 25) return "Stretch a little. Hydrate.";
    if (pct > 0)   return "Wrap up your break — back soon.";
    return "Break over — let’s go!";
  }
}

/* ----------------------------- Pomodoro ------------------------------- */
export default function Pomodoro({
  variant = "default",
  taskTitle: externalTitle,
  onTaskTitleChange,
  onOpenFocus,
}) {
  const isControlled = typeof externalTitle === "string" && typeof onTaskTitleChange === "function";
  const [internalTitle, setInternalTitle] = useState("");
  const taskTitle = isControlled ? externalTitle : internalTitle;
  const setTaskTitle = isControlled ? onTaskTitleChange : setInternalTitle;

  const [editingTitle, setEditingTitle] = useState(false);

  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);

  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState("work");
  const cycleCount = useRef(0);

  const [showSettings, setShowSettings] = useState(false);

  const totalSeconds =
    mode === "work"
      ? workMinutes * 60
      : mode === "break"
      ? breakMinutes * 60
      : longBreakMinutes * 60;

  const formatDigits = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return {
      min1: String(Math.floor(m / 10)),
      min2: String(m % 10),
      sec1: String(Math.floor(s / 10)),
      sec2: String(s % 10),
    };
  };

  const handleTimerEnd = () => {
    if (mode === "work") {
      cycleCount.current += 1;
      if (cycleCount.current % CYCLES_BEFORE_LONG_BREAK === 0) {
        setMode("longBreak");
        setSecondsLeft(longBreakMinutes * 60);
      } else {
        setMode("break");
        setSecondsLeft(breakMinutes * 60);
      }
    } else {
      setMode("work");
      setSecondsLeft(workMinutes * 60);
    }
    setIsRunning(false);
  };

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) {
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, mode, workMinutes, breakMinutes, longBreakMinutes]);

  useEffect(() => {
    if (mode === "work") setSecondsLeft(workMinutes * 60);
    else if (mode === "break") setSecondsLeft(breakMinutes * 60);
    else setSecondsLeft(longBreakMinutes * 60);
  }, [mode, workMinutes, breakMinutes, longBreakMinutes]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setShowSettings(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { min1, min2, sec1, sec2 } = formatDigits(secondsLeft);
  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  const handleNum = (setter, min, max) => (e) => {
    const val = e.target.value;
    if (val === "") return setter("");
    const n = parseInt(val, 10);
    if (!Number.isNaN(n)) setter(Math.max(min, Math.min(max, n)));
  };

  const modeTitle =
    mode === "work"
      ? taskTitle?.trim() || (
          <span className="inline-flex items-center gap-2">
            Work Time <Pencil size={14} />
          </span>
        )
      : mode === "break"
      ? "Short Break"
      : "Long Break";

  const reset = () => {
    setIsRunning(false);
    setMode("work");
    setSecondsLeft(workMinutes * 60);
    cycleCount.current = 0;
    setTaskTitle("");
  };

  const skip = () => handleTimerEnd();

  return (
    <section
      className={`rounded-2xl  p-5 shadow-soft ${
        variant === "focus" ? "bg-transparent shadow-none" : "bg-white/80 dark:bg-zinc-800/70"
      }`}
      aria-label="Pomodoro timer"
    >
      {/* header (hidden in focus) */}
      {variant !== "focus" && (
        <div className="flex items-center justify-between mb-5">
          <div className="min-w-0">
            {mode === "work" ? (
              <div className="flex items-center gap-2">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    placeholder="What are you working on?"
                    className="w-full max-w-xs truncate rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="text-left truncate max-w-xs cursor-pointer" 
                    title="Click to edit task"
                  >
                    <h2 className="text-xl font-extrabold tracking-tight">{modeTitle}</h2>
                  </button>
                )}
              </div>
            ) : (
              <h2 className="text-xl font-extrabold tracking-tight">{modeTitle}</h2>
            )}

            <p className="text-xs text-zinc-500 mt-1">
              {encouragement(mode, progressPercent)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-zinc-200/70 dark:bg-zinc-700/60 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              title="Edit timer durations"
            >
              <Pencil size={16} />
              <span className="text-sm">Edit</span>
            </button>
          </div>
        </div>
      )}

      {/* mode pills */}
      {variant !== "focus" && (
        <div className="flex items-center justify-center gap-2 mb-4">
          {[
            { id: "work", label: "Work" },
            { id: "break", label: "Short Break" },
            { id: "longBreak", label: "Long Break" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setIsRunning(false); }}
              className={[
                "px-3 py-1.5 rounded-lg text-sm transition cursor-pointer",
                mode === m.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-200/60 dark:bg-zinc-700/50 hover:opacity-90",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* flip clock */}
      <div className={`flex items-center justify-center ${variant === "focus" ? "scale-[1.15] md:scale-[1.25]" : ""}`}>
        <Digit value={min1} />
        <Digit value={min2} />
        <span className="mx-2 select-none text-5xl font-extrabold text-zinc-700 dark:text-zinc-200">:</span>
        <Digit value={sec1} />
        <Digit value={sec2} />
      </div>

      {/* progress ring */}
      {variant !== "focus" && (
        <div className="mt-5 flex items-center justify-center">
          <CircularProgress progress={progressPercent} />
        </div>
      )}

      {/* controls */}
      <div className="mt-5 flex items-center justify-center gap-2">
        <button
          onClick={() => setIsRunning((r) => !r)}
          aria-pressed={isRunning}
          aria-label={isRunning ? "Pause timer" : "Start timer"}
          className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-2 cursor-pointer"
        >
          <span className="text-sm font-semibold">{isRunning ? "Pause" : "Start"}</span>
        </button>

        <button
          onClick={reset}
          aria-label="Reset timer"
          className="px-4 py-2 rounded-xl bg-zinc-200/70 dark:bg-zinc-700/60 cursor-pointer"
        >
          <span className="text-sm font-medium">Reset</span>
        </button>

        <button
          onClick={skip}
          aria-label="Skip to next phase"
          className="px-4 py-2 rounded-xl bg-zinc-200/70 dark:bg-zinc-700/60 cursor-pointer"
        >
          <span className="text-sm font-medium">Skip</span>
        </button>
      </div>

      {/* Focus button on its own line */}
      {variant !== "focus" && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => onOpenFocus?.()}
            title="Open focus mode (fullscreen)"
            className="px-3 py-2 rounded-xl bg-zinc-700 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-2 cursor-pointer"
            aria-label="Enter focus mode"
          >
            <Eye size={14} />
            <span className="text-sm">Focus Mode</span>
          </button>
        </div>
      )}

      {/* cycles */}
      <div className="mt-4 text-center text-sm text-zinc-500">
        Completed Work Cycles:{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-200">
          {cycleCount.current}
        </span>
      </div>

      {/* settings modal */}
      {showSettings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pomodoro-settings-title"
          onClick={() => setShowSettings(false)}
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-black/5 dark:border-white/5"
          >
            <h3 id="pomodoro-settings-title" className="text-lg font-extrabold tracking-tight">
              Customize durations (minutes)
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="text-sm">
                <span className="block mb-1 text-zinc-600 dark:text-zinc-300">Work</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  step={1}
                  value={workMinutes}
                  onChange={handleNum(setWorkMinutes, 1, 180)}
                  disabled={isRunning}
                  className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
                />
                <small className="text-xs text-zinc-500">1–180</small>
              </label>

              <label className="text-sm">
                <span className="block mb-1 text-zinc-600 dark:text-zinc-300">Short Break</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={breakMinutes}
                  onChange={handleNum(setBreakMinutes, 1, 60)}
                  disabled={isRunning}
                  className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
                />
                <small className="text-xs text-zinc-500">1–60</small>
              </label>

              <label className="text-sm">
                <span className="block mb-1 text-zinc-600 dark:text-zinc-300">Long Break</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={longBreakMinutes}
                  onChange={handleNum(setLongBreakMinutes, 1, 60)}
                  disabled={isRunning}
                  className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
                />
                <small className="text-xs text-zinc-500">1–60</small>
              </label>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-5 w-full px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
