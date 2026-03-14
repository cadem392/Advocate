# Backend Docs

This folder defines the backend documentation set for `Advocate`.

The current codebase already has a working MVP pipeline:

1. `POST /api/structure`
2. `POST /api/analyze`
3. `POST /api/strategy`
4. `POST /api/draft`

The docs in this folder are intended to turn that MVP into a documented, extensible backend architecture for:

- overall website functionality
- AI pipeline orchestration
- attack tree generation
- neural-network-assisted ranking and anomaly detection
- future persistence, retrieval, and observability

## Files

- [`01-documentation-plan.md`](/Users/nicol/Desktop/Hackthon/Advocate-remote/docs/backend/01-documentation-plan.md)
  Backend documentation roadmap, required doc set, and implementation priorities.
- [`02-ai-attack-tree-integration.md`](/Users/nicol/Desktop/Hackthon/Advocate-remote/docs/backend/02-ai-attack-tree-integration.md)
  Technical architecture for integrating model outputs with the attack plan and attack tree.
- [`03-model-artifacts-and-backend-integration.md`](/Users/nicol/Desktop/Hackthon/Advocate-remote/docs/backend/03-model-artifacts-and-backend-integration.md)
  Interpretation of the provided neural-network artifacts, their domain fit, and the recommended backend integration pattern.

## Recommended Order

1. Finalize the backend architecture and scope.
2. Lock the domain/data model.
3. Document the API contracts.
4. Define the AI orchestration and graph-generation rules.
5. Add persistence, retrieval, and observability docs.
