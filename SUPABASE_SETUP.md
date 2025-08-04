# Supabase Setup Guide for Signal App

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project name: `signal-app`
5. Set database password (save it!)
6. Choose region closest to you
7. Click "Create new project"

## 2. Get Your Credentials

Once project is created, go to Settings → API and copy:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 3. Create Database Tables

Run these SQL commands in the Supabase SQL Editor:

### Signal Tasks Table
```sql
CREATE TABLE signal_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_signal_tasks_user_email ON signal_tasks(user_email);
```

### Noise Tasks Table
```sql
CREATE TABLE noise_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_noise_tasks_user_email ON noise_tasks(user_email);
```

## 4. Enable Row Level Security (RLS)

```sql
-- Enable RLS on both tables
ALTER TABLE signal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE noise_tasks ENABLE ROW LEVEL SECURITY;
```

## 5. Create RLS Policies

### Signal Tasks Policies
```sql
-- Allow users to read their own signal tasks
CREATE POLICY "Users can read their own signal tasks" ON signal_tasks
  FOR SELECT USING (user_email = auth.jwt() ->> 'email');

-- Allow users to insert their own signal tasks
CREATE POLICY "Users can insert their own signal tasks" ON signal_tasks
  FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');

-- Allow users to update their own signal tasks
CREATE POLICY "Users can update their own signal tasks" ON signal_tasks
  FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

-- Allow users to delete their own signal tasks
CREATE POLICY "Users can delete their own signal tasks" ON signal_tasks
  FOR DELETE USING (user_email = auth.jwt() ->> 'email');
```

### Noise Tasks Policies
```sql
-- Allow users to read their own noise tasks
CREATE POLICY "Users can read their own noise tasks" ON noise_tasks
  FOR SELECT USING (user_email = auth.jwt() ->> 'email');

-- Allow users to insert their own noise tasks
CREATE POLICY "Users can insert their own noise tasks" ON noise_tasks
  FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email');

-- Allow users to update their own noise tasks
CREATE POLICY "Users can update their own noise tasks" ON noise_tasks
  FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

-- Allow users to delete their own noise tasks
CREATE POLICY "Users can delete their own noise tasks" ON noise_tasks
  FOR DELETE USING (user_email = auth.jwt() ->> 'email');
```

## 6. Update Your App

Replace the Supabase credentials in `src/SignalApp.js`:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## 7. Test the Setup

1. Deploy your app
2. Try to sign in with an email
3. Add some tasks
4. Check the Supabase dashboard → Table Editor to see if data appears

## Troubleshooting

### If sync doesn't work:
1. Check browser console for errors
2. Verify RLS policies are enabled
3. Make sure user is authenticated
4. Check if tables exist and have correct structure

### Common Issues:
- **RLS blocking access**: Make sure policies are created correctly
- **Authentication issues**: Check if user is properly signed in
- **Table structure**: Verify column names match the code
- **CORS issues**: Check if domain is allowed in Supabase settings 