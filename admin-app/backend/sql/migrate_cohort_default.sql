USE dissertationapp;

-- Remove the DEFAULT 'cohort_a' that was silently masking missing cohort assignments.
-- Any INSERT that omits the cohort column will now fail explicitly instead of
-- quietly placing the user in cohort_a and skewing version distribution.
ALTER TABLE users MODIFY cohort VARCHAR(50) NOT NULL;
