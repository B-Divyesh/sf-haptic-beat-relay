# Haptic Beat Relay — visual thesis

## Direction

**Cinematic environmental art: a midnight rehearsal clearing.** The interface feels like two friends keeping time across a dark outdoor stage. Amber footlights mark the beat, cyan reflections show the return signal, and mist gives distance to the relay. The art explains the product: one pulse leaves a host, crosses space, and reaches a second device.

This is a deliberately single-mode, dark environment. It suits low-light music practice, keeps the live beat meter prominent, and avoids the generic bright dashboard look.

## Palette

- `night-950` `#071019` — page background, like blue-black stage air
- `night-900` `#0D1C27` — raised surfaces
- `night-800` `#173242` — boundaries and quiet controls
- `fog-100` `#F1F6F2` — primary text
- `fog-300` `#B8C8C8` — secondary text (7.8:1 on the background)
- `amber-400` `#FFB84D` — beat, primary action, focus (10.4:1 with night text)
- `amber-200` `#FFD991` — active cue
- `cyan-300` `#75E6E0` — companion return signal and success
- `red-300` `#FF8A80` — error

Color never carries status alone. Labels, shapes, and numbers repeat each state.

## Type and spacing

Display text uses the device's condensed display stack (`Arial Narrow`, `Roboto Condensed`, then `Impact`). Its narrow concert-poster rhythm suits count-ins and large scores. Body text uses the system UI stack for fast, clear controls. No font is fetched at runtime.

The spacing scale is 4, 8, 12, 16, 24, 32, 48, 72, and 96 px. Reading width stays below 68 characters. Controls are at least 44 px high.

## Shape and interaction grammar

The visual unit is a **signal notch**: clipped corners and short horizontal tick marks, like marks on a sequencer rail. Panels are grouped by space and a single top rule rather than generic floating cards. The room code is set like a stage-call board. Host signals use amber; companion responses use cyan.

The live round is the visual centre. A horizon line carries four beat markers. Each cue lifts a pool of amber light; each returned tap sends a cyan ring back toward the host. Controls remain plain buttons and links.

The friend must tap **Enable vibration** before a real round. That activation panel uses the cyan return-signal rule, then collapses to a compact ready state and places the tap pad in view. The host unlocks its round action only after receiving that ready signal.

## Motion policy

One signature motion: **the relay crossing**. On each beat, an amber signal travels left to right across the horizon in 240 ms. A companion tap returns a cyan ring in 180 ms. Motion uses only opacity and transform. There are no constant decorative loops. With `prefers-reduced-motion: reduce`, signals change color and opacity instantly, while the count and haptic cue remain unchanged.

## Asset plan and prompt sheet

Hero art subject: two phone-like light monoliths on opposite sides of a rain-dark rehearsal clearing, joined by four low amber pulse pools and one cyan return ripple. World: nocturnal open-air sound stage, distant tree silhouettes and low mist. Materials: wet slate, brushed dark metal, soft atmospheric haze. Light: tungsten amber practicals with restrained cyan reflected light. Lens: wide 35 mm, low eye line, cinematic depth, no people. Palette words: blue-black, fog grey, tungsten amber, cool cyan. Negative list: text, letters, logos, watermark, brand marks, people, hands, copyrighted characters, neon gradient, purple SaaS glow, UI screenshots.

The generated scene is used only as environmental context. All required words and controls remain HTML. A hand-authored SVG pulse mark supplies the favicon.

## Provenance

- `assets/src/relay-clearing.png`: generated for this product with the factory image model (`factory-image`) on 2026-08-28 from the prompt sheet above. Original generated work; no brands or copyrighted characters requested. SHA-256: `91186453bc0fe4f9024d98c02a293f38fe8405ae1060ab0f5c9d77262d430c3f`.
- Optimized responsive WebP exports are derived locally from that source. The generated-image disclosure appears in the site footer.
