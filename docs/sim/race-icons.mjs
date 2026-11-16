/* Male and female portraits of the selected race, shown left of the Race selector. The images are the Dressing Room's race portraits. */
const FILE_KEY=Object.freeze({'Human':'human','Orc':'orc','Dwarf':'dwarf','Night Elf':'nightelf','Undead':'undead','Tauren':'tauren','Gnome':'gnome','Troll':'troll','High Elf':'highelf','Goblin':'goblin'});
export const RACE_ICON_BASE='../outfitter/races/';
/** The portrait URL for a race and sex, or null for a race with no portrait (never a guessed file). */
export function raceIconUrl(race,sex){
  const key=FILE_KEY[race];
  return key&&(sex==='male'||sex==='female')?`${RACE_ICON_BASE}${key}_${sex}.png`:null;
}
/** Points the two portraits at the chosen race. Unknown races hide the pair instead of showing a wrong face. */
export function updateRaceIcons(doc,race){
  const box=doc.getElementById('race-icons');
  if(!box)return;
  let shown=false;
  for(const sex of ['male','female']){
    const img=doc.getElementById('race-icon-'+sex),url=raceIconUrl(race,sex);
    if(!img)continue;
    if(url){img.src=url;img.alt=`${race} ${sex}`;img.title=`${race} ${sex}`;shown=true;}
  }
  box.hidden=!shown;
}
