# Build a Compact Playable Forest FPS

You are an autonomous coding agent working inside the current directory.

## Goal

Create a compact, playable browser-based first-person forest shooter. The player moves through a small forest arena, fights simple monsters, and switches among three distinct weapons.

## Mandatory execution rules

1. Create a folder named exactly `forest-fps` in the current directory.
2. Put the complete project inside that folder and nowhere else.
3. Work silently. Do not send plans, progress updates, explanations, code, diffs, command descriptions, or summaries as chat messages.
4. Write code only through file creation or editing tools.
5. Minimize output tokens aggressively.
6. Do not ask questions.
7. When the required gameplay works, stop immediately.
8. Your only final chat message must be exactly: `Done`

## Hard cost and scope limit

This is a compact game prototype, not a production-ready game.

- Use only plain HTML, CSS, and JavaScript.
- Use no more than 4 source files: `index.html`, `styles.css`, `game.js`, and optionally one small helper file.
- Load Three.js and PointerLockControls from a CDN.
- Do not use React, Vite, TypeScript, Tailwind, npm, or a build system.
- Do not use a backend, database, multiplayer service, external API, AI API, or authentication.
- Do not download models, textures, fonts, audio, asset packs, or other resources.
- Build the environment, weapons, and monsters from lightweight procedural geometry and materials.
- Do not use a physics engine, navigation library, post-processing library, or large dependency.
- Do not use web search, subagents, browser automation, screenshots, or visual-comparison loops.
- Do not create tests, documentation, reports, a changelog, or optional files.
- Create each file once whenever possible.
- Do not repeatedly reread files you just created.
- Do not rewrite complete working files for minor improvements.
- Perform at most one lightweight syntax or load validation.
- If validation finds an error, make only one focused repair pass.
- Do not add optional features after the core gameplay works.

## Required gameplay

Implement:

- A start screen with concise controls.
- Pointer-lock mouse look.
- WASD movement.
- Sprint and jump.
- A small bounded forest arena.
- Basic collision with arena boundaries and major obstacles.
- A forest containing trees plus rocks, bushes, fallen logs, crates, and simple ruins.
- Atmospheric fog, a sky color or gradient, directional lighting, and basic shadows only where inexpensive.
- Monsters that approach the player, attack at close range, take damage, and die.
- At least two visually distinct monster variants made from procedural geometry.
- A simple spawn or wave system that increases pressure over time.
- Player health, score, game over, and restart.

## Exactly three weapons

Provide exactly these three selectable weapons:

1. Pistol: moderate damage and firing speed.
2. Shotgun: slow firing, pellet spread, strong close-range damage.
3. Rifle: rapid fire, lower damage per shot, larger magazine.

Requirements:

- Switch with keys `1`, `2`, and `3`.
- Use lightweight raycasting for shooting.
- Show current weapon, ammunition, health, and score in the HUD.
- Include reload behavior.
- Add simple recoil, muzzle flash, and hit feedback using code only.
- Do not add audio unless it can be generated very simply with the Web Audio API and requires little code. Audio is optional.

## Visual and performance direction

Use a cohesive stylized-realistic look. Avoid an empty plane with identical trees. Vary object placement and scale, but keep the arena compact. Use instancing for repeated trees or props when practical. Favor stable gameplay and frame rate over detailed graphics.

## Priority order

1. Movement, mouse look, shooting, damage, game over, and restart.
2. Three distinct working weapons.
3. Functional monsters and combat loop.
4. Varied forest environment with non-tree objects.
5. Fog, lighting, muzzle flash, recoil, and other lightweight polish.

Stop as soon as these requirements work. Do not add large maps, skeletal animation, complex pathfinding, inventory systems, missions, settings menus, save systems, detailed physics, downloaded assets, or advanced effects.

## Final requirement

After completing the project, respond with exactly:

Done
