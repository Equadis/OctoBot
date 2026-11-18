-- Read-only manual capture, compatible with the 1.12 client.
-- Does not export character names or automatically remove equipment/buffs.
OctoSimCaptures = OctoSimCaptures or {}
local function capture()
 local race = UnitRace("player")
 local _, class = UnitClass("player")
 local build, _, date = GetBuildInfo()
 local row = {race=race,classId=string.lower(class or ""),level=UnitLevel("player"),realm=GetRealmName(),clientBuild=build,clientDate=date,capturedAt=time(),attributes={},equipment={},auras={},spellbook={},healthMax=UnitHealthMax("player"),powerMax=UnitManaMax("player"),powerType=UnitPowerType("player")}
 for i=1,5 do
  local base,effective,positive,negative=UnitStat("player",i)
  row.attributes[i]={base=base,effective=effective,positive=positive,negative=negative}
 end
 for i=0,19 do
  local link=GetInventoryItemLink("player",i)
  if link then table.insert(row.equipment,{slot=i,link=link}) end
 end
 for i=1,32 do
  local buff=UnitBuff("player",i)
  local debuff=UnitDebuff("player",i)
  if buff then table.insert(row.auras,{kind="buff",texture=buff}) end
  if debuff then table.insert(row.auras,{kind="debuff",texture=debuff}) end
 end
 for tab=1,GetNumSpellTabs() do
  local _,_,offset,count=GetSpellTabInfo(tab)
  for i=offset+1,offset+count do
   local name,rank=GetSpellName(i,BOOKTYPE_SPELL)
   if name then table.insert(row.spellbook,{index=i,name=name,rank=rank or ""}) end
  end
 end
 table.insert(OctoSimCaptures,row)
 DEFAULT_CHAT_FRAME:AddMessage("OctoSim: observation saved. Log out to flush SavedVariables. This is not a verified base-stat row.")
end
SLASH_OCTOSIMCAPTURE1="/octocapture"
SlashCmdList["OCTOSIMCAPTURE"]=capture
