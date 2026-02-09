-- Fix sessions table primary key
-- Drop the existing primary key constraint
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_pkey";

-- Drop the id column (it will cascade the primary key)
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "id";

-- Add primary key on session_token
ALTER TABLE "sessions" ADD PRIMARY KEY ("session_token");
