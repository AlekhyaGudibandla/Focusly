// src/components/Tasks.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Star, StarOff, Plus, Calendar, Tag, CheckCircle2, Circle, AlertTriangle,
  Search, Filter, Trash2, Edit3, Play, ChevronDown, ChevronUp, X, GripVertical
} from "lucide-react";

/* ----------------------------- helpers ----------------------------- */
const PRIOS = ["low", "medium", "high", "urgent"];
const STATUSES = ["todo", "doing", "done"];

const PRIO_STYLE = {
  low:    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  medium: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
  high:   "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  urgent: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200",
};

const STATUS_ICON = {
  todo:  Circle,
  doing: AlertTriangle,
  done:  CheckCircle2,
};

const id = () => crypto.randomUUID?.() || String(Date.now() + Math.random());

function useLocalStorage(key, initial) {
  const [v, setV] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
}

const TAG_PALETTE = [
  ["bg-violet-100 text-violet-900","dark:bg-violet-900/30 dark:text-violet-200"],
  ["bg-fuchsia-100 text-fuchsia-900","dark:bg-fuchsia-900/30 dark:text-fuchsia-200"],
  ["bg-sky-100 text-sky-900","dark:bg-sky-900/30 dark:text-sky-200"],
  ["bg-teal-100 text-teal-900","dark:bg-teal-900/30 dark:text-teal-200"],
  ["bg-lime-100 text-lime-900","dark:bg-lime-900/30 dark:text-lime-200"],
  ["bg-orange-100 text-orange-900","dark:bg-orange-900/30 dark:text-orange-200"],
];
const tagClass = (t) => {
  const h = [...t].reduce((a,c)=>a + c.charCodeAt(0), 0);
  const [a,b] = TAG_PALETTE[h % TAG_PALETTE.length];
  return `${a} ${b}`;
};

// section key helper
function sectionKey(t) {
  if (t.status === "done") return "done";
  const today = dayStart(new Date());
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
  const due = t.dueDate ? dayStart(new Date(t.dueDate)) : null;
  if (due && due.getTime() === today.getTime()) return "today";
  if (due && due > today && due < weekEnd) return "week";
  return "later";
}

/* ----------------------------- main ----------------------------- */
export default function Tasks({ onFocusTask }) {
  const [items, setItems] = useLocalStorage("tasks:items", []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todo");
  const [prioFilter, setPrioFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [showCompleted, setShowCompleted] = useState(false);
  const [collapsed, setCollapsed] = useLocalStorage("tasks:collapsed", false);

  // quick add
  const [title, setTitle] = useState("");
  const [newPrio, setNewPrio] = useState("medium");
  const [newDue, setNewDue] = useState("");
  const [newTags, setNewTags] = useState("");

  // editor modal
  const [editing, setEditing] = useState(null);

  // dnd
  const dragFromId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  /* ------------- derive tag list, stats, filtered list ------------- */
  const allTags = useMemo(() => {
    const s = new Set();
    items.forEach(t => (t.tags || []).forEach(tag => s.add(tag)));
    return ["all", ...Array.from(s).sort()];
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(t => t.status === "done").length;
    const doing = items.filter(t => t.status === "doing").length;
    const todo = total - done - doing;
    const overdue = items.filter(t => t.dueDate && t.status !== "done" && new Date(t.dueDate) < dayStart(new Date())).length;
    return { total, done, doing, todo, overdue };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items.slice();

    // tabs (status)
    list = list.filter(t => (status === "done" ? t.status === "done" : t.status !== "done"))
               .filter(t => (status === "doing" ? t.status === "doing" : true))
               .filter(t => (status === "todo" ? t.status === "todo" : true));

    if (prioFilter !== "all") list = list.filter(t => t.priority === prioFilter);
    if (tagFilter !== "all") list = list.filter(t => (t.tags || []).includes(tagFilter));

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.notes || "").toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (!showCompleted && status !== "done") list = list.filter(t => t.status !== "done");

    // sort
    list.sort((a, b) => {
      if (sortBy === "priority") {
        const pa = PRIOS.indexOf(a.priority), pb = PRIOS.indexOf(b.priority);
        if (pa !== pb) return pb - pa;
        if (a.starred !== b.starred) return (b.starred?1:0) - (a.starred?1:0);
      }
      if (sortBy === "due") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (da !== db) return da - db;
      }
      const ca = (a.createdAt || 0), cb = (b.createdAt || 0);
      if (cb !== ca) return cb - ca;
      return (a.order ?? 0) - (b.order ?? 0);
    });

    return list;
  }, [items, status, prioFilter, tagFilter, query, sortBy, showCompleted]);

  // group by section
  const sections = useMemo(() => {
    const group = { today: [], week: [], later: [], done: [] };
    filtered.forEach(t => group[sectionKey(t)].push(t));
    return group;
  }, [filtered]);

  /* ----------------------------- actions ----------------------------- */
  const addTask = () => {
    const t = title.trim();
    if (!t) return;
    const tags = splitTags(newTags);
    setItems(prev => [
      {
        id: id(),
        title: t,
        notes: "",
        status: "todo",
        priority: newPrio,
        starred: false,
        dueDate: newDue || "",
        tags,
        estPoms: 1,
        donePoms: 0,
        subtasks: [],
        createdAt: Date.now(),
        order: (prev[0]?.order ?? 0) + 1,
      },
      ...prev,
    ]);
    setTitle(""); setNewDue(""); setNewTags(""); setNewPrio("medium");
  };

  const toggleStar = (tid) =>
    setItems(prev => prev.map(t => t.id === tid ? { ...t, starred: !t.starred } : t));

  const changeStatus = (tid, next) =>
    setItems(prev => prev.map(t => t.id === tid ? { ...t, status: next } : t));

  const toggleDone = (tid) =>
    setItems(prev => prev.map(t => t.id === tid ? { ...t, status: t.status === "done" ? "todo" : "done" } : t));

  const deleteTask = (tid) =>
    setItems(prev => prev.filter(t => t.id !== tid));

  const saveEdit = (draft) =>
    setItems(prev => prev.map(t => t.id === draft.id ? { ...t, ...draft } : t));

  const markAllDone = () =>
    setItems(prev => prev.map(t => ({ ...t, status: "done" })));

  const clearDone = () =>
    setItems(prev => prev.filter(t => t.status !== "done"));

  // subtasks
  const toggleSubtask = (tid, sid) =>
    setItems(prev => prev.map(t => {
      if (t.id !== tid) return t;
      const subs = (t.subtasks || []).map(s => s.id === sid ? { ...s, done: !s.done } : s);
      return { ...t, subtasks: subs };
    }));

  const addSubtask = (tid, title) =>
    setItems(prev => prev.map(t => {
      if (t.id !== tid) return t;
      const subs = [...(t.subtasks || []), { id: id(), title: title.trim(), done: false }];
      return { ...t, subtasks: subs };
    }));

  const deleteSubtask = (tid, sid) =>
    setItems(prev => prev.map(t => {
      if (t.id !== tid) return t;
      return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== sid) };
    }));

  /* ----------------------------- DnD logic (fixed) ----------------------------- */
  const onDragStart = (tid) => (e) => {
    dragFromId.current = tid;
    e.dataTransfer.setData("text/plain", tid);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (overTid) => (e) => {
    e.preventDefault(); // REQUIRED so drop fires
    setDragOverId(overTid);
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (overTid) => (e) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain") || dragFromId.current;
    setDragOverId(null);
    dragFromId.current = null;
    if (!fromId || fromId === overTid) return;

    setItems(prev => {
      const a = prev.find(t => t.id === fromId);
      const b = prev.find(t => t.id === overTid);
      if (!a || !b) return prev;

      // only reorder inside same section
      if (sectionKey(a) !== sectionKey(b)) return prev;

      // place a just before b by giving intermediate order
      const updated = prev.map(t => t.id === a.id ? { ...t, order: (b.order ?? 0) - 0.5 } : t);

      // normalize *within that section* to 1..n
      const sec = sectionKey(a);
      const normalized = updated
        .map(t => ({ ...t }))
        .sort((x,y)=> (x.order ?? 0) - (y.order ?? 0))
        .map((t,i)=> {
          if (sectionKey(t) !== sec) return t;
          return { ...t, order: (t.order ?? 0) < Infinity ? i+1 : i+1 };
        });

      return normalized;
    });
  };
  const onDragEnd = () => setDragOverId(null);

  /* ----------------------------- ui ----------------------------- */
  return (
    <section className="space-y-4">
      {/* header + stats */}
      <div className="rounded-2xl bg-white/80 dark:bg-zinc-800/70 backdrop-blur p-4 shadow-soft border border-black/5 dark:border-white/5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Tasks</h2>
            <p className="text-xs text-zinc-500">plan it • focus it • finish it</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <StatPill label="Total" value={stats.total} />
            <StatPill label="Todo" value={stats.todo} />
            <StatPill label="Doing" value={stats.doing} />
            <StatPill label="Done" value={stats.done} />
            {stats.overdue > 0 && <StatPill label="Overdue" value={stats.overdue} tone="warn" />}
          </div>
        </div>

        {/* quick add */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Add a task..."
            className="md:col-span-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2 outline-none"
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <select
            value={newPrio}
            onChange={e => setNewPrio(e.target.value)}
            className="rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2 outline-none"
          >
            {PRIOS.map(p => <option key={p} value={p}>{cap(p)} priority</option>)}
          </select>
          <input
            type="date"
            value={newDue}
            onChange={e => setNewDue(e.target.value)}
            className="rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2 outline-none"
          />
          <input
            value={newTags}
            onChange={e => setNewTags(e.target.value)}
            placeholder="tags (comma)"
            className="rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2 outline-none"
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <div className="md:col-span-5 flex justify-end">
            <button
              onClick={addTask}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
            >
              <Plus size={16}/> Add
            </button>
          </div>
        </div>
      </div>

      {/* filters bar */}
      <div className="rounded-2xl bg-white/80 dark:bg-zinc-800/70 backdrop-blur p-3 shadow-soft border border-black/5 dark:border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={status} onChange={setStatus} items={[
            {id:"todo", label:"Todo"},
            {id:"doing", label:"Doing"},
            {id:"done", label:"Done"},
          ]} />

          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2 ml-auto">
            <Search size={16} className="opacity-70"/>
            <input
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Search…"
              className="bg-transparent outline-none text-sm w-40 md:w-56"
            />
          </div>

          <Dropdown label="Priority" icon={<Filter size={14}/>}>
            <MenuItem active={prioFilter==="all"} onClick={()=>setPrioFilter("all")}>All</MenuItem>
            {PRIOS.map(p=>(
              <MenuItem key={p} active={prioFilter===p} onClick={()=>setPrioFilter(p)}>{cap(p)}</MenuItem>
            ))}
          </Dropdown>

          <Dropdown label="Tag" icon={<Tag size={14}/>}>
            {allTags.map(t=>(
              <MenuItem key={t} active={tagFilter===t} onClick={()=>setTagFilter(t)}>{cap(t)}</MenuItem>
            ))}
          </Dropdown>

          <Dropdown label="Sort" icon={<ChevronDown size={14}/>}>
            <MenuItem active={sortBy==="priority"} onClick={()=>setSortBy("priority")}>Priority</MenuItem>
            <MenuItem active={sortBy==="due"} onClick={()=>setSortBy("due")}>Due date</MenuItem>
            <MenuItem active={sortBy==="created"} onClick={()=>setSortBy("created")}>Recently added</MenuItem>
          </Dropdown>

          <label className="flex items-center gap-2 text-xs ml-2">
            <input type="checkbox" className="accent-zinc-900 dark:accent-zinc-100"
              checked={showCompleted} onChange={e=>setShowCompleted(e.target.checked)} />
            Show completed
          </label>

          <button
            onClick={()=>setCollapsed(c=>!c)}
            className="ml-2 text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 cursor-pointer"
            title="Collapse/expand notes"
          >
            {collapsed ? "Expand cards" : "Collapse cards"}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={markAllDone} className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 cursor-pointer">Mark all done</button>
            <button onClick={clearDone}  className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 cursor-pointer">Clear done</button>
          </div>
        </div>
      </div>

      {/* Sections */}
      {status !== "done" ? (
        <div className="space-y-6">
          <Section
            title="Today"
            tasks={sections.today}
            renderTask={(task) => (
              <TaskCard
                key={task.id}
                task={task}
                collapsed={collapsed}
                draggingOver={dragOverId === task.id}
                onToggleStar={()=>toggleStar(task.id)}
                onToggleDone={()=>toggleDone(task.id)}
                onStatus={(next)=>changeStatus(task.id, next)}
                onEdit={()=>setEditing(task)}
                onDelete={()=>deleteTask(task.id)}
                onFocus={()=> onFocusTask?.(task)}
                onDragStart={onDragStart(task.id)}
                onDragOver={onDragOver(task.id)}
                onDrop={onDrop(task.id)}
                onDragEnd={onDragEnd}
                onAddSub={(title)=>addSubtask(task.id, title)}
                onToggleSub={(sid)=>toggleSubtask(task.id, sid)}
                onDeleteSub={(sid)=>deleteSubtask(task.id, sid)}
              />
            )}
          />
          <Section
            title="This Week"
            tasks={sections.week}
            renderTask={(task) => (
              <TaskCard
                key={task.id}
                task={task}
                collapsed={collapsed}
                draggingOver={dragOverId === task.id}
                onToggleStar={()=>toggleStar(task.id)}
                onToggleDone={()=>toggleDone(task.id)}
                onStatus={(next)=>changeStatus(task.id, next)}
                onEdit={()=>setEditing(task)}
                onDelete={()=>deleteTask(task.id)}
                onFocus={()=> onFocusTask?.(task)}
                onDragStart={onDragStart(task.id)}
                onDragOver={onDragOver(task.id)}
                onDrop={onDrop(task.id)}
                onDragEnd={onDragEnd}
                onAddSub={(title)=>addSubtask(task.id, title)}
                onToggleSub={(sid)=>toggleSubtask(task.id, sid)}
                onDeleteSub={(sid)=>deleteSubtask(task.id, sid)}
              />
            )}
          />
          <Section
            title="Later"
            tasks={sections.later}
            renderTask={(task) => (
              <TaskCard
                key={task.id}
                task={task}
                collapsed={collapsed}
                draggingOver={dragOverId === task.id}
                onToggleStar={()=>toggleStar(task.id)}
                onToggleDone={()=>toggleDone(task.id)}
                onStatus={(next)=>changeStatus(task.id, next)}
                onEdit={()=>setEditing(task)}
                onDelete={()=>deleteTask(task.id)}
                onFocus={()=> onFocusTask?.(task)}
                onDragStart={onDragStart(task.id)}
                onDragOver={onDragOver(task.id)}
                onDrop={onDrop(task.id)}
                onDragEnd={onDragEnd}
                onAddSub={(title)=>addSubtask(task.id, title)}
                onToggleSub={(sid)=>toggleSubtask(task.id, sid)}
                onDeleteSub={(sid)=>deleteSubtask(task.id, sid)}
              />
            )}
          />
        </div>
      ) : (
        <Section
          title="Done"
          tasks={sections.done}
          renderTask={(task) => (
            <TaskCard
              key={task.id}
              task={task}
              collapsed={collapsed}
              draggingOver={dragOverId === task.id}
              onToggleStar={()=>toggleStar(task.id)}
              onToggleDone={()=>toggleDone(task.id)}
              onStatus={(next)=>changeStatus(task.id, next)}
              onEdit={()=>setEditing(task)}
              onDelete={()=>deleteTask(task.id)}
              onFocus={()=> onFocusTask?.(task)}
              onDragStart={onDragStart(task.id)}
              onDragOver={onDragOver(task.id)}
              onDrop={onDrop(task.id)}
              onDragEnd={onDragEnd}
              onAddSub={(title)=>addSubtask(task.id, title)}
              onToggleSub={(sid)=>toggleSubtask(task.id, sid)}
              onDeleteSub={(sid)=>deleteSubtask(task.id, sid)}
            />
          )}
        />
      )}

      {/* editor modal */}
      {editing && (
        <Editor
          initial={editing}
          onClose={()=>setEditing(null)}
          onSave={(draft)=>{ saveEdit(draft); setEditing(null); }}
        />
      )}
    </section>
  );
}

/* ----------------------------- subcomponents ----------------------------- */

function Section({ title, tasks, renderTask }) {
  return (
    <div>
      <h4 className="mb-2 text-xs uppercase tracking-wider text-zinc-500">{title}</h4>
      {tasks.length === 0 ? (
        <div className="text-xs text-zinc-400 px-1 py-3">No tasks here.</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {tasks.map(renderTask)}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task, collapsed, draggingOver,
  onToggleStar, onToggleDone, onStatus, onEdit, onDelete, onFocus,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onAddSub, onToggleSub, onDeleteSub
}) {
  const StatusIcon = STATUS_ICON[task.status] || Circle;
  const overdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < dayStart(new Date());

  const doneCount = (task.subtasks || []).filter(s=>s.done).length;
  const totalSubs = (task.subtasks || []).length;
  const subPct = totalSubs ? Math.round((doneCount / totalSubs) * 100) : 0;

  const [subInput, setSubInput] = useState("");
  const [showSubs, setShowSubs] = useState(totalSubs > 0);

  return (
    <div
      className={`rounded-2xl bg-white/80 dark:bg-zinc-800/70 backdrop-blur p-4 shadow-soft border border-black/5 dark:border-white/5 transition
        ${draggingOver ? "ring-2 ring-zinc-400 dark:ring-zinc-600" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            {/* ✅ Native checkbox with tick */}
            <input
              type="checkbox"
              className="mt-0.5 size-5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
              checked={task.status === "done"}
              onChange={onToggleDone}
              aria-label={task.status === "done" ? "Unmark as done" : "Mark as done"}
              title={task.status === "done" ? "Unmark as done" : "Mark as done"}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="opacity-40" />
                <h3 className={`font-semibold truncate ${task.status === "done" ? "line-through opacity-50" : ""}`}>
                  {task.title}
                </h3>
              </div>
              {!collapsed && task.notes && (
                <p className="mt-1 text-xs text-zinc-500 line-clamp-3">{task.notes}</p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onToggleStar}
          className={`rounded-lg p-1 cursor-pointer ${task.starred ? "text-amber-500" : "text-zinc-400 hover:text-amber-500"}`}
          title={task.starred ? "Unstar" : "Star"}
        >
          {task.starred ? <Star size={16}/> : <StarOff size={16}/>}
        </button>
      </div>

      {/* meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`text-[11px] px-2 py-1 rounded-full ${PRIO_STYLE[task.priority]}`}>{cap(task.priority)}</span>
        {task.dueDate && (
          <span className={`text-[11px] px-2 py-1 rounded-full flex items-center gap-1 ${overdue ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"}`}>
            <Calendar size={12}/> {prettyDate(task.dueDate)}
          </span>
        )}
        {(task.tags || []).map(t => (
          <span key={t} className={`text-[11px] px-2 py-1 rounded-full ${tagClass(t)}`}>#{t}</span>
        ))}
      </div>

      {/* subtask progress */}
      {totalSubs > 0 && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-zinc-200/70 dark:bg-zinc-900 overflow-hidden">
            <div className="h-full bg-zinc-900 dark:bg-zinc-100" style={{ width: `${subPct}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">{doneCount}/{totalSubs} subtasks</div>
        </div>
      )}

      {/* actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={task.status}
          onChange={e=>onStatus(e.target.value)}
          className="text-xs rounded-lg bg-zinc-100 dark:bg-zinc-900 px-2 py-1 outline-none"
        >
          {STATUSES.map(s=> <option key={s} value={s}>{cap(s)}</option>)}
        </select>

        <button onClick={onEdit} className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 inline-flex items-center gap-1 cursor-pointer">
          <Edit3 size={14}/> Edit
        </button>

        <button onClick={onDelete} className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 inline-flex items-center gap-1 cursor-pointer">
          <Trash2 size={14}/> Delete
        </button>

        {onFocus && (
          <button
            onClick={()=>onFocus(task)}
            className="ml-auto text-xs px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 inline-flex items-center gap-1 cursor-pointer"
            title="Open in focus with Pomodoro"
          >
            <Play size={14}/> Focus
          </button>
        )}
      </div>

      {/* subtasks list */}
      <div className="mt-3">
        <button
          onClick={()=>setShowSubs(s=>!s)}
          className="text-xs inline-flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 cursor-pointer"
        >
          {showSubs ? <ChevronUp size={14}/> : <ChevronDown size={14}/> }
          {showSubs ? "Hide subtasks" : "Show subtasks"}
        </button>

        {showSubs && (
          <div className="mt-2 space-y-2">
            {(task.subtasks || []).map(s => (
              <label key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 px-2 py-1.5 cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-zinc-900 dark:accent-zinc-100"
                    checked={s.done}
                    onChange={()=>onToggleSub(s.id)}
                  />
                  <span className={`text-sm ${s.done ? "line-through opacity-60" : ""}`}>{s.title}</span>
                </div>
                <button onClick={()=>onDeleteSub(s.id)} className="p-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer">
                  <X size={14}/>
                </button>
              </label>
            ))}

            <div className="flex items-center gap-2">
              <input
                value={subInput}
                onChange={(e)=>setSubInput(e.target.value)}
                placeholder="Add a subtask…"
                className="flex-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 outline-none"
                onKeyDown={(e)=>{ if(e.key==="Enter" && subInput.trim()){ onAddSub(subInput); setSubInput(""); } }}
              />
              <button
                onClick={()=>{ if(subInput.trim()){ onAddSub(subInput); setSubInput(""); } }}
                className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({ initial, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...initial });
  const [openNotes, setOpenNotes] = useState(Boolean(draft.notes));
  const [subInput, setSubInput] = useState("");

  const addSub = () => {
    const t = subInput.trim();
    if (!t) return;
    setDraft(d => ({ ...d, subtasks: [...(d.subtasks || []), { id: id(), title: t, done: false }] }));
    setSubInput("");
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-black/5 dark:border-white/5">
        <h3 className="text-lg font-extrabold tracking-tight">Edit task</h3>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="text-sm">
            <span className="block mb-1 text-zinc-600 dark:text-zinc-300">Title</span>
            <input
              value={draft.title}
              onChange={e=>setDraft(d => ({...d, title: e.target.value}))}
              className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block mb-1 text-zinc-600 dark:text-zinc-300">Priority</span>
              <select
                value={draft.priority}
                onChange={e=>setDraft(d => ({...d, priority: e.target.value}))}
                className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
              >
                {PRIOS.map(p=> <option key={p} value={p}>{cap(p)}</option>)}
              </select>
            </label>

            <label className="text-sm">
              <span className="block mb-1 text-zinc-600 dark:text-zinc-300">Due date</span>
              <input
                type="date"
                value={draft.dueDate || ""}
                onChange={e=>setDraft(d => ({...d, dueDate: e.target.value}))}
                className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block mb-1 text-zinc-600 dark:text-zinc-300">Status</span>
              <select
                value={draft.status}
                onChange={e=>setDraft(d => ({...d, status: e.target.value}))}
                className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
              >
                {STATUSES.map(s=> <option key={s} value={s}>{cap(s)}</option>)}
              </select>
            </label>

            <label className="text-sm">
              <span className="block mb-1 text-zinc-600 dark:text-zinc-300">Tags (comma)</span>
              <input
                value={(draft.tags || []).join(", ")}
                onChange={e=>setDraft(d => ({...d, tags: splitTags(e.target.value)}))}
                className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
              />
            </label>
          </div>

          <button
            onClick={()=>setOpenNotes(o=>!o)}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
          >
            {openNotes ? <ChevronUp size={14}/> : <ChevronDown size={14}/> }
            {openNotes ? "Hide notes" : "Add notes"}
          </button>

          {openNotes && (
            <textarea
              rows={4}
              value={draft.notes || ""}
              onChange={e=>setDraft(d => ({...d, notes: e.target.value}))}
              placeholder="Details, links, subtasks…"
              className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 outline-none"
            />
          )}

          {/* subtasks editor */}
          <div className="mt-2">
            <div className="text-sm mb-2">Subtasks</div>
            <div className="space-y-2">
              {(draft.subtasks || []).map(s => (
                <label key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-zinc-900 dark:accent-zinc-100"
                      checked={s.done}
                      onChange={()=>setDraft(d => ({...d, subtasks: d.subtasks.map(x => x.id===s.id ? {...x, done: !x.done} : x)}))}
                    />
                    <input
                      value={s.title}
                      onChange={e=>setDraft(d => ({...d, subtasks: d.subtasks.map(x => x.id===s.id ? {...x, title: e.target.value} : x)}))}
                      className="bg-transparent outline-none text-sm"
                    />
                  </div>
                  <button onClick={()=>setDraft(d => ({...d, subtasks: d.subtasks.filter(x => x.id !== s.id)}))} className="p-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 cursor-pointer">
                    <X size={14}/>
                  </button>
                </label>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                value={subInput}
                onChange={(e)=>setSubInput(e.target.value)}
                placeholder="Add a subtask…"
                className="flex-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 outline-none"
                onKeyDown={(e)=>{ if(e.key==="Enter" && subInput.trim()){ addSub(); } }}
              />
              <button onClick={addSub} className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 cursor-pointer">Add</button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 cursor-pointer">Cancel</button>
          <button onClick={()=>onSave(draft)} className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer">Save</button>
        </div>
      </div>
    </div>
  );
}

function Tabs({ value, onChange, items }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1">
      {items.map(it => (
        <button
          key={it.id}
          onClick={()=>onChange(it.id)}
          className={`text-xs px-3 py-1.5 rounded-lg transition cursor-pointer ${value===it.id
            ? "bg-white dark:bg-zinc-800 shadow"
            : "opacity-75 hover:opacity-100"}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Dropdown({ label, icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={()=>setOpen(o=>!o)}
        className="text-xs inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 cursor-pointer"
      >
        {icon}{label}
      </button>
      {open && (
        <div
          onMouseLeave={()=>setOpen(false)}
          className="absolute mt-2 z-50 min-w-36 rounded-xl bg-white dark:bg-zinc-900 p-2 shadow-2xl border border-black/5 dark:border-white/5 cursor-pointer"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs w-full text-left px-3 py-2 rounded-lg cursor-pointer ${active ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
    >
      {children}
    </button>
  );
}

function StatPill({ label, value, tone }) {
  const base = "text-[11px] px-2 py-1 rounded-full";
  const cls = tone === "warn"
    ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
  return <span className={`${base} ${cls}`}>{label}: {value}</span>;
}

/* ----------------------------- utils ----------------------------- */
function splitTags(s) {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function prettyDate(iso) {
  const d = new Date(iso);
  const today = dayStart(new Date());
  const dd = dayStart(d);
  const diff = Math.round((dd - today) / (24*3600*1000));
  const opts = { month: "short", day: "numeric" };
  const f = d.toLocaleDateString(undefined, opts);
  if (diff === 0) return `Today • ${f}`;
  if (diff === 1) return `Tomorrow • ${f}`;
  if (diff === -1) return `Yesterday • ${f}`;
  return f;
}
function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
