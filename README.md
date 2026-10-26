# Answer Bar industry feeds

Keeps the Key developments section of the answerbar.io industry pages current, the same way the Intelligence Desk stays current. Every 6 hours a GitHub job pulls a short list of credible feeds, keeps the items about AI and work, and publishes one small file per industry page. The page reads that file each time someone opens it.

This is separate from the Intelligence Desk. It does not touch the Desk's repo or its schedule.

## What it publishes

`https://raw.githubusercontent.com/stradtmann73/answerbar-industry-feeds/main/docs/consultants.json`

The consultants page block already points at that address. If you create the repo under a different account or name, change the `data-feed-url` line at the top of the page block to match.

## Setup

Nothing to configure. The job runs every 6 hours, and also right away whenever a file in `industries/`, `settings.json` or `build.mjs` changes. The page reads the file straight from this repo, so GitHub Pages is not needed. To run it by hand: **Actions tab > Refresh industry feeds > Run workflow.**

## How it decides what to show

- **Sources** are listed in each industry's own file in `industries/`. Only credible organizations: professional associations, research nonprofits, university publishers and news outlets. No companies writing about their own products.
  - Professional bodies: Institute of Management Consultants USA, EMCC Global, Chartered Management Institute
  - Research: Pew Research Center, Brookings, The Conversation
  - News: MIT Sloan Management Review, MIT Technology Review, NPR Business, NPR Technology, The Guardian, BBC News
- **Filters.** Every item must mention AI in its headline or opening. Items from Pew, MIT Sloan and NPR must also mention work, such as jobs, workers, consultants, coaches, advisors, freelancers or small business. Matching is whole-word, so "ai" doesn't match "said." Newsletter digests are skipped.
- **Links** must point to the outlet that published the item.
- **Recent first.** Up to 3 items per column from the last 30 days, newest first. Older items (up to 180 days) only come back when the whole section would otherwise show fewer than 4. Columns with nothing to show are hidden on the page.
- **One story, one entry.** When two outlets run the same story, only the newest one shows.
- **If a feed is down,** the items it published before stay up. A broken feed never empties a column.
- The `sources` list at the bottom of `consultants.json` shows which feeds worked on the last run.

## Tried and left out (October 16, 2026)

- **International Coaching Federation, Association for Coaching:** they block GitHub's servers (HTTP 403).
- **Institute of Coaching:** no feed at the expected address (HTTP 404).
- **Harvard Business Review:** the feed could not be reached.
- **Knowledge at Wharton:** blocks GitHub's servers (HTTP 403). Tried October 23, 2026.
- **Management Consultancies Association:** its feed is mostly member firms (KPMG, PwC and others) promoting their own reports.

## Adding the next industry page

Add one new file to `industries/`, named `<key>.json`, with its own key, title, columns and sources. Copy an existing file to start. The job publishes `docs/<key>.json` for it. Each industry is its own file, so a mistake in one is reported by name and skipped without touching the others. Shared numbers (items per column, days kept) live in `settings.json`.

In each source, `require` lists filter words. The build knows `ai`, `work` and `founders` (founders, startups, entrepreneurs, small business, solopreneurs, side hustles, self-employed, freelancers, new business, business owners). A word the build doesn't know is reported as an error for that industry only. Adding a new word means adding it to `TERMS` in `build.mjs`.

## Running it by hand

Requires Node 22 or newer.

```
node build.mjs
```
