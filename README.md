# Focusly ✨  
*A calm, minimal space to get things done.*

<div style="display: flex; gap: 32px; justify-content: center; align-items: center; flex-wrap: wrap; margin: 12px 0;">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbndnYnliY2dsMW04cjMwdnphamd5Mnl2Nm5reHlkZ2p2eTRvMngwNyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kMqJ9CL7656fK/giphy.gif" width="260" />
  <img src="https://i.pinimg.com/originals/a8/09/94/a8099418b2137e113c808fff5df2dc2a.gif" width="260" />
</div>

*A small “before → after” moment — from tired to focused.*

---

## 🌿 What is Focusly?

Focusly is a simple, distraction-free productivity app built with React.  
It brings together the essentials — a Pomodoro timer, tasks, ambient sounds, relaxing backgrounds, and clean themes — all in one quiet space.  
Nothing complicated, nothing heavy… just tools that help you settle in and start.

---

## ⭐ Features

### ⏱️ Pomodoro Timer  
A calm flip-clock timer with smooth transitions, editable durations, and a fullscreen Focus Mode.  
Titles sync automatically with your tasks, so the timer always knows what you’re working on.

### ✅ Tasks  
Organize your day with priority levels, tags, and optional subtasks.  
Reorder tasks by dragging, tap to check them off, and send any task straight into the Pomodoro with a single “Focus” action.

### 🎧 Ambient Sounds & Music  
Rain, forest, cafés, oceans, white/brown noise — plus support for:  
- direct audio URLs  
- YouTube audio-only mode  
- binaural focus frequencies  

Everything keeps running in the background while you work.

### 🌄 Background Scenes  
Choose from many high-quality scenes (forest, ocean, library, café, minimal rooms, etc.).  
The background fills the whole workspace to create a soft, immersive study vibe.

### 🎨 Themes  
Light, dark, and gentle accent palettes to match your mood.  
Simple, clean, and easy on the eyes during long focus sessions.

### 💾 Auto-Save  
Everything — your tasks, selected background, theme, and timer preferences — is saved automatically using `localStorage`.

---

## 🧩 Tech Stack

React + Vite • TailwindCSS • Web Audio API • YouTube IFrame API • LocalStorage

![React](https://img.shields.io/badge/React-20232a?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

---

## 🚀 Quick start

```bash
npm install
npm run dev
````

---

## 📁 Project structure

```
src/
  components/
    Background.jsx
    FocusMode.jsx
    Music.jsx
    Pomodoro.jsx
    Sidebar.jsx
    Tasks.jsx
    Themes.jsx
    ThemeToggle.jsx
  config/
    themePresets.js
  App.jsx
  main.jsx
index.css
vite.config.js
```

> All backgrounds and audio are loaded through **external links**, so no public folder is required.

---

## 🎯 Why Focusly?

Focusly brings together tools you already use — timer, tasks, music, and ambience —
but keeps the interface soft, clean, and calming.
It’s built to feel like a space you *want* to come back to whenever you sit down to study or work.

---

