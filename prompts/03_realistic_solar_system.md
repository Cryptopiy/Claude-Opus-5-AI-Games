# Build a Compact 3D Solar System Visualization

You are an autonomous coding agent working inside the current directory.

## Goal

Create a visually impressive but compact browser-based 3D Solar System demonstration. Focus on recognizable planets, convincing lighting, smooth motion, and simple interaction while keeping implementation cost low.

## Mandatory execution rules

1. Create a folder named exactly `solar-system-3d` in the current directory.
2. Put the complete project inside that folder and nowhere else.
3. Work silently. Do not send plans, progress updates, explanations, code, diffs, command descriptions, or summaries as chat messages.
4. Write code only through file creation or editing tools.
5. Minimize output tokens aggressively.
6. Do not ask questions.
7. When the required functionality works, stop immediately.
8. Your only final chat message must be exactly: `Done`

## Hard cost and scope limit

This is a compact demonstration project, not a production-ready application.

- Use only plain HTML, CSS, and JavaScript.
- Use no more than 3 source files: `index.html`, `styles.css`, and `app.js`.
- Load Three.js and OrbitControls from a CDN.
- Do not use React, Vite, TypeScript, Tailwind, npm, or a build system.
- Do not use a backend, database, external data API, AI API, or authentication.
- Do not download textures, models, fonts, audio, image packs, or other assets.
- Use procedural materials, gradients, simple shaders, and generated geometry.
- Do not use post-processing libraries, bloom packages, physics engines, or large dependencies.
- Do not use web search, subagents, browser automation, screenshots, or visual-comparison loops.
- Do not create tests, documentation, reports, a changelog, or optional files.
- Create each file once whenever possible.
- Do not repeatedly reread files you just created.
- Do not rewrite complete working files for minor improvements.
- Perform at most one lightweight syntax or load validation.
- If validation finds an error, make only one focused repair pass.
- Do not add optional features after the core requirements work.

## Required scene

Include:

- The Sun and all eight planets.
- Recognizable relative planet sizes, colors, and ordering.
- Compressed orbital distances suitable for presentation.
- Continuous orbital motion and planet rotation.
- Orbit rings.
- A procedural star field.
- Directional or point lighting originating from the Sun.
- Saturn's rings.
- A simple atmospheric glow for Earth using lightweight geometry or materials.
- Mouse orbit and zoom controls.
- A compact list or button row for selecting a planet.
- Smooth camera focus on the selected planet.
- A small information panel showing the selected planet's name and 2–3 short facts.
- Pause/resume and simulation-speed controls.
- A responsive overlay for desktop and mobile.

## Visual direction

Aim for a realistic presentation rather than a cartoon. Use dark space, subtle glow, believable illumination, varied roughness, and restrained motion. Keep geometry and effects lightweight enough for typical laptops.

## Priority order

1. Stable Three.js scene and controls.
2. Sun, eight planets, orbiting, and rotation.
3. Planet selection and camera focus.
4. Realistic lighting and lightweight visual polish.
5. Responsive UI.

Stop as soon as these requirements work. Do not add moons, asteroid belts, multiple scale modes, high-resolution textures, complex shaders, advanced post-processing, cinematic tours, or extra panels.

## Final requirement

After completing the project, respond with exactly:

Done
