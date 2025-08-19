# Task Manager

A full-featured Task Manager web app with drag-and-drop ordering, due-date reminders, user authentication, offline support, Tailwind styling, and an Electron wrapper.

## 🚀 Features
- ✅ Add, edit, delete tasks
- ✅ Drag & drop reordering
- ✅ Due-date reminders with desktop notifications
- ✅ Local user accounts with PBKDF2 password hashing
- ✅ Offline-ready with local Tailwind CSS
- ✅ Electron wrapper for desktop (Windows, macOS, Linux)
- ✅ GitHub Actions workflow to build binaries automatically

---

## 📦 Getting Started (Web Version)
1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/task-manager.git
   cd task-manager
   ```

2. Open `index.html` in your browser.

Tasks are stored in your browser's `localStorage`.

---

## 🖥️ Running Electron App
1. Install dependencies:
   ```bash
   cd electron
   npm install
   ```

2. Start the Electron app:
   ```bash
   npm start
   ```

---

## 🎨 Tailwind CSS Build
If you want to rebuild Tailwind CSS:
```bash
npm run build:tailwind
```

This compiles the `tailwind.css` into a production version.

---

## ⚡ GitHub Actions (CI/CD)
This repo includes a GitHub Actions workflow (`.github/workflows/build.yml`).

- On every push to **main**, or manually via **Actions tab**, the workflow will:
  - Install dependencies
  - Build Tailwind CSS
  - Package the Electron app for Linux, Windows, and macOS
  - Upload the binaries as artifacts

You can download the builds from the **Actions** page on GitHub.

---

## 📌 Notes
- This project is for **demo/local use only**.
- Authentication is local-only and not meant for production use.
- To distribute binaries, push to GitHub and check the Actions tab for downloads.
