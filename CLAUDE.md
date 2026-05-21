# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Little Sera's Club Games (LSCG)** — a TypeScript mod for the browser game *Bondage Club* (BC). It injects into the running game via TamperMonkey/FUSAM and extends it with new states, hypnosis, drug mechanics, magic, collar systems, activities, and more.

The output is a single IIFE bundle (`dist/bundle.js`) injected into the BC game page.

## Commands

```bash
npm run dev          # watch + serve (development: inline sourcemaps, port 10001, CORS enabled)
npm run build        # production build → dist/bundle.js
npm run watch        # continuous dev build only (no server)
npm run serve        # serve dist/ on port 10001 only
npm run typecheck    # tsc --noEmit (no build, just type-check)
```

There are no test commands — this project has no automated test suite. Verification is done by loading the mod in-game.

## Architecture

### Module System

Every feature is a **module** that extends `BaseModule` ([src/base.ts](src/base.ts)). All modules are registered in [src/modules.ts](src/modules.ts) and have a lifecycle:

1. `init()` — register hooks, set up global state
2. `load()` — restore saved settings, apply persisted state  
3. `run()` — activate runtime behaviors
4. `unload()` / `safeword()` — clean up

[src/main.tsx](src/main.tsx) boots everything: waits for BC's `LoginResponse`, then calls each lifecycle phase in order.

Convenience accessors (`Core()`, `HypnoTriggers()`, `Activities()`, etc.) are exported from `modules.ts` and used throughout rather than passing module references directly.

### Settings

Settings are stored on `Player.LSCG` (the BC player object, synced to the game server) with localStorage as a fallback. Each module has a typed settings interface in `src/Settings/Models/`. All module settings are composed into a single `SettingsModel` in [src/Settings/Models/settings.ts](src/Settings/Models/settings.ts).

Settings have version tracking and a migration system — when the schema changes, `core.ts` runs migrations on load.

### Hooking BC Functions

The primary integration mechanism is wrapping BC's global functions. `utils.ts` provides `hookFunction(name, priority, patch)` — LSCG intercepts functions like `ChatRoomMessage`, `ChatRoomSync`, `DrawCharacter`, etc. to inject behavior. Hooks are registered in module `init()` and should be cleaned up in `unload()`.

### States System

[src/Modules/States/](src/Modules/States/) implements a framework for persistent character states (Blind, Deaf, Gagged, Frozen, Sleep, Hypno, Polymorph, etc.). Each state extends `BaseState` and handles:
- Activation/deactivation conditions
- Duration ticking and recovery
- Immersive restrictions (blocks actions, speech, movement)
- Serialization to settings

The `StateModule` in [src/Modules/states.ts](src/Modules/states.ts) coordinates all active states.

### Communication Protocol

Multiplayer features use BC's whisper/beep system. `utils.ts` provides helpers for sending/parsing structured LSCG messages between players. The `commands.ts` module handles chat command parsing.

### UI / Settings Screens

Settings screens extend `GuiSubscreen` ([src/Settings/settingBase.ts](src/Settings/settingBase.ts)). Drawing uses BC's canvas-based API — `settingUtils.ts` wraps common patterns (buttons, tooltips, text inputs). TSX components (via `tsx-dom`, JSX factory `h`) are used for some newer UI panels.

### Key Files

| File | Role |
|------|------|
| [src/utils.ts](src/utils.ts) | Shared utilities: hooks, DOM, serialization, chat parsing, speech modification (~1400 lines) |
| [src/modules.ts](src/modules.ts) | Module registry + barrel exports |
| [src/base.ts](src/base.ts) | `BaseModule` abstract class |
| [src/constants/](src/constants/) | Timing (ms), balance tuning, UI dimensions |
| [src/club_existing/](src/club_existing/) | BC game type declarations (not LSCG code) |

## TypeScript Notes

- Strict mode is on; `bc-stubs` package provides BC game type stubs
- JSX is compiled with `tsx-dom` (`h` factory, not React)
- Experimental decorators are enabled
- Circular dependency warnings are suppressed in Vite — they exist in the codebase and are acceptable

## Code Style

ESLint enforces: 4-space indent, double quotes, Unix line endings. The `_` prefix suppresses unused-variable warnings. Run `npm run typecheck` before committing to catch type errors without a full build.
