# Rules for automated sessions in this repository

* **Never publish converted game files.** Nothing from `tools/models/out/` may go to the live R2 bucket `octobot-models`, the live Worker or GitHub without the owner's permission
  (`tools/models/README.md`). A chat answer, a button or an earlier "yes" is not that permission. It is the file `tools/models/PUBLISH_PERMISSION.json`, which only the owner creates by hand
  (see `tools/models/publish_guard.mjs`). Do not create, edit or work around it; `.claude/hooks/protect-live-bucket.mjs` blocks live-bucket writes and Worker deploys without it.
* Use a private test bucket (a name ending in `test` or `staging`) for anything that has to touch R2, and delete it afterwards.
* If the owner changes their mind while a command is running, stop the command first.
* Procedure and limits: `tools/models/DEPLOYMENT.md`. Never run the 3D viewer's real client files through any public host.
