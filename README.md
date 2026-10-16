# Answer Bar industry feeds

Keeps the Key developments section of the answerbar.io industry pages current, the same way the Intelligence Desk stays current. Every 6 hours a GitHub job pulls a short list of credible feeds, keeps the items about AI and work, and publishes one small file per industry page. The page reads that file each time someone opens it.

This is separate from the Intelligence Desk. It does not touch the Desk's repo or its schedule.

## What it publishes

`https://stradtmann73.github.io/answerbar-industry-feeds/consultants.json`

The consultants page block already points at that address. If you create the repo under a different account or name, change the `data-feed-url` line at the top of the page block to match.

## One-time setup (about 5 minutes)

1. On GitHub, create a new **public** repo named `answerbar-industry-feeds` under the `stradtmann73` account. GitHub Pages is free for public repos.
2. Upload everything in this folder, including the hidden `.github` folder and `docs/.nojekyll`.
3. **Settings > Actions > General > Workflow permissions:** choose "Read and write permissions" and save. The job needs this to publish its file.
4. **Settings > Pages:** set Source to "Deploy from a branch", branch `main`, folder `/docs`, and save.
5. **Actions tab > Refresh industry feeds > Run workflow.** This runs it once now instead of waiting up to 6 hours.
6. Open the address above. You should see the consultants items. The page picks them up on its next load.

## How it decides what to show

- **Sources** are listed in `industries.json`. Only credible organizations: professional associations, research nonprofits, university publishers and news outlets. No companies writing about their own products.
- **Filters.** Every item must mention AI. Items from Pew, NPR, HBR and MIT Sloan must also mention work, such as jobs, workers, consultants, coaches, advisors, freelancers or small business. Matching is whole-word, so "ai" doesn't match "said."
- **Links** must point to the outlet that published the item.
- **Up to 3 items per column,** newest first, from the last 180 days.
- **If a feed is down,** the items it published before stay up. A broken feed never empties a column.
- **Sources not yet confirmed:** Harvard Business Review and MIT Sloan Management Review. The job tries them every run. The `sources` list at the bottom of `consultants.json` shows which feeds worked on the last run.

## Adding the next industry page

Add another entry to `industries` in `industries.json` with its own key, columns and sources. The job publishes `docs/<key>.json` for it.

## Running it by hand

Requires Node 22 or newer.

```
node build.mjs
```
