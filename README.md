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

---

## Overview

BlinkBreak is a cross-platform desktop application built with Electron that helps prevent digital eye strain by implementing the 20-20-20 rule and providing customizable break intervals. The application runs in the background and reminds users to take regular breaks, adjust their display settings, and maintain healthy computing habits.

---

## Features

### Break Management
- **Hard Mode** - Full screen lock with countdown timer to enforce breaks
- **Soft Mode** - Non-intrusive popup notifications that can be dismissed
- **Smart Mode** - Automatic detection of meetings and presentations to avoid interruptions
- **Customizable Intervals** - Configure break frequency and duration (5-60 minutes)
- **Quick Presets** - 20-20-20 Rule, Pomodoro, and Frequent break templates

### Display Optimization
- **Monitor Controls** - Adjust screen brightness and contrast with preset configurations
- **Blue Light Filter** - Reduce eye strain with adjustable warm color temperature overlay
- **Environment Presets** - Outdoor, Indoor, Evening, and Night Mode settings
- **Theme System** - Eye-friendly Dark Neon theme and clean White theme

### Health & Productivity
- **Posture Reminders** - Periodic alerts to maintain proper sitting posture
- **Hydration Tracking** - Regular reminders to stay hydrated
- **Statistics Dashboard** - Track break completion, screen time, and streak data
- **Focus Mode** - Pomodoro timer with optional website blocking

### System Integration
- **System Tray** - Persistent background operation with quick access menu
- **Auto-Launch** - Optional startup on system boot
- **Global Shortcuts** - Keyboard shortcuts for quick actions
- **Local Storage** - All data stored locally with no external dependencies

---

## Installation

### Windows
Download the latest installer from the releases page. BlinkBreak is primarily developed and tested for Windows.

### Building from Source
```bash
# Clone the repository
git clone https://github.com/rahad-hossain/blinkbreak.git
cd blinkbreak

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
npm run build:electron
```

---

## Usage

1. Launch BlinkBreak and configure your preferred break intervals
2. Select a break mode (Hard, Soft, or Smart)
3. Optionally adjust display settings and enable health reminders
4. The application will run in the system tray and notify you when breaks are due
5. View your statistics to track progress and maintain consistency

---

## Technology Stack

- **Electron** - Cross-platform desktop framework
- **React** - User interface library
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling with custom theme
- **Zustand** - Lightweight state management
- **Lucide React** - Icon library

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
