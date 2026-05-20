const { pool } = require('../../config/db');

/**
 * Build a compact catalog of gyms, plans, and coaches for the AI system prompt.
 */
async function buildCatalog({ location, max_budget: maxBudget } = {}) {
  const [rows] = await pool.query(
    `
      SELECT
        g.id AS gym_id,
        g.name AS gym_name,
        g.location,
        g.session_price,
        g.rating_average,
        g.working_hours,
        g.working_days,
        p.id AS plan_id,
        p.name AS plan_name,
        p.price AS plan_price,
        p.duration_days,
        p.description AS plan_description,
        c.id AS coach_id,
        c.specialization,
        c.bio,
        u.first_name AS coach_first_name,
        u.last_name AS coach_last_name
      FROM gyms g
      LEFT JOIN subscription_plans p
        ON p.gym_id = g.id AND p.deleted_at IS NULL AND p.is_active = 1
      LEFT JOIN coaches c
        ON c.gym_id = g.id AND c.deleted_at IS NULL AND c.is_active = 1
      LEFT JOIN users u ON u.id = c.user_id AND u.deleted_at IS NULL
      WHERE g.deleted_at IS NULL AND g.is_active = 1
      ORDER BY g.rating_average DESC, g.name ASC
      LIMIT 500
    `,
  );

  const gymMap = new Map();
  const locationNeedle = location ? location.toLowerCase() : null;

  for (const row of rows) {
    if (!gymMap.has(row.gym_id)) {
      gymMap.set(row.gym_id, {
        id: row.gym_id,
        name: row.gym_name,
        location: row.location,
        session_price: Number(row.session_price) || 0,
        rating_average: Number(row.rating_average) || 0,
        working_hours: row.working_hours,
        working_days: row.working_days,
        plans: [],
        coaches: [],
      });
    }
    const gym = gymMap.get(row.gym_id);

    if (row.plan_id && !gym.plans.some((p) => p.id === row.plan_id)) {
      gym.plans.push({
        id: row.plan_id,
        name: row.plan_name,
        price: Number(row.plan_price) || 0,
        duration_days: row.duration_days,
        description: row.plan_description,
      });
    }

    if (row.coach_id && !gym.coaches.some((c) => c.id === row.coach_id)) {
      gym.coaches.push({
        id: row.coach_id,
        name: `${row.coach_first_name || ''} ${row.coach_last_name || ''}`.trim() || 'Coach',
        specialization: row.specialization,
        bio: row.bio ? String(row.bio).slice(0, 200) : null,
      });
    }
  }

  let gyms = Array.from(gymMap.values());

  if (locationNeedle) {
    const matched = gyms.filter((g) => (g.location || '').toLowerCase().includes(locationNeedle));
    const rest = gyms.filter((g) => !(g.location || '').toLowerCase().includes(locationNeedle));
    gyms = [...matched, ...rest];
  }

  if (maxBudget != null && !Number.isNaN(maxBudget)) {
    gyms = gyms.filter((g) => {
      const planPrices = g.plans.map((p) => p.price).filter((p) => p > 0);
      const minPlan = planPrices.length ? Math.min(...planPrices) : null;
      const sessionPrice = g.session_price || 0;
      const cheapest = minPlan != null ? Math.min(minPlan, sessionPrice || minPlan) : sessionPrice;
      return cheapest <= maxBudget || cheapest === 0;
    });
  }

  return gyms.slice(0, 20);
}

/**
 * Opaque refs for AI (G1, P1-1, C1-2) — never expose numeric database ids in prompts or user text.
 */
function buildCatalogRefs(gyms) {
  const refs = { gym: {}, plan: {}, coach: {} };

  const catalogLines = gyms.map((g, gi) => {
    const gRef = `G${gi + 1}`;
    refs.gym[gRef] = g.id;

    const plans = g.plans.length
      ? g.plans
          .map((p, pi) => {
            const pRef = `P${gi + 1}-${pi + 1}`;
            refs.plan[pRef] = p.id;
            return `${pRef} "${p.name}" $${p.price}/${p.duration_days}d`;
          })
          .join('; ')
      : 'no plans';

    const coaches = g.coaches.length
      ? g.coaches
          .map((c, ci) => {
            const cRef = `C${gi + 1}-${ci + 1}`;
            refs.coach[cRef] = c.id;
            return `${cRef} ${c.name} (${c.specialization || 'general'})`;
          })
          .join('; ')
      : 'no coaches';

    return [
      `${gRef} "${g.name}" location="${g.location || 'N/A'}" rating=${g.rating_average}`,
      `  session_price=$${g.session_price} hours=${g.working_hours || 'N/A'} days=${g.working_days || 'N/A'}`,
      `  plans: ${plans}`,
      `  coaches: ${coaches}`,
    ].join('\n');
  });

  return {
    catalogText: catalogLines.length ? catalogLines.join('\n\n') : 'No gyms are currently available in the catalog.',
    refs,
    gyms,
  };
}

function resolveRefRecommendations(parsed, refs, gyms) {
  let gymId = parsed.gym_ref && refs.gym[parsed.gym_ref] != null
    ? refs.gym[parsed.gym_ref]
    : null;
  const planId = parsed.plan_ref && refs.plan[parsed.plan_ref] != null
    ? refs.plan[parsed.plan_ref]
    : null;
  const coachId = parsed.coach_ref && refs.coach[parsed.coach_ref] != null
    ? refs.coach[parsed.coach_ref]
    : null;

  if (!gymId && coachId) {
    const gymWithCoach = gyms.find((g) => g.coaches.some((c) => c.id === coachId));
    if (gymWithCoach) gymId = gymWithCoach.id;
  }

  return validateRecommendations(
    { gym_id: gymId, plan_id: planId, coach_id: coachId, training_plan: parsed.training_plan },
    gyms,
  );
}

function validateRecommendations(recommendations, gyms) {
  if (!recommendations) return null;

  const gym = recommendations.gym_id
    ? gyms.find((g) => g.id === recommendations.gym_id)
    : null;

  let plan_id = recommendations.plan_id;
  let coach_id = recommendations.coach_id;

  if (gym) {
    if (plan_id && !gym.plans.some((p) => p.id === plan_id)) plan_id = null;
    if (coach_id && !gym.coaches.some((c) => c.id === coach_id)) coach_id = null;
  } else {
    plan_id = null;
    coach_id = null;
  }

  const plan = plan_id && gym ? gym.plans.find((p) => p.id === plan_id) : null;
  const coach = coach_id && gym ? gym.coaches.find((c) => c.id === coach_id) : null;

  if (!gym && !plan && !coach && !recommendations.training_plan) return null;

  return {
    gym: gym
      ? {
          name: gym.name,
          location: gym.location || null,
          path: `/gyms/${gym.id}`,
        }
      : null,
    plan: plan
      ? {
          name: plan.name,
          price: plan.price,
          duration_days: plan.duration_days,
        }
      : null,
    coach: coach
      ? {
          name: coach.name,
          specialization: coach.specialization || null,
        }
      : null,
    training_plan: recommendations.training_plan || null,
  };
}

module.exports = {
  buildCatalog,
  buildCatalogRefs,
  resolveRefRecommendations,
  validateRecommendations,
};
