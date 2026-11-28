-- Vanilla 1.12 client APIs; local-only, explicit capture, no names or account data.
local function say(message)
 DEFAULT_CHAT_FRAME:AddMessage("OctoStatCapture: "..message)
end
local function capture()
 if not UnitExists("player") or UnitIsDeadOrGhost("player") or UnitAffectingCombat("player") then
  say("Must be alive and out of combat."); return
 end
 for slot=0,19 do
  if GetInventoryItemLink("player",slot) or GetInventoryItemTexture("player",slot) then
   say("Unequip every item (including ammo, shirts and tabards)."); return
  end
 end
 for i=1,32 do
  if UnitBuff("player",i) or UnitDebuff("player",i) then
   say("Remove all visible buffs and debuffs, then retry."); return
  end
 end
 local _,class=UnitClass("player")
 local _,race=UnitRace("player")
 if class=="DRUID" and GetShapeshiftForm()~=0 then say("Leave shapeshift form."); return end
 local talentPoints=0
 for tab=1,GetNumTalentTabs() do
  for i=1,GetNumTalents(tab) do
   local _,_,_,_,rank=GetTalentInfo(tab,i)
   if type(rank)~="number" then say("Talent data not ready."); return end
   talentPoints=talentPoints+rank
  end
 end
 if talentPoints~=0 then say("Capture requires zero spent talent points."); return end
 local base,effective,positive,negative={},{},{},{}
 for i=1,5 do
  local a,b,c,d=UnitStat("player",i)
  if type(a)~="number" or type(b)~="number" or type(c)~="number" or type(d)~="number" then
   say("Character attributes not ready."); return
  end
  base[i]=a;effective[i]=b;positive[i]=c;negative[i]=d
 end
 if not race or not class then say("Character identity fields not ready."); return end
 local level=UnitLevel("player")
 local health,power,powerType=UnitHealthMax("player"),UnitManaMax("player"),UnitPowerType("player")
 if not health or health<=0 or not power or powerType==nil then say("Resource data not ready."); return end
 local line=table.concat({"OCTOSTAT1",race,class,level,table.concat(base,","),table.concat(effective,","),table.concat(positive,","),table.concat(negative,","),health,power,powerType,"clean"},"|")
 if type(OctoStatCaptures)~="table" then OctoStatCaptures={} end
 for i=1,table.getn(OctoStatCaptures) do
  if OctoStatCaptures[i]==line then say("Identical capture already saved."); return end
 end
 table.insert(OctoStatCaptures,line)
 say("Captured anonymously. Log out or /reload to save OctoStatCapture.lua.")
end
SLASH_OCTOSTATCAPTURE1="/octostat"
SlashCmdList["OCTOSTATCAPTURE"]=function() capture() end
