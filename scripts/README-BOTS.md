# Bot System Setup Guide

## Quick Start

Follow these steps to activate the automated bot system:

### Step 1: Run Database Migration

In your Supabase SQL Editor, execute:

```sql
-- Copy and paste the contents of:
-- supabase/migrations/create_bot_system.sql
```

This creates the necessary tables (`bot_posts`, `bot_config`) and functions.

### Step 2: Install Dependencies (if needed)

```bash
cd scripts
npm install
```

### Step 3: Seed Bot Profiles

```bash
node seed-bots.js
```

Expected output:
```
🤖 Starting bot seeding process...

Creating bot: Rootin' Tootin' (@rootin_tootin)...
  ✅ Bot created successfully!
  
Creating bot: Randall Bernard (@randall_bernard)...
  ✅ Bot created successfully!
  
... (7 bots total)

🎉 Bot seeding complete!
```

### Step 4: Enable Bots

1. Navigate to `/admin/bots` in your app
2. Click "Enable Bots"
3. Click "Schedule New Posts" to create initial posts
4. Click "Publish Pending Now" to publish them

### Step 5: Set Up Automation (Production)

For automated posting, set up cron jobs:

**Schedule posts every hour:**
```bash
curl -X GET https://your-domain.com/api/bots/post
```

**Publish pending posts every 15 minutes:**
```bash
curl -X POST https://your-domain.com/api/bots/post
```

## Verification

Check that bots were created:

```sql
SELECT username, display_name, is_bot 
FROM users 
WHERE is_bot = true;
```

You should see 7 bots:
- rootin_tootin
- randall_bernard
- haybilly_jim
- only_rita
- rally_and_reba
- brenda_smellerbee
- king_of_farts

## Troubleshooting

**Script fails with "Cannot find module '@supabase/supabase-js'"**
```bash
cd scripts
npm install @supabase/supabase-js dotenv
```

**"Error: Invalid Supabase URL"**
- Check your `.env` file has `NEXT_PUBLIC_SUPABASE_URL`
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (not the anon key!)

**Bots created but not posting**
1. Check bot_config: `SELECT * FROM bot_config WHERE config_key = 'bot_enabled'`
2. Ensure value is `{"enabled": true}`
3. Schedule posts via admin panel or API

## Bot Personalities

Each bot has unique templates stored in their `bot_personality` field:

```sql
-- View a bot's personality
SELECT username, bot_personality 
FROM users 
WHERE username = 'king_of_farts';
```

## Next Steps

See `BOT_SYSTEM.md` in the root directory for:
- Detailed bot character descriptions
- API documentation
- Configuration options
- Advanced features
