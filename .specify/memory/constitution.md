<!--
Sync Impact Report:
Version change: N/A → 1.0.0 (initial constitution)
Modified principles: N/A (new constitution)
Added sections: Core Principles (6 principles), Governance
Removed sections: N/A
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section references updated
  ✅ spec-template.md - No changes needed (already generic)
  ✅ tasks-template.md - No changes needed (already generic)
Follow-up TODOs: None
-->

# WorkLog Constitution

## Core Principles

### I. Core Value

The primary output is a structured career asset derived from real GitHub activity. Learning support, scheduling, or education features are explicitly out of scope. The product transforms development activity into evaluation-ready assets, not educational content or task management.

**Rationale**: Focus ensures the product remains a transformation tool rather than becoming a learning platform or scheduler. This boundary prevents scope creep and maintains product clarity.

### II. Role of AI

AI is used for transformation and structuring, not evaluation or judgment. Avoid scoring, grading, or ranking user performance. Outputs must be explainable, reproducible, and schema-driven.

**Rationale**: The product assists in asset creation, not assessment. Explainable and schema-driven outputs ensure users can understand and verify the transformation process, maintaining trust and transparency.

### III. Product Philosophy

The user's primary work happens on GitHub, not inside this product. The product should feel passive and supportive, not demanding attention. Prefer "automatic accumulation" over "manual input".

**Rationale**: Users are developers focused on their GitHub work. The product should enhance their workflow without becoming a distraction or requiring significant time investment. Automatic accumulation respects user time and aligns with the transformation purpose.

### IV. UX Principles

Minimize required user actions. Favor approval and light editing over full creation. Inbox-style flows are preferred to dashboard-heavy designs.

**Rationale**: Reduced friction increases adoption and aligns with the passive, supportive philosophy. Approval workflows leverage automatic accumulation while maintaining user control. Inbox-style interfaces prioritize actionable items over status displays.

### V. Technical Constraints

Deterministic pipelines are preferred over autonomous agents. LLM outputs must conform to fixed schemas. ADK or agent-based approaches should only be suggested where branching workflows or multi-tool orchestration are clearly required.

**Rationale**: Deterministic pipelines ensure reproducibility and explainability. Fixed schemas guarantee consistent output structure and enable validation. Limiting agent-based approaches reduces complexity and maintains predictability.

### VI. Non-goals

Do not introduce learning plans, task scheduling, or curriculum management. Do not propose social features such as peer review or public sharing by default. Do not assume enterprise-scale requirements unless explicitly stated.

**Rationale**: These boundaries prevent scope expansion into adjacent domains (education, social networking, enterprise tools) that conflict with the core transformation purpose. Keeping the product focused ensures it remains effective at its primary function.

## Governance

This constitution supersedes all other project practices and guidelines. Amendments require:

1. **Documentation**: Clear rationale for the change, impact analysis, and migration considerations
2. **Versioning**: Semantic versioning (MAJOR.MINOR.PATCH):
   - **MAJOR**: Backward incompatible governance/principle removals or redefinitions
   - **MINOR**: New principle/section added or materially expanded guidance
   - **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements
3. **Compliance Review**: All PRs and feature specifications must verify compliance with applicable principles
4. **Conflict Resolution**: If a future request conflicts with these principles, the conflict must be highlighted and a compliant alternative suggested before proceeding

All development work must align with these principles. When principles conflict with a request, developers must:

- Highlight the specific conflict
- Propose a compliant alternative
- Document any approved exceptions with justification

**Version**: 1.0.0 | **Ratified**: 2026-01-26 | **Last Amended**: 2026-01-26
