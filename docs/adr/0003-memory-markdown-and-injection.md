# Chat memory as two markdown fields with hybrid injection

Chat Profile and Diary are free-form markdown strings (not rigid columns). Every agent turn injects capped Profile + a short Diary digest; full Diary only via recall tool. Saves tokens vs dumping the whole diary; keeps stable prefs always available. Refactor on Session close compresses the Diary. Trade-off: less structured queryability; agent owns edit quality.
