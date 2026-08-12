---
name: github-project-scrum
description: Use when creating, updating, or moving cards in the Cuadrala GitHub Project (ileido1/projects/1). Enforces Scrum-ready card format and state-transition rules.
---

# GitHub Project Scrum Rules — Cuadrala

This skill governs how the orchestrator works with the GitHub Project [AGILE](https://github.com/users/ileido1/projects/1/views/1) used as Cuadrala's product kanban.

## 1. Card format (Definition of Ready)

Every card created or updated in the project MUST follow this structure. Use Markdown in the body.

```markdown
## User Story
As a **[role]**, I want **[goal]**, so that **[benefit]**.

## Context
[2-3 sentences explaining why this card exists, what gap it closes, and which project/area it belongs to.]

## Acceptance Criteria (checkable)
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Definition of Done
- [ ] Implementation complete
- [ ] Tests added/updated and passing
- [ ] Lint/typecheck passing
- [ ] Code reviewed (or self-reviewed if solo)
- [ ] Card updated with evidence/links

## Technical Notes
[Relevant files, dependencies, links to specs, or blockers.]

## Estimation
- **Priority:** P0 / P1 / P2
- **Size:** XS / S / M / L / XL
```

### Title convention

`[<area>] Short imperative phrase referencing the US or capability`

Examples:
- `[API] Fix typecheck errors in services/api`
- `[Mobile] Implement court availability picker in create match`
- `[Docs] Sync BACKLOG_UNIFICADO.md with web implementation`

### Area prefixes

Use one of: `API`, `Mobile`, `Web`, `All`, `Docs`, `Infra`, `Product`.

## 2. State-transition rules

The project has these Status options: `Backlog`, `Ready`, `In progress`, `In review`, `Done`.

| Transition | When to move | Required evidence |
|------------|--------------|-------------------|
| **Backlog → Ready** | Card is refined, has full format, and is prioritized for the next sprint. | Body matches the template; Priority and Size set. |
| **Ready → In progress** | Work begins on the card. | Branch or work session started; update card with `Start date`. |
| **In progress → In review** | Implementation is complete and local verification passes. | Tests, lint, typecheck passing; PR opened or changes ready; link PR in `Linked pull requests`. |
| **In review → Done** | Changes are merged/accepted and verified in main. | PR merged or commit pushed; final verification run; `Target date` filled. |
| **Any → Backlog** | Card is blocked or deprioritized. | Reason added as a comment or in body under `Blockers`. |

### Orchestrator behavior per state

- **Backlog**: Do not work on it unless explicitly asked. Can refine format.
- **Ready**: Can be picked up when the user says "start" or when continuing a sprint.
- **In progress**: The active card. The orchestrator MUST update the card body with progress evidence before moving to review.
- **In review**: Wait for user/CI approval. Do not start new work on the same card unless asked.
- **Done**: Archive learning in Engram; do not reopen without user instruction.

## 3. Priority and Size conventions

### Priority

- **P0**: Blocks CI, production, or other work. Fix immediately.
- **P1**: Important feature or bug. Next sprint material.
- **P2**: Nice to have, tech debt, or post-MVP improvement.

### Size

- **XS**: ≤ 2 hours, ≤ 1 file, trivial change.
- **S**: Half day, few files, well-understood scope.
- **M**: 1-2 days, cross-file, may need brief design.
- **L**: 3-5 days, cross-package, requires spec/design.
- **XL**: > 1 week, program-level, must be split before starting.

## 4. Working with the kanban

When the user asks about project status, upcoming work, or "what's next":
1. Read the GitHub Project items via the GitHub MCP server or GraphQL.
2. Report by Status column and Priority.
3. Recommend the highest-priority `Ready` or `In progress` card.

When creating new cards:
1. Apply the full format above.
2. Set initial Status to `Backlog`.
3. Set Priority and Size based on the conventions above.

When updating existing cards:
1. Preserve the original intent.
2. Add progress evidence under a `## Progress` section.
3. Check off completed Acceptance Criteria and Definition of Done items.

## 5. Sane defaults for Cuadrala

- Default area for backend work: `API`
- Default area for Flutter work: `Mobile`
- Default area for Next.js work: `Web`
- Always link to relevant OpenSpec specs when available (e.g., `openspec/specs/mobile-player-alignment/spec.md`).
- Always run the required verification order for API changes: `typecheck` → `lint` → `test`.
- Always run `flutter analyze` and `flutter test` for Mobile changes.
- Always run `npm run lint` and `npm test` for Web changes.
