import { Image as ImageIcon } from "lucide-react";

export default function Background({ options, value, onChange }) {
  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-white/80 dark:bg-zinc-800/70 backdrop-blur p-5 shadow-soft border border-black/5 dark:border-white/5 theme-panel">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl p-3 bg-zinc-100 dark:bg-zinc-900 theme-chip">
            <ImageIcon size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Backgrounds</h2>
            <p className="text-xs text-zinc-500">
              Pick a scene to keep behind Focusly. Your selection is saved automatically.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {options.map((opt) => {
          const selected = opt.id === value;
          return (
            <button
              key={opt.id}
              onClick={() => onChange?.(opt.id)}
              className={`group rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-200 theme-panel
                ${selected ? "ring-2 ring-offset-2 ring-offset-black/30 ring-white/80 dark:ring-emerald-200" : ""}
              `}
            >
              <div
                className="aspect-video w-full rounded-2xl overflow-hidden shadow-inner mb-3"
                style={{
                  backgroundImage:
                    opt.type === "gradient" ? opt.image : `${opt.image}`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: selected ? "none" : "grayscale(0.2)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{opt.label}</p>
                  <p className="text-xs text-zinc-500">{opt.description}</p>
                </div>
                <span
                  className={`text-[11px] px-2 py-1 rounded-full theme-chip ${
                    selected ? "" : "opacity-60"
                  }`}
                >
                  {selected ? "Active" : "Set"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}



