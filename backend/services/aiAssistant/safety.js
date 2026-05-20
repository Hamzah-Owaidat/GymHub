const TRAINING_TYPES = new Set([
  'bodybuilding',
  'calisthenics',
  'cardio',
  'crossfit',
  'yoga',
  'general_fitness',
  'weight_loss',
  'strength',
]);

const GENDERS = new Set(['male', 'female', 'other', 'prefer_not_to_say']);

const FREE_TIME_OPTIONS = new Set([
  'early_morning',
  'morning',
  'afternoon',
  'evening',
  'night',
  'weekends',
  'flexible',
]);

const MAX_MESSAGE_LEN = 2000;
const MAX_HISTORY = 12;
const MAX_LOCATION_LEN = 120;
const MAX_SCHEDULE_LEN = 200;
const MAX_GOALS_LEN = 500;

function stripControlChars(str) {
  return String(str || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function sanitizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return {};

  const profile = {};

  const age = Number(raw.age);
  if (!Number.isNaN(age) && age >= 13 && age <= 100) profile.age = Math.round(age);

  const weight = Number(raw.weight_kg);
  if (!Number.isNaN(weight) && weight >= 30 && weight <= 300) profile.weight_kg = Math.round(weight * 10) / 10;

  const height = Number(raw.height_cm);
  if (!Number.isNaN(height) && height >= 100 && height <= 250) profile.height_cm = Math.round(height);

  const gender = stripControlChars(raw.gender).toLowerCase();
  if (GENDERS.has(gender)) profile.gender = gender;

  const trainingType = stripControlChars(raw.training_type).toLowerCase().replace(/\s+/g, '_');
  if (TRAINING_TYPES.has(trainingType)) profile.training_type = trainingType;

  const freeTime = stripControlChars(raw.free_time).toLowerCase();
  if (FREE_TIME_OPTIONS.has(freeTime)) profile.free_time = freeTime;

  const workSchedule = stripControlChars(raw.work_schedule).slice(0, MAX_SCHEDULE_LEN);
  if (workSchedule) profile.work_schedule = workSchedule;

  const location = stripControlChars(raw.location).slice(0, MAX_LOCATION_LEN);
  if (location) profile.location = location;

  const goals = stripControlChars(raw.goals).slice(0, MAX_GOALS_LEN);
  if (goals) profile.goals = goals;

  const maxBudget = Number(raw.max_budget);
  if (!Number.isNaN(maxBudget) && maxBudget >= 0 && maxBudget <= 100000) {
    profile.max_budget = Math.round(maxBudget * 100) / 100;
  }

  return profile;
}

function sanitizeMessage(message) {
  const text = stripControlChars(message).slice(0, MAX_MESSAGE_LEN);
  return text;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY)
    .map((item) => {
      const role = item && item.role === 'assistant' ? 'assistant' : 'user';
      const content = stripControlChars(item && item.content).slice(0, MAX_MESSAGE_LEN);
      if (!content) return null;
      return { role, content };
    })
    .filter(Boolean);
}

function detectPromptInjection(text) {
  const lower = text.toLowerCase();
  const patterns = [
    'ignore previous',
    'ignore all previous',
    'disregard your instructions',
    'you are now',
    'system prompt',
    'jailbreak',
    'reveal api key',
    'reveal secret',
  ];
  return patterns.some((p) => lower.includes(p));
}

module.exports = {
  TRAINING_TYPES,
  GENDERS,
  FREE_TIME_OPTIONS,
  sanitizeProfile,
  sanitizeMessage,
  sanitizeHistory,
  detectPromptInjection,
  MAX_MESSAGE_LEN,
};
