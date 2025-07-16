# HappiHub Roadmap

## ECG Viewer Improvements

### Canvas and Drawing
- [x] **Save Button Canvas Fix** - When the save button is pressed the canvas should not be cleared ✅ 2025/07/16
- [ ] **User Notes for ECGs** - Allow user to add notes to a saved ECG
- [ ] **Fullscreen Mode** - Implement fullscreen mode for ECG viewer

### Architecture and Code Quality
- [ ] **RxJS Refactoring** - Should the handleEvent also be refactored to RxJS?
- [ ] **URL Parameter Loading** - ECG Viewer should load ECGs from URL params only
- [ ] **Error Handling Improvement** - Improve error handling in ecg_playback.js

### User Experience
- [ ] **Missing ECG Message** - If user visits /ecg/viewer without params or if ECG not found, show message
- [ ] **Empty State Placeholder** - If no ECGs are saved, show placeholder instead of table

### Documentation and Monitoring
- [ ] **Project Documentation** - Add CLAUDE.md file with project overview and methodology for writing code (i.e. incremental, test often, commit regularly after green tests, write new tests when new bugs are discovered)
- [ ] **Telemetry Implementation** - Add comprehensive telemetry/diagnostics

## Bug Fixes

### ECG Playback
- [ ] **Playback Control Fix** - Can play/pause even if no ECG is loaded (fix and write test)