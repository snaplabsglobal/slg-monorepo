/**
 * Tier-0 Check: Event Immutability
 * Document: SLG_SnapOps_CTO_Implementation_Guide_v1 §4.2
 *
 * Rules:
 * - Event types cannot be removed (constitutional)
 * - Fields cannot be removed (constitutional)
 * - Field types cannot change (constitutional)
 * - New fields are allowed (warning)
 * - New event types are allowed (warning)
 */

function typeSetEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]); // Already sorted
}

export function checkEventImmutability(base, curr) {
  const violations = [];
  const warnings = [];

  // Handle null/undefined baselines
  if (!base || Object.keys(base).length === 0) {
    return {
      rule: "event_immutability",
      violations: [],
      warnings: [{ rule: "event_immutability", message: "no_baseline" }],
      skipped: true,
    };
  }

  for (const [evt, baseFields] of Object.entries(base)) {
    const currFields = curr?.[evt] ?? null;

    // Event type removed → constitutional
    if (!currFields) {
      violations.push({
        tier: 0,
        rule: "event_immutability",
        kind: "event_removed",
        evt,
        severity: "constitutional",
      });
      continue;
    }

    for (const [field, baseTypeSet] of Object.entries(baseFields)) {
      if (!(field in currFields)) {
        // Field removed → constitutional
        violations.push({
          tier: 0,
          rule: "event_immutability",
          kind: "field_removed",
          evt,
          field,
          severity: "constitutional",
        });
      } else {
        const currTypeSet = currFields[field];
        if (!typeSetEqual(baseTypeSet, currTypeSet)) {
          // Field type changed → constitutional
          violations.push({
            tier: 0,
            rule: "event_immutability",
            kind: "field_type_changed",
            evt,
            field,
            base: baseTypeSet,
            curr: currTypeSet,
            severity: "constitutional",
          });
        }
      }
    }

    // New fields → warning (append-only is allowed)
    for (const field of Object.keys(currFields)) {
      if (!(field in baseFields)) {
        warnings.push({
          rule: "event_immutability",
          kind: "field_added",
          evt,
          field,
        });
      }
    }
  }

  // New event types → warning
  for (const evt of Object.keys(curr || {})) {
    if (!(evt in base)) {
      warnings.push({
        rule: "event_immutability",
        kind: "event_added",
        evt,
      });
    }
  }

  return {
    rule: "event_immutability",
    violations,
    warnings,
    skipped: false,
  };
}
