/**
 * Tier-0 Check: State Machine Monotonicity
 * Document: SLG_SnapOps_CTO_Implementation_Guide_v1 §4.3
 *
 * Rules:
 * - States cannot be removed (constitutional)
 * - New states must have handlers/transitions (constitutional if unmapped)
 * - Backward transitions are forbidden (constitutional)
 * - New states with handlers are allowed (warning)
 */

function referencedInAnyTransition(transitions, state) {
  if (!transitions) return false;
  for (const targets of Object.values(transitions)) {
    if (Array.isArray(targets) && targets.includes(state)) return true;
  }
  return false;
}

export function checkStateMonotonicity(base, curr) {
  const violations = [];
  const warnings = [];

  // Handle null/undefined baselines
  if (!base || !base.states || base.states.length === 0) {
    return {
      rule: "state_machine_monotonicity",
      violations: [],
      warnings: [{ rule: "state_machine_monotonicity", message: "no_baseline" }],
      skipped: true,
    };
  }

  const baseStates = base.states || [];
  const currStates = curr?.states || [];
  const currTransitions = curr?.transitions || {};

  // 1) States cannot be removed
  for (const s of baseStates) {
    if (!currStates.includes(s)) {
      violations.push({
        tier: 0,
        rule: "state_machine_monotonicity",
        kind: "state_removed",
        state: s,
        severity: "constitutional",
      });
    }
  }

  // 2) New states must have handlers
  for (const s of currStates) {
    if (!baseStates.includes(s)) {
      const hasHandler =
        (currTransitions && currTransitions[s]) ||
        referencedInAnyTransition(currTransitions, s);

      if (!hasHandler) {
        violations.push({
          tier: 0,
          rule: "state_machine_monotonicity",
          kind: "state_unmapped",
          state: s,
          severity: "constitutional",
        });
      } else {
        warnings.push({
          rule: "state_machine_monotonicity",
          kind: "state_added",
          state: s,
        });
      }
    }
  }

  // 3) Backward transition check (requires order)
  const order = curr?.order ?? base?.order;
  if (order && currTransitions) {
    const idx = Object.fromEntries(order.map((s, i) => [s, i]));
    for (const [from, tos] of Object.entries(currTransitions)) {
      if (!Array.isArray(tos)) continue;
      for (const to of tos) {
        if (idx[from] != null && idx[to] != null && idx[to] < idx[from]) {
          violations.push({
            tier: 0,
            rule: "state_machine_monotonicity",
            kind: "backward_transition",
            from,
            to,
            severity: "constitutional",
          });
        }
      }
    }
  }

  return {
    rule: "state_machine_monotonicity",
    violations,
    warnings,
    skipped: false,
  };
}
