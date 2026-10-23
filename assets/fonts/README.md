# Fonts

- `space-grotesk.woff2` — Space Grotesk (SIL Open Font License), latin subset, variable weights 300–700. Used site-wide.
- `userfont-pixel-backup.ttf` — the previous pixel font, kept so the old look can be restored.

To go back to the pixel font, swap the `@font-face` block at the top of `style.css` for the commented-out one right above it, and point `--font` at `"UserFont"`.
