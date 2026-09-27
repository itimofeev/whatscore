# Lessons

- 2026-09-27: Commit messages with double quotes break `git commit -m "..."` inside a heredoc-driven shell call. Use `git commit -F <file>` for multi-line messages.
- 2026-09-27: GitHub Pages created via API while a non-main branch was the default gets an environment branch policy for that branch; set the default branch to `main` before enabling Pages, or fix `environments/github-pages/deployment-branch-policies`.
- 2026-09-27: CSS `order` on grid children changes paint order; absolutely positioned overlays need an explicit z-index.
- 2026-09-27: Verify screens by the same input a user has (scroll, tap), not only by JS-driven submit; the unreachable Start button slipped past a JS-only check.
- 2026-09-27: Speech recognition mangles short words ("coin thread" for "point red"). Edit distance 1 is far too strict: use n-best alternatives, substring matching for glued words, a mishearing table per default name, and show what was heard on screen. Details: `docs/voice.md`.
