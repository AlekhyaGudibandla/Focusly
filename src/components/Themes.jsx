import { Palette } from "lucide-react";

export default function Themes({ options, value, onChange }) {
  const grouped = options.reduce(
    (acc, opt) => {
      acc[opt.mode === "dark" ? "dark" : "light"].push(opt);
      return acc;
    },
    { dark: [], light: [] }
  );

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white/80 dark:bg-zinc-800/70 backdrop-blur p-5 shadow-soft border border-black/5 dark:border-white/5 theme-panel">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl p-3 bg-zinc-100 dark:bg-zinc-900 theme-chip">
            <Palette size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Themes</h2>
            <p className="text-xs text-zinc-500">
              Switch the color palette for every surface. Default is Midnight Neon (dark).
            </p>
          </div>
        </div>
      </header>

      {[
        ["Dark palettes", grouped.dark],
        ["Light palettes", grouped.light],
      ].map(([groupName, list]) => (
        <div key={groupName} className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-zinc-500">{groupName}</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((theme) => {
              const selected = theme.id === value;
              return (
                <button
                  key={theme.id}
                  onClick={() => onChange?.(theme.id)}
                  className={`group rounded-2xl border border-black/5 dark:border-white/5 bg-white/80 dark:bg-zinc-800/70 backdrop-blur p-4 text-left transition theme-panel
                    ${
                      selected
                        ? "ring-2 ring-offset-2 ring-offset-black/30 ring-white/80 dark:ring-sky-200"
                        : ""
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold">{theme.name}</p>
                      <p className="text-xs text-zinc-500 capitalize">{theme.mode} mode</p>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-1 rounded-full theme-chip ${
                        selected ? "" : "opacity-70"
                      }`}
                    >
                      {selected ? "Active" : "Apply"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {["surface", "panel", "accent"].map((token) => (
                      <span
                        key={token}
                        className="h-12 w-full rounded-xl shadow-inner border border-white/5"
                        style={{
                          background:
                            token === "panel"
                              ? `${theme.palette[token]}`
                              : token === "accent"
                              ? theme.palette.accent
                              : theme.palette.surface,
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}




