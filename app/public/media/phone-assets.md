# Phone gallery asset provenance

Created on 2026-10-18 with the built-in `image_gen` tool, following the `imagegen` skill. These are generated scenes, not photographs of an identified real place or real people. No remote image requests are made by the gallery. The assets are bundled in the static Pages release.

| Asset | Source output | Use |
| --- | --- | --- |
| `phone-lake.webp` | `exec-f9f869c9-cdda-4933-adb7-dae30600aaa0.png` | Gallery and phone home wallpaper |
| `phone-cafe.webp` | `exec-73062046-aa76-438d-a374-35114b77ead0.png` | Gallery |

Original generation directory: `/Users/tiger/.codex/generated_images/01a14fa8-9e73-7cb3-be6b-340f48813ed9/`.

Both source outputs were visually inspected. Delivery files are 960-pixel-wide WebP images, quality 82, with the original scene composition preserved. The installed FFmpeg lacks the WebP encoder; Pillow 12.3.0 performed the delivery-size conversion. Original generated PNG files remain at the generation directory.

## Prompt set

### Lake

Use case: photorealistic-natural. Asset type: one fictional everyday photo in a mobile phone gallery. Primary request: candid smartphone photograph of a quiet mountain lake, pine forest on the shore and distant misty green mountains reflected in still water, naturally overcast morning. Landscape 4:3 composition, realistic subtle phone-camera sharpening, believable unsaturated colors. This is a single photo, not a collage, not a UI screenshot. No people, no buildings, no recognizable real location, no logos, no text, no watermark.

### Cafe

Use case: photorealistic-natural. Asset type: one fictional everyday photo in a mobile phone gallery. Primary request: casual smartphone photo taken at a small cafe table, white ceramic cup of coffee with subtle crema and a small green potted plant on a warm worn wooden surface beside a window, soft afternoon daylight, believable ordinary setting, no staging. Landscape 4:3 composition. This is a single photograph, no collage, no interface or frame. No people, no recognizable location, no logos, no text, no watermark.

The other two gallery entries reuse the project's existing `warehouse-source.png` and `server-source.png`; their provenance is tracked by `README.md` in this directory.
