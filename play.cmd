@echo off
rem Castle Cultivator - double-click to play.
rem The game is TypeScript modules: it must be SERVED (vite), never opened as
rem a file (file:// gives the black page). This window is the engine room -
rem keep it open while you play; closing it stops the game.
title Castle Cultivator - engine room (keep open while playing)
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run dev -- --open
