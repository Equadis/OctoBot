-- The in-game capture verifies the staff badge on these two archived messages.
UPDATE world_chat_messages
SET gm=1
WHERE realm='N''Zoth' AND author='Ius' AND gm=0
  AND id IN ('e35ba334-9a17-4e81-9c8f-9fe4066ba610','26807ec4-91fe-48d1-9e8f-a59bb35940e3');
