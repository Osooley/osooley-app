-- Run this in Supabase SQL Editor AFTER you have signed up
-- This links the pilot deals to your account

-- Step 1: Find your user ID
SELECT id, email FROM auth.users LIMIT 5;

-- Step 2: Update properties to link to your user
-- Replace 'YOUR_USER_ID_HERE' with the id from step 1
UPDATE public.properties
SET user_id = 'YOUR_USER_ID_HERE'
WHERE user_id IS NULL;

-- Step 3: Update deal trackers to link to your user
UPDATE public.deal_tracker
SET user_id = 'YOUR_USER_ID_HERE'
WHERE user_id IS NULL;

-- Verify
SELECT id, address, user_id FROM public.properties;
