// Dressing room backgrounds from the Wowpedia "Dressing room" page
// (https://wowpedia.fandom.com/wiki/Dressing_room), limited to the nine classes and the ten races.
// Blizzard Entertainment artwork. The images are loaded from the wiki's image host rather than copied into this
// repository, and only the selected one is requested. Blood elf is used for High Elf.
const BASE = 'https://static.wikia.nocookie.net/wowpedia/images/';
const entry = (group, id, label, path) => Object.freeze({ group, id, label, url: `${BASE}${path}` });

export const BACKGROUNDS = Object.freeze([
  entry('Classes', 'class-druid', 'Druid', '8/8a/Dressing_room_%28druid%29.png'),
  entry('Classes', 'class-hunter', 'Hunter', 'd/dd/Dressing_room_%28hunter%29.png'),
  entry('Classes', 'class-mage', 'Mage', '7/70/Dressing_room_%28mage%29.png'),
  entry('Classes', 'class-paladin', 'Paladin', '4/43/Dressing_room_%28paladin%29.png'),
  entry('Classes', 'class-priest', 'Priest', 'b/b3/Dressing_room_%28priest%29.png'),
  entry('Classes', 'class-rogue', 'Rogue', '1/13/Dressing_room_%28rogue%29.png'),
  entry('Classes', 'class-shaman', 'Shaman', 'b/b5/Dressing_room_%28shaman%29.png'),
  entry('Classes', 'class-warlock', 'Warlock', '8/8b/Dressing_room_%28warlock%29.png'),
  entry('Classes', 'class-warrior', 'Warrior', 'd/dd/Dressing_room_%28warrior%29.png'),
  entry('Races', 'race-human', 'Human', '6/62/Dressing_room_%28human%29.png'),
  entry('Races', 'race-orc', 'Orc', '2/23/Dressing_room_%28orc%29.png'),
  entry('Races', 'race-dwarf', 'Dwarf', 'f/f3/Dressing_room_%28dwarf%29.png'),
  entry('Races', 'race-nightelf', 'Night Elf', 'd/d2/Dressing_room_%28night_elf%29.png'),
  entry('Races', 'race-undead', 'Undead', '3/32/Dressing_room_%28undead%29.png'),
  entry('Races', 'race-tauren', 'Tauren', '1/10/Dressing_room_%28tauren%29.png'),
  entry('Races', 'race-gnome', 'Gnome', 'f/f3/Dressing_room_%28gnome%29.png'),
  entry('Races', 'race-troll', 'Troll', '9/95/Dressing_room_%28troll%29.png'),
  entry('Races', 'race-highelf', 'High Elf', '3/31/Dressing_room_%28blood_elf%29.png'),
  entry('Races', 'race-goblin', 'Goblin', '4/47/Dressing_room_%28goblin%29.png'),
]);

export function findBackground(id) {
  return BACKGROUNDS.find(background => background.id === id) || null;
}
