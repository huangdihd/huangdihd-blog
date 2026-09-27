-- Anonymous choices only: no account, IP, user agent, or timestamp.
CREATE TABLE IF NOT EXISTS blind_box_choices (
  session TEXT NOT NULL CHECK (length(session) = 36 AND session = lower(session)),
  stall INTEGER NOT NULL CHECK (stall IN (0, 1, 2)),
  choice TEXT NOT NULL CHECK (choice IN ('open', 'skip')),
  PRIMARY KEY (session, stall)
) WITHOUT ROWID;

-- Covering index for the aggregate scan, ordered by the GROUP BY key.
CREATE INDEX IF NOT EXISTS blind_box_choices_stall_choice
  ON blind_box_choices (stall, choice);
