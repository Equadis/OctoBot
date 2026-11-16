/* Portrait files for the Gear Planner's race dropdown. They are the Dressing Room's race portraits. */
const FILE_KEY=Object.freeze({'Human':'human','Orc':'orc','Dwarf':'dwarf','Night Elf':'nightelf','Undead':'undead','Tauren':'tauren','Gnome':'gnome','Troll':'troll','High Elf':'highelf','Goblin':'goblin'});
export const RACE_ICON_BASE='../outfitter/races/';
/** The portrait URL for a race and sex, or null for a race with no portrait (never a guessed file). */
export function raceIconUrl(race,sex){
  const key=FILE_KEY[race];
  return key&&(sex==='male'||sex==='female')?`${RACE_ICON_BASE}${key}_${sex}.png`:null;
}
