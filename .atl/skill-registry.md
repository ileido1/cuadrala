# Skill Registry — Cuadrala

Generated: 2026-05-08

## User Skills (`~/.config/opencode/skills/`)

### branch-pr
- **Trigger**: creating, opening, or preparing PRs for review.
- **Path**: `~/.config/opencode/skills/branch-pr/SKILL.md`
- **Rules**: Check issues first before creating PR. Use conventional commits. Keep commits reviewable. Link related issues.

### chained-pr
- **Trigger**: PRs over 400 lines, stacked PRs, review slices.
- **Path**: `~/.config/opencode/skills/chained-pr/SKILL.md`
- **Rules**: Split oversized changes into chained PRs. Each chain must be independently reviewable. Label with chain order.

### cognitive-doc-design
- **Trigger**: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs.
- **Path**: `~/.config/opencode/skills/cognitive-doc-design/SKILL.md`
- **Rules**: Reduce cognitive load. One concept per section. Progressive disclosure. Use concrete examples before abstractions.

### comment-writer
- **Trigger**: PR feedback, issue replies, reviews, Slack messages, or GitHub comments.
- **Path**: `~/.config/opencode/skills/comment-writer/SKILL.md`
- **Rules**: Warm and direct tone. Start with what works before critique. Be specific with examples. No vague praise.

### go-testing
- **Trigger**: Go tests, go test coverage, Bubbletea teatest, golden files.
- **Path**: `~/.config/opencode/skills/go-testing/SKILL.md`
- **Rules**: Focused Go testing patterns. Use golden files for complex output. Prefer table-driven tests.

### issue-creation
- **Trigger**: creating GitHub issues, bug reports, or feature requests.
- **Path**: `~/.config/opencode/skills/issue-creation/SKILL.md`
- **Rules**: Check for existing issues first. Reproduce before reporting. Use issue templates. Include environment context.

### judgment-day
- **Trigger**: judgment day, dual review, adversarial review, juzgar.
- **Path**: `~/.config/opencode/skills/judgment-day/SKILL.md`
- **Rules**: Blind dual review. Fix confirmed issues only. Re-judge after fixes. No speculative changes.

### skill-creator
- **Trigger**: new skills, agent instructions, documenting AI usage patterns.
- **Path**: `~/.config/opencode/skills/skill-creator/SKILL.md`
- **Rules**: Create LLM-first skills with valid frontmatter. Optional license, required author metadata. Keep 180-450 body tokens.

### work-unit-commits
- **Trigger**: implementation, commit splitting, chained PRs, or keeping tests and docs with code.
- **Path**: `~/.config/opencode/skills/work-unit-commits/SKILL.md`
- **Rules**: Plan commits as reviewable work units. Tests and docs travel with code. Each commit passes CI independently.

## Project Skills (`apps/mobile/.agents/skills/`)

### accessibility
- **Trigger**: "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible".
- **Path**: `apps/mobile/.agents/skills/accessibility/SKILL.md`
- **Rules**: Follow WCAG 2.2 AA minimum. POUR principles (Perceivable, Operable, Understandable, Robust). Use semantic HTML. Maintain 4.5:1 contrast ratio. Support keyboard-only navigation. Test with screen readers.

### bash-defensive-patterns
- **Trigger**: writing robust shell scripts, CI/CD pipelines, system utilities requiring fault tolerance.
- **Path**: `apps/mobile/.agents/skills/bash-defensive-patterns/SKILL.md`
- **Rules**: Always `set -Eeuo pipefail`. Trap EXIT/ERR for cleanup. Validate arguments early. Quote all variable expansions. Prefer `[[ ]]` over `[ ]`. Never use `eval`. Use `errexit` consistently.

### dart-best-practices
- **Trigger**: writing or reviewing Dart code, idiomatic Dart usage.
- **Path**: `apps/mobile/.agents/skills/dart-best-practices/SKILL.md`
- **Rules**: Prefer multi-line strings (`'''`) for large blocks. Follow Effective Dart guidelines. Use `const` constructors where possible. Avoid `null` battles — use `?` and `!` intentionally.

### flutter-animations
- **Trigger**: working with implicit/explicit animations, Hero transitions, staggered animations, physics-based motion, animation bugs.
- **Path**: `apps/mobile/.agents/skills/flutter-animations/SKILL.md`
- **Rules**: Inspect widget lifecycle and route structure before animation changes. Animate with existing state model. No hidden animation state. Verify analyzer-clean. Consider `MediaQuery.reducedMotion`.

### flutter-expert
- **Trigger**: Flutter 3+ cross-platform apps, widget development, Bloc/Riverpod state, GoRouter navigation, platform channels, performance.
- **Path**: `apps/mobile/.agents/skills/flutter-expert/SKILL.md`
- **Rules**: Match existing project patterns. Prefer composition over inheritance. Use `const` widgets for performance. Keep business logic out of widgets. Test state management independently.

### flutter-testing
- **Trigger**: unit/widget/integration tests, mocktail/mockito, golden tests, pump/pumpAndSettle issues, flaky tests, CI test commands.
- **Path**: `apps/mobile/.agents/skills/flutter-testing/SKILL.md`
- **Rules**: Inspect project before writing tests. Choose correct test layer. Use mocktail for Dart-only, MethodChannelMock for platform channels. Always `tearDown(() => cubit.close())`. Register fallback values for custom types.

### frontend-design
- **Trigger**: building web components, pages, artifacts, posters, applications, HTML/CSS layouts, styling web UI.
- **Path**: `apps/mobile/.agents/skills/frontend-design/SKILL.md`
- **Rules**: Choose bold aesthetic direction before coding. Typography-first approach. Avoid generic AI aesthetics. Production-grade code with working functionality. Cohesive visual system.

### seo
- **Trigger**: "improve SEO", "optimize for search", "fix meta tags", "structured data", "sitemap", "search engine optimization".
- **Path**: `apps/mobile/.agents/skills/seo/SKILL.md`
- **Rules**: Technical SEO first (crawlability, indexability). Meta tags, structured data (JSON-LD), sitemap.xml, robots.txt. Core Web Vitals matter. Canonical URLs to avoid duplicate content.

## Project Convention Files

- `AGENTS.md` — Project overview, commands, architecture, testing conventions, orchestrator workflow, naming conventions
- `.cursor/agents/orchestrator.md` — Full orchestrator protocol with DAG
- `.cursor/rules/clean-architecture.mdc` — API layer rules + DI patterns
- `.cursor/rules/flutter-bloc.mdc` — BLoC/Cubit implementation + testing guide
- `.cursor/rules/tdd-guidelines.mdc` — TDD cycle + integration test patterns
- `.cursor/rules/naming-conventions.mdc` — API naming conventions
- `.cursor/rules/code-comments.mdc` — Comment style (Spanish)
