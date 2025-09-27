Gamification Engine Core using Node.js and SQL lite , developed as part of a hackathon project for a gamified learning platform.
Its primary function is to process successful user actions and calculate their rewards (XP, Level, Badges).
The system was designed to address user motivation and retention by implementing a structured, visible progression system:
 *Uses a "Farm Level" (Seedling, Sprout, Tree, etc.) to give progress a memorable identity.
 *Provides immediate, calculated rewards (XP and Badges) upon action completion
 *Includes logic to prevent duplicate awarding of progress for the same action.
Important functions:
  ->XP Calculation: Calculates XP gained 1 Star = 10 XP (XP_PER_STAR)
  ->Leveling: Calculates the user's new Farm Level: 10 XP = 1 Level (XP_PER_LEVEL)
  ->Badge Awarding: Automatically checks and awards level-based badges (e.g., "Seedling" at Level 2, "Sprout" at Level 4) upon level up.
  ->Deduplication:  Uses a client_id to ensure a single user action is only processed once.
This module is the central logic bridge between the user's screen (Front-End) and the application's data (Back-End) and this is how it works:
 1.Input: The Back-End receives a user action (e.g., quiz completed) and calls the Engine function with the user's details.
 2.Processing: The Engine calculates XP and level changes, updates the database, and checks for badges.
 3.Output: The Engine sends a simple status message back (e.g., leveledUp: true).
 4.Display: The Front-End reads this status message to immediately trigger visual feedbackfor the user (pop-ups, animations).





