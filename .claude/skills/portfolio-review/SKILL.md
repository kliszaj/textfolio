---
name: portfolio-review
description: Use when auditing an existing case study or portfolio entry against a staff, principal, or design-lead hiring bar — checking whether it reads as a decision-driven story rather than a project log, whether it hides its dead ends, and whether the whole portfolio is selective and positioned enough to earn an interview.
---

# Portfolio Review

## Overview

A portfolio review is an adversarial read, not a copy edit. The question
throughout is not "is this well written?" but "would a staff/principal/design
lead panel read this and conclude the person exercises judgement at that
level?" Most entries that fail do so quietly — nothing is wrong on the
sentence level, but the piece never shows a decision only *this* person could
have made.

This skill is the audit counterpart to `portfolio-writer`. That skill drafts
an entry from raw material; this one scrutinizes a drafted or existing entry
(or a whole portfolio) and reports what would make a senior panel skim past
it.

## When to Use

- A case study already exists (drafted by `portfolio-writer` or written any
  other way) and needs a pass before it goes live or goes to a specific
  employer
- Deciding which 2–3 projects out of a longer list actually belong in the
  portfolio
- A candidate is targeting **staff, principal, or design lead** — roles
  assessed on scope and judgement, not screen count

Not for: drafting new entries from raw material (`portfolio-writer` does
that), reviewing a résumé or cover letter, or judging visual craft in
isolation from the narrative.

## The Senior Bar This Skill Checks Against

Every criterion below exists to answer one question a hiring panel actually
asks: *why this person, not the other forty candidates?* Score each entry —
and the portfolio as a set — against these:

| # | Check | A senior (not staff-level) entry | What staff/principal/lead requires instead |
|---|---|---|---|
| 1 | **A distinct edge** | Reads like a generalist's project list | Every entry reinforces the same one or two-sentence positioning (e.g. "0→1 hardware interaction," "org-wide design strategy") |
| 2 | **Story, not outline** | Research → Wireframes → Design → Final UI | Problem → what was discovered → what assumption broke → directions tried and rejected → the turn → trade-offs → outcome |
| 3 | **Scope beyond UI** | A few polished screens | Visible ownership of product, users, and business — not just the interface |
| 4 | **The messy parts survive** | Dead ends and pivots are sanded off | The wrong turn, the rejected direction, and the retrospective are on the page, not hidden |
| 5 | **Selectivity** | Every project the person has touched | 2–3 entries, each proving a *different* strength, with weaker work deliberately left out |
| 6 | **Evidence, not decoration** | A static comp or a polished screenshot | The strongest available proof — live product, working demo, interactive prototype, motion — before falling back to stills |
| 7 | **The "why hire me" test** | Answerable only as "they've worked on cool stuff" | Answerable in one sentence after a 10-minute read, tied to the positioning in #1 |

## Workflow

1. **Establish the positioning.** Read across every entry (or ask what the
   candidate believes their edge is) before judging any single one — a check
   against #1 and #7 is meaningless without it.
2. **Score each entry against the table.** For each of checks 2–6, find the
   specific sentence or section that satisfies it, or note that nothing does.
   A vague gesture toward a trade-off is not evidence of one.
3. **Score the set, not just the parts.** Even if every entry individually
   passes, the portfolio fails #5 if three entries prove the same strength or
   there are more than 3–4 total.
4. **Rank findings by what most costs the candidate the interview.** A
   missing turn or a sanded-off dead end (#2, #4) is more damaging than weak
   prototype fidelity (#6) — narrative carries more weight than polish at this
   level.
5. **Report.** See Output below.

## Output

If the case studies under review live in a file this session can point to
(for example a `data/caseStudies.ts`-style source), use the `ReportFindings`
tool: one finding per gap, anchored to the file and the section it lives in,
`category` drawn from the table (`positioning`, `story-structure`,
`scope`, `hidden-mess`, `selectivity`, `craft-evidence`), and
`failure_scenario` stating what a staff-level reader would conclude from the
gap — not just that it's missing.

Otherwise, report as a ranked list per entry: what's missing, which check it
violates, and the one edit that would close it. Close with a verdict on the
set as a whole: which entries to keep, which to cut, and whether the
positioning actually holds across all of them.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Praising prose quality instead of judgement on display | Ignore sentence-level polish; ask what decision the paragraph proves |
| Treating every entry as independent | Score the set: redundant strengths or too many entries fail #5 even if each entry is individually strong |
| Accepting an asserted outcome | An outcome with no evidence or number is a #3/#4 gap, not a pass |
| Confusing "detailed" with "senior" | Length is not scope. A short entry with a real trade-off outranks a long one without one |
| Being polite about the mess | The dead ends are the point (#4) — flag their absence as a defect, not a stylistic choice |
