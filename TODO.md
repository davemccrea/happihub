- When the save button is pressed the canvas should not be cleared
- Allow user to add notes to a saved ECG
- Fullscreen mode
- Should the handleEvent also be refactored to RxJS?
- ECG Viewer should load ECGs from URL params only
- If user visits /ecg/viewer without params or if ECG not found, show message
- If no ECGs are saved, show placeholder instead of table
- Improve error handling in ecg_playback.js
- Add CLAUDE.md file with project overview and methodology for writing code (i.e. incremental, test often, commit regularly after green tests, write new tests when new bugs are discovered)
- Add comprehensive telemetry/diagnositcs

Fix (and write test):

- Can play/pause even if no ECG is loaded
