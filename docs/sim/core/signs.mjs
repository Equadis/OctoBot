// Stat modifiers read "+5 Stamina" or "-5 Stamina", never "+-5 Stamina" (the database text sometimes carries both signs).
export const fixSigns=text=>typeof text==='string'?text.replace(/\+\s*-(?=\d)/g,'-'):text;
