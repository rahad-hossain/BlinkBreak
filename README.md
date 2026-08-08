# BlinkBreak

<p align="center">
  <img src="public/logo.jpg" alt="BlinkBreak Logo" width="120" height="120" style="border-radius: 16px;">
</p>

<p align="center">
  <strong>Your Eyes Deserve a Break</strong>
</p>

<p align="center">
  A desktop application designed to reduce eye strain and promote healthy screen habits through intelligent break reminders and display optimization.
</p>

<p align="center">
  <a href="https://github.com/rahad-hossain/BlinkBreak/releases/latest">
    <img src="https://img.shields.io/badge/version-1.2.0-3daa8f" alt="Version 1.2.0">
  </a>
  <img src="https://img.shields.io/badge/platform-Windows-3daa8f" alt="Windows">
  <img src="https://img.shields.io/badge/license-MIT-3daa8f" alt="MIT License">
</p>

---

## Overview

BlinkBreak is a cross-platform desktop application built with Electron that helps prevent digital eye strain by implementing the 20-20-20 rule and providing customizable break intervals. The application runs in the background and reminds users to take regular breaks, adjust their display settings, and maintain healthy computing habits.

---

## Screenshots

<p align="center">
  <img src="public/sample-home.png" alt="Home page overview" width="45%">
  <img src="public/sample-timer.png" alt="Timer page with break controls" width="45%">
</p>

<p align="center">
  <img src="public/sample-personalize.png" alt="Personalize page with monitor controls" width="45%">
  <img src="public/sample-settings.png" alt="Settings page with reminders and sounds" width="45%">
</p>

<p align="center">
  <img src="public/sample-statistics.png" alt="Statistics dashboard" width="45%">
  <img src="public/sample-lock.png" alt="Break Screen" width="45%">
</p>

---

## Features

- ✓ **Smart Break Timer** - Customizable intervals and break lengths with a polished experience
- ✓ **Hard Mode** - Full-screen focus lock for deep work sessions
- ✓ **Soft Mode** - Gentle popup reminders that respect your flow
- ✓ **Smart Mode** - Auto-detects active sessions and pauses breaks when needed
- ✓ **Multi-Monitor Support** - Covers all displays with adaptive behavior
- ✓ **System Tray** - Runs quietly in the background with live status
- ✓ **Auto-Launch** - Starts with Windows from Settings
- ✓ **Settings Persistence** - Your preferences stay intact across restarts
- ✓ **Statistics Tracking** - Review screen time, streaks, and daily progress
- ✓ **Health Reminders** - Posture and hydration prompts with custom sounds
- ✓ **Monitor Controls** - Adjust brightness, contrast, and display presets
- ✓ **Blue Light Filter** - Warm-screen comfort for longer work sessions
- ✓ **Color Mask** - Apply soft color overlays to reduce visual fatigue
- ✓ **Focus Mode** - Block distracting websites system-wide
- ✓ **Dual Themes** - Modern dark and light experiences
- ✓ **Single Instance** - Prevents duplicate app windows

### Coming Soon

- ○ Global keyboard shortcuts

---

## Download

**Latest Release:** [v1.2.0](https://github.com/rahad-hossain/BlinkBreak/releases/latest)

**Installer (Recommended):** `BlinkBreak Setup 1.2.0.exe`

- Installs to Program Files with shortcuts

**Portable:** `BlinkBreak 1.2.0.exe`

- No installation required

**Requirements:** Windows 10/11 (64-bit)

---

## Quick Start

1. Download and install BlinkBreak
2. App starts with default: 20 min interval, 20 sec break
3. Customize timer in **Timer** tab
4. App runs in system tray - click to show/hide
5. Enable/disable auto-launch in **Settings**

---

## Building from Source

```bash
# Clone repository
git clone https://github.com/rahad-hossain/BlinkBreak.git
cd BlinkBreak

# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
npm run build:electron
```

---

## Technology Stack

- **Electron 28** - Desktop framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Zustand** - State management
- **electron-store** - Data persistence

---

## Development

### Project Structure

```
BlinkBreak/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React application
│   ├── preload/        # Preload script for IPC
│   └── shared/         # Shared types and utilities
├── public/             # Static assets
└── dist/               # Build output
```

### Available Commands

```bash
npm run dev             # Start development server
npm run build           # Build all processes
npm run build:electron  # Package for distribution
npm run lint            # Run ESLint
```

---

## Design Principles

BlinkBreak is designed with eye health as the primary focus. The color scheme uses warm tones to reduce blue light exposure, maintains high contrast without harsh whites, and implements reduced saturation to prevent eye fatigue. The interface is minimal and intuitive, with smooth animations that respect user accessibility preferences. All user data is stored locally with no telemetry or external server communication.

---

## Support

- [Report Issues](https://github.com/rahad-hossain/BlinkBreak/issues)
- [View Releases](https://github.com/rahad-hossain/BlinkBreak/releases)
