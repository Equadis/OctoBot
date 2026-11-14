// Character appearance (skin colour, face, hair style and colour, facial hair, markings, piercings, horns, tusks, ...).
// The option lists come from the model library's `charactercustomization/<id>.json`; this module only holds the
// pure helpers so they can be tested without a browser. An appearance is stored as { [optionId]: choiceId }.

const positiveInteger = value => Number.isSafeInteger(value) && value > 0 && value < 1e9;

/** Keep only well-formed { optionId: choiceId } pairs. Anything else is dropped rather than trusted. */
export function sanitiseLook(value) {
  const look = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return look;
  let count = 0;
  for (const [key, choice] of Object.entries(value)) {
    const optionId = Number(key);
    if (!positiveInteger(optionId) || !positiveInteger(choice) || ++count > 16) continue;
    look[optionId] = choice;
  }
  return look;
}

/** Options that can actually be chosen, in the library's own order, each with its choices in order. */
export function visibleOptions(customization) {
  const options = Array.isArray(customization?.Options) ? customization.Options : [];
  return options
    .map(option => ({
      id: option.Id,
      name: String(option.Name || 'Option'),
      order: option.OrderIndex ?? 0,
      choices: (Array.isArray(option.Choices) ? option.Choices : [])
        .map(choice => ({ id: choice.Id, name: String(choice.Name || ''), order: choice.OrderIndex ?? 0 }))
        .sort((a, b) => a.order - b.order),
    }))
    .filter(option => positiveInteger(option.id) && option.choices.length > 0)
    .sort((a, b) => a.order - b.order);
}

/** The selected choice for an option: the saved one if it still exists, otherwise the first. */
export function selectedChoice(option, look) {
  return option.choices.find(choice => choice.id === look?.[option.id]) || option.choices[0];
}

/** Complete { optionId, choiceId } list for the viewer, filling every unset option with its first choice. */
export function lookPairs(options, look) {
  return options.map(option => ({ optionId: option.id, choiceId: selectedChoice(option, look).id }));
}

/** The look after moving one option forwards or backwards, wrapping at both ends. */
export function stepLook(options, look, optionId, delta) {
  const option = options.find(candidate => candidate.id === optionId);
  if (!option) return sanitiseLook(look);
  const current = option.choices.indexOf(selectedChoice(option, look));
  const next = option.choices[(current + delta + option.choices.length) % option.choices.length];
  return { ...sanitiseLook(look), [optionId]: next.id };
}

/** Position text such as "3 / 12", or the choice name when the library provides one. */
export function choiceLabel(option, look) {
  const index = option.choices.indexOf(selectedChoice(option, look));
  const name = option.choices[index].name;
  return `${name ? name + ' · ' : ''}${index + 1} / ${option.choices.length}`;
}
