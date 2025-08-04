# Supabase Setup for Signal App

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Wait for the project to be ready

## 2. Get Your Credentials

1. Go to Settings → API
2. Copy your Project URL and anon public key
3. Update the constants in `src/SignalApp.js`:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## 3. Create Database Tables

Run these SQL commands in the Supabase SQL Editor:

### Signal Tasks Table
```sql
CREATE TABLE signal_tasks (
  id BIGINT PRIMARY KEY,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  time_spent INTEGER DEFAULT 0,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE signal_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access their own tasks
CREATE POLICY "Users can access their own signal tasks" ON signal_tasks
  FOR ALL USING (auth.jwt() ->> 'email' = user_email);
```

### Noise Tasks Table
```sql
CREATE TABLE noise_tasks (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE noise_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access their own tasks
CREATE POLICY "Users can access their own noise tasks" ON noise_tasks
  FOR ALL USING (auth.jwt() ->> 'email' = user_email);
```

## 4. Enable Real-time

1. Go to Database → Replication
2. Enable real-time for both tables

## 5. Deploy

1. Update the credentials in `src/SignalApp.js`
2. Run `npm run build && npx vercel --prod`

## Benefits of Supabase

- ✅ **Better Authentication**: Built-in email/password with persistence
- ✅ **Real-time Sync**: Automatic real-time updates across devices
- ✅ **Row Level Security**: Secure data access
- ✅ **SQL Database**: More reliable than NoSQL for this use case
- ✅ **Auto-generated APIs**: No need to write custom backend code 