-- Experimental 1.12 client recorder. Records only explicitly selected combat
-- message events during a user-started session. No network or automatic upload.
local events={
 "CHAT_MSG_COMBAT_SELF_HITS","CHAT_MSG_COMBAT_SELF_MISSES",
 "CHAT_MSG_SPELL_SELF_DAMAGE","CHAT_MSG_SPELL_SELF_BUFF",
 "CHAT_MSG_SPELL_PERIODIC_SELF_DAMAGE","CHAT_MSG_SPELL_PERIODIC_SELF_BUFFS",
 "CHAT_MSG_COMBAT_PET_HITS","CHAT_MSG_COMBAT_PET_MISSES",
 "CHAT_MSG_SPELL_PET_DAMAGE","CHAT_MSG_SPELL_PET_BUFF",
 "CHAT_MSG_COMBAT_CREATURE_VS_SELF_HITS","CHAT_MSG_COMBAT_CREATURE_VS_SELF_MISSES",
 "CHAT_MSG_SPELL_CREATURE_VS_SELF_DAMAGE","CHAT_MSG_SPELL_CREATURE_VS_SELF_BUFF",
 "CHAT_MSG_SPELL_PERIODIC_CREATURE_DAMAGE","CHAT_MSG_SPELL_PERIODIC_CREATURE_BUFFS",
 "CHAT_MSG_COMBAT_HOSTILE_DEATH","CHAT_MSG_COMBAT_FRIENDLY_DEATH"
}
local frame=CreateFrame("Frame")
local started,session,n=nil,nil,0
local cap=25000
local function say(s) DEFAULT_CHAT_FRAME:AddMessage("OctoCombatCapture: "..s) end
local function hex(s)
 local out={}
 for i=1,string.len(s) do out[i]=string.format("%02x",string.byte(s,i)) end
 return table.concat(out)
end
local function append(kind,payload)
 if not started then return end
 local ms=math.floor((GetTime()-started)*1000+.5)
 n=n+1
 table.insert(OctoCombatCaptures,table.concat({"OCTOCOMBAT1",session,n,ms,kind,hex(payload or "")},"|"))
end
local function stop(reason)
 if not started then say("No active capture.");return end
 append("END",reason)
 started=nil
 for i=1,table.getn(events) do frame:UnregisterEvent(events[i]) end
 say("Capture stopped. Log out or /reload to save the local file.")
end
local function start()
 if started then say("Already recording.");return end
 if type(OctoCombatCaptures)~="table" then OctoCombatCaptures={} end
 if table.getn(OctoCombatCaptures)>100000 then say("Saved capture limit reached. Export then clear.");return end
 session=tostring(table.getn(OctoCombatCaptures)+1)
 started=GetTime();n=0
 append("START","")
 for i=1,table.getn(events) do frame:RegisterEvent(events[i]) end
 say("Recording combat text locally. Names may appear in combat lines. /octocombat stop to finish.")
end
frame:SetScript("OnEvent",function()
 if not started or type(arg1)~="string" then return end
 if n>=cap then stop("limit");return end
 append(event,arg1)
end)
SLASH_OCTOCOMBATCAPTURE1="/octocombat"
SlashCmdList["OCTOCOMBATCAPTURE"]=function(msg)
 if msg=="start" then start()
 elseif msg=="stop" then stop("manual")
 elseif msg=="clear" and not started then OctoCombatCaptures={};say("Saved captures cleared.")
 else say("Commands: start, stop, clear (irreversible).") end
end
