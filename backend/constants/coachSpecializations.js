/**
 * Allowed coach specializations.
 * Keep this in sync with any frontend select options.
 */
const COACH_SPECIALIZATIONS = [
  'Personal Trainer',
  'Strength & Conditioning',
  'Bodybuilding',
  'Weight Loss',
  'CrossFit',
  'Functional Training',
  'Cardio Training',
  'Yoga',
  'Pilates',
  'Mobility & Flexibility',
  'Rehabilitation',
  'Physiotherapy',
  'Boxing',
  'Kickboxing',
  'Martial Arts',
  'Calisthenics',
  'Powerlifting',
  'Olympic Lifting',
  'Nutrition Coaching',
];

const COACH_SPECIALIZATION_SET = new Set(COACH_SPECIALIZATIONS);

function isValidCoachSpecialization(value) {
  return COACH_SPECIALIZATION_SET.has(value);
}

module.exports = { COACH_SPECIALIZATIONS, COACH_SPECIALIZATION_SET, isValidCoachSpecialization };

