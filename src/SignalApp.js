import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://umkvdwcolybhvhmxcmpp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVta3Zkd2NvbHliaHZobXhjbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTk5MzUsImV4cCI6MjA2OTg3NTkzNX0.A8bc48ZcDSFZLS5HHbrGU3ercOkUwsRhQWWOjVuL6sQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SignalApp() {
  const [signalTasks, setSignalTasks] = useState([]);
  const [noiseTasks, setNoiseTasks] = useState([]);
  const [signalInput, setSignalInput] = useState('');
  const [showNoise, setShowNoise] = useState(false);
  const [showDailyReset, setShowDailyReset] = useState(false);
  const [showQuickNoise, setShowQuickNoise] = useState(false);
  const [quickNoiseInput, setQuickNoiseInput] = useState('');
  const [focusTimer, setFocusTimer] = useState({ taskId: null, startTime: null, elapsed: 0 });
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [newTaskId, setNewTaskId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState(null);
  
  const signalTime = signalTasks.reduce((total, task) => total + task.timeSpent, 0);
  const totalTime = 25200; // 7 hours in seconds
  const signalRatio = Math.round((signalTime / totalTime) * 100);

  // Initialize app - load data once
  useEffect(() => {
    initializeApp();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning && focusTimer.taskId) {
      interval = setInterval(() => {
        setFocusTimer(prev => ({
          ...prev,
          elapsed: prev.elapsed + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, focusTimer.taskId]);

  // Supabase auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          setUser(session.user);
          setEmail(session.user.email);
          setShowEmailInput(false);
          setIsSyncing(true);
          
          // Load data from Supabase
          await loadSupabaseData(session.user.email);
          setIsSyncing(false);
        } else {
          setUser(null);
          setEmail('');
          // Fallback to localStorage
          loadLocalData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeApp = async () => {
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is already signed in
        setUser(session.user);
        setEmail(session.user.email);
        setIsSyncing(true);
        await loadSupabaseData(session.user.email);
        setIsSyncing(false);
      } else {
        // No session, check for saved email
        const savedEmail = localStorage.getItem('signalEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          // Try to sign in with saved email
          await signInWithEmail(savedEmail);
        } else {
          // Load local data and show email modal
          loadLocalData();
          checkForModals();
        }
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      loadLocalData();
      checkForModals();
    }
  };

  const loadSupabaseData = async (userEmail) => {
    try {
      console.log('Loading Supabase data for:', userEmail);
      
      // Load signal tasks
      const { data: signalData, error: signalError } = await supabase
        .from('signal_tasks')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: true });

      if (signalError) throw signalError;
      
      if (signalData && signalData.length > 0) {
        const tasks = signalData.map(task => ({
          id: task.id,
          text: task.text,
          completed: task.completed,
          timeSpent: task.time_spent || 0
        }));
        setSignalTasks(tasks);
        console.log('Loaded signal tasks:', tasks.length);
      } else {
        // No data in Supabase, load from localStorage as fallback
        loadLocalData();
      }

      // Load noise tasks
      const { data: noiseData, error: noiseError } = await supabase
        .from('noise_tasks')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: true });

      if (noiseError) throw noiseError;
      
      if (noiseData && noiseData.length > 0) {
        const noise = noiseData.map(task => task.text);
        setNoiseTasks(noise);
        console.log('Loaded noise tasks:', noise.length);
      }
      
    } catch (error) {
      console.error('Error loading Supabase data:', error);
      // Fallback to localStorage
      loadLocalData();
    }
  };

  const loadLocalData = () => {
    try {
      // Load signal tasks
      const savedSignalTasks = localStorage.getItem('signalTasks');
      if (savedSignalTasks) {
        setSignalTasks(JSON.parse(savedSignalTasks));
      } else {
        // Default tasks only if no saved data
        const defaultTasks = [
          { id: 1, text: "Study for calculus midterm", completed: false, timeSpent: 10800 },
          { id: 2, text: "Finish history essay draft", completed: false, timeSpent: 2700 },
          { id: 3, text: "Prepare for job interview", completed: true, timeSpent: 3600 }
        ];
        setSignalTasks(defaultTasks);
        localStorage.setItem('signalTasks', JSON.stringify(defaultTasks));
      }

      // Load noise tasks
      const savedNoiseTasks = localStorage.getItem('noiseTasks');
      if (savedNoiseTasks) {
        setNoiseTasks(JSON.parse(savedNoiseTasks));
      } else {
        // Default noise only if no saved data
        const defaultNoise = [
          "Check social media", "Organize desk", "Reply to group chat", "Watch YouTube videos", "Do laundry"
        ];
        setNoiseTasks(defaultNoise);
        localStorage.setItem('noiseTasks', JSON.stringify(defaultNoise));
      }
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  };

  const checkForModals = () => {
    // Check daily reset first (higher priority)
    const lastReset = localStorage.getItem('lastDailyReset');
    const today = new Date().toDateString();
    
    if (lastReset !== today) {
      setShowDailyReset(true);
      setInitialLoadComplete(true);
      return; // Don't show email modal if daily reset is showing
    }

    // Check email setup only if no daily reset and no email saved
    const savedEmail = localStorage.getItem('signalEmail');
    const hasSkippedSync = localStorage.getItem('skippedSync') === 'true';
    
    if (!savedEmail && !hasSkippedSync) {
      setShowEmailInput(true);
    } else if (savedEmail) {
      setEmail(savedEmail);
    }
    
    setInitialLoadComplete(true);
  };

  const signInWithEmail = async (emailAddress) => {
    if (!emailAddress || !emailAddress.includes('@')) return;

    try {
      setIsSyncing(true);
      console.log('Signing in with email:', emailAddress);

      // Try to sign in with existing account
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailAddress,
        password: 'signal123' // Simple password for demo
      });

      if (signInError) {
        // User doesn't exist, create new account
        console.log('Creating new account for:', emailAddress);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: emailAddress,
          password: 'signal123'
        });

        if (signUpError) {
          console.error('Error creating account:', signUpError);
          // Fallback to localStorage only
          localStorage.setItem('signalEmail', emailAddress);
          setEmail(emailAddress);
          setShowEmailInput(false);
          localStorage.removeItem('skippedSync');
          setIsSyncing(false);
          return;
        }

        console.log('Account created successfully');
      } else {
        console.log('Signed in successfully');
      }

      // Save email to localStorage as backup
      localStorage.setItem('signalEmail', emailAddress);
      setEmail(emailAddress);
      setShowEmailInput(false);
      localStorage.removeItem('skippedSync');

    } catch (error) {
      console.error('Error during sign in:', error);
      // Fallback to localStorage only
      localStorage.setItem('signalEmail', emailAddress);
      setEmail(emailAddress);
      setShowEmailInput(false);
      localStorage.removeItem('skippedSync');
    } finally {
      setIsSyncing(false);
    }
  };

  const skipSync = () => {
    localStorage.setItem('skippedSync', 'true');
    setShowEmailInput(false);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setEmail('');
      localStorage.removeItem('signalEmail');
      localStorage.removeItem('skippedSync');
      loadLocalData();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const completeDailyReset = () => {
    localStorage.setItem('lastDailyReset', new Date().toDateString());
    setShowDailyReset(false);
    
    // After daily reset, check if we should show email modal
    const savedEmail = localStorage.getItem('signalEmail');
    const hasSkippedSync = localStorage.getItem('skippedSync') === 'true';
    
    if (!savedEmail && !hasSkippedSync) {
      // Small delay to avoid modal flickering
      setTimeout(() => {
        setShowEmailInput(true);
      }, 300);
    }
  };

  const saveSignalTasks = async (tasks) => {
    console.log('Saving signal tasks:', tasks.length);
    setSignalTasks(tasks);
    
    // Always save to localStorage as backup
    localStorage.setItem('signalTasks', JSON.stringify(tasks));
    
    // Save to Supabase if user is signed in
    if (user?.email) {
      try {
        // Delete existing tasks
        await supabase
          .from('signal_tasks')
          .delete()
          .eq('user_email', user.email);

        // Insert new tasks
        const tasksToInsert = tasks.map(task => ({
          user_email: user.email,
          text: task.text,
          completed: task.completed,
          time_spent: task.timeSpent
        }));

        const { error } = await supabase
          .from('signal_tasks')
          .insert(tasksToInsert);

        if (error) {
          console.error('Error saving to Supabase:', error);
        } else {
          console.log('Saved signal tasks to Supabase');
        }
      } catch (error) {
        console.error('Error saving to Supabase:', error);
      }
    }
  };

  const saveNoiseTasks = async (tasks) => {
    console.log('Saving noise tasks:', tasks.length);
    setNoiseTasks(tasks);
    
    // Always save to localStorage as backup
    localStorage.setItem('noiseTasks', JSON.stringify(tasks));
    
    // Save to Supabase if user is signed in
    if (user?.email) {
      try {
        // Delete existing noise tasks
        await supabase
          .from('noise_tasks')
          .delete()
          .eq('user_email', user.email);

        // Insert new noise tasks
        const tasksToInsert = tasks.map(text => ({
          user_email: user.email,
          text: text
        }));

        const { error } = await supabase
          .from('noise_tasks')
          .insert(tasksToInsert);

        if (error) {
          console.error('Error saving noise to Supabase:', error);
        } else {
          console.log('Saved noise tasks to Supabase');
        }
      } catch (error) {
        console.error('Error saving noise to Supabase:', error);
      }
    }
  };

  const handleAddClick = () => {
    if (signalInput.trim() && activeSignalTasks.length < 5) {
      addSignalTask();
    }
  };

  const handleLongPressStart = () => {
    setIsLongPressing(true);
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    const timer = setTimeout(() => {
      setShowQuickNoise(true);
      setIsLongPressing(false);
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }, 800);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    setIsLongPressing(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const addSignalTask = () => {
    if (!signalInput.trim()) return;
    
    const activeTasks = signalTasks.filter(t => !t.completed);
    if (activeTasks.length >= 5) return;

    const newTask = {
      id: Date.now(),
      text: signalInput.trim(),
      completed: false,
      timeSpent: 0
    };

    console.log('Adding new signal task:', newTask);
    const updatedTasks = [...signalTasks, newTask];
    saveSignalTasks(updatedTasks);
    setSignalInput('');
    
    // Add entrance animation for new task
    setNewTaskId(newTask.id);
    setTimeout(() => setNewTaskId(null), 500);
  };

  const addQuickNoise = () => {
    if (!quickNoiseInput.trim()) return;

    const updatedNoise = [...noiseTasks, quickNoiseInput.trim()];
    saveNoiseTasks(updatedNoise);
    setQuickNoiseInput('');
    setShowQuickNoise(false);
  };

  const startFocusTimer = (taskId) => {
    if (focusTimer.taskId === taskId && isTimerRunning) {
      // Stop timer
      setIsTimerRunning(false);
      const updatedTasks = signalTasks.map(task => 
        task.id === taskId 
          ? { ...task, timeSpent: task.timeSpent + focusTimer.elapsed }
          : task
      );
      saveSignalTasks(updatedTasks);
      setFocusTimer({ taskId: null, startTime: null, elapsed: 0 });
    } else {
      // Start timer
      setFocusTimer({ 
        taskId, 
        startTime: Date.now(), 
        elapsed: 0 
      });
      setIsTimerRunning(true);
    }
  };

  const toggleSignalTask = (id) => {
    // Add completing animation
    setCompletingTaskId(id);
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Wait for animation then update state
    setTimeout(() => {
      const updatedTasks = signalTasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      );
      saveSignalTasks(updatedTasks);
      setCompletingTaskId(null);
    }, 300);
  };

  const deleteSignalTask = (id) => {
    const updatedTasks = signalTasks.filter(task => task.id !== id);
    saveSignalTasks(updatedTasks);
  };

  const deleteNoiseTask = (index) => {
    const updatedNoise = noiseTasks.filter((_, i) => i !== index);
    saveNoiseTasks(updatedNoise);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addSignalTask();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const activeSignalTasks = signalTasks.filter(task => !task.completed);
  const completedSignalTasks = signalTasks.filter(task => task.completed);

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        
        {/* Email Input Modal */}
        {initialLoadComplete && showEmailInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full">
              <h2 className="text-xl font-light text-gray-800 mb-4 text-center">
                Sync across devices
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Enter your email to enable cross-device sync
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:bg-gray-100 transition-colors mb-4"
                onKeyPress={(e) => e.key === 'Enter' && signInWithEmail(email)}
              />
              <button
                onClick={() => signInWithEmail(email)}
                disabled={!email.includes('@') || isSyncing}
                className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
              >
                {isSyncing ? 'Signing in...' : 'Enable Sync'}
              </button>
              <button
                onClick={skipSync}
                className="w-full mt-2 text-gray-500 py-2 text-sm hover:text-gray-700 active:text-gray-700 transition-colors touch-manipulation"
              >
                Continue without sync
              </button>
            </div>
          </div>
        )}

        {/* Daily Reset Modal */}
        {initialLoadComplete && showDailyReset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full">
              <h2 className="text-xl font-light text-gray-800 mb-4 text-center">
                What's your signal for today?
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Focus on 3-5 things that will make today successful
              </p>
              <button
                onClick={completeDailyReset}
                className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 active:bg-gray-800 transition-colors touch-manipulation"
              >
                Set Today's Focus
              </button>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-2xl font-light text-gray-800">Today's Focus</h1>
            {isSyncing && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {signalRatio}% focused • {formatDuration(signalTime)} on signal
          </div>
          {email && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="text-xs text-gray-400">
                {user ? `Synced with ${email}` : `Email saved: ${email}`}
              </div>
              {user ? (
                <button
                  onClick={signOut}
                  className="text-xs text-gray-500 hover:text-gray-700 active:text-gray-700 underline transition-colors touch-manipulation"
                >
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => {
                    localStorage.removeItem('signalEmail');
                    localStorage.removeItem('skippedSync');
                    setEmail('');
                    setShowEmailInput(true);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 active:text-gray-700 underline transition-colors touch-manipulation"
                >
                  Change
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add Signal Input */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={signalInput}
            onChange={(e) => setSignalInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add new signal task"
            className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:bg-gray-100 transition-colors"
            disabled={activeSignalTasks.length >= 5}
          />
          <button
            onClick={handleAddClick}
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 touch-manipulation ${
              isLongPressing 
                ? 'bg-gray-700 text-white scale-110' 
                : 'bg-black text-white hover:bg-gray-800 active:bg-gray-800 hover:scale-105 active:scale-105'
            }`}
          >
            <span className="text-xl font-light">+</span>
          </button>
        </div>
        
        <div className="text-center mb-6">
          <span className="text-xs text-gray-400">
            {signalInput.trim() && activeSignalTasks.length < 5 
              ? 'Click + to add signal • Long press + for noise' 
              : 'Long press + to capture noise'}
          </span>
        </div>

        {/* Quick Noise Input */}
        {showQuickNoise && (
          <div className="mb-6 p-4 bg-gray-100 rounded-xl">
            <input
              type="text"
              value={quickNoiseInput}
              onChange={(e) => setQuickNoiseInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addQuickNoise()}
              placeholder="Quick capture noise..."
              className="w-full px-3 py-2 bg-white border-none rounded-lg text-gray-800 placeholder-gray-400 outline-none"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={addQuickNoise}
                className="bg-gray-700 text-white px-3 py-1 text-xs rounded-md hover:bg-gray-800 active:bg-gray-800 transition-colors touch-manipulation"
              >
                Add to Noise
              </button>
              <button
                onClick={() => {setShowQuickNoise(false); setQuickNoiseInput('');}}
                className="bg-gray-300 text-gray-600 px-3 py-1 text-xs rounded-md hover:bg-gray-400 active:bg-gray-400 transition-colors touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Signal Tasks */}
        <div className="space-y-3 mb-8">
          {activeSignalTasks.map((task) => (
            <div 
              key={task.id} 
              className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-500 touch-manipulation ${
                completingTaskId === task.id 
                  ? 'transform translate-x-8 opacity-30 scale-95 bg-green-50' 
                  : newTaskId === task.id
                  ? 'transform scale-105 bg-blue-50 shadow-lg'
                  : 'hover:bg-gray-50 active:bg-gray-50 hover:shadow-md active:shadow-md'
              }`}
            >
              <button
                onClick={() => toggleSignalTask(task.id)}
                disabled={completingTaskId === task.id}
                className={`w-8 h-8 border-2 rounded-md flex items-center justify-center transition-all duration-300 touch-manipulation ${
                  completingTaskId === task.id
                    ? 'border-green-500 bg-green-500 scale-110'
                    : 'border-gray-300 hover:border-gray-400 hover:scale-105 active:border-gray-400 active:scale-105'
                }`}
              >
                {completingTaskId === task.id && (
                  <span className="text-white text-sm font-bold">✓</span>
                )}
              </button>
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => startFocusTimer(task.id)}
              >
                <span className={`font-light ${completingTaskId === task.id ? 'text-green-600' : 'text-gray-800'}`}>
                  {task.text}
                </span>
                {focusTimer.taskId === task.id && isTimerRunning && (
                  <div className="text-xs text-gray-500 mt-1 bg-blue-50 px-2 py-1 rounded-full inline-block animate-pulse">
                    {formatTime(focusTimer.elapsed)} • Click to stop
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {task.timeSpent > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {formatDuration(task.timeSpent)}
                  </span>
                )}
                {focusTimer.taskId === task.id && isTimerRunning && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                )}
                <button
                  onClick={() => deleteSignalTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-gray-400 hover:text-red-500 active:text-red-500 transition-all w-8 h-8 flex items-center justify-center hover:scale-110 active:scale-110 touch-manipulation"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Completed Signal Tasks */}
        {completedSignalTasks.length > 0 && (
          <div className="space-y-2 mb-8 pt-4 border-t border-gray-100">
            {completedSignalTasks.map((task) => (
              <div 
                key={task.id} 
                className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-500 touch-manipulation ${
                  completingTaskId === task.id 
                    ? 'transform -translate-x-8 opacity-30 scale-95 bg-gray-50' 
                    : 'hover:bg-gray-50 active:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => toggleSignalTask(task.id)}
                  disabled={completingTaskId === task.id}
                  className="w-8 h-8 bg-black rounded-md flex items-center justify-center hover:bg-gray-700 active:bg-gray-700 transition-all hover:scale-105 active:scale-105 touch-manipulation"
                >
                  <span className="text-white text-sm">✓</span>
                </button>
                <span className="flex-1 text-gray-400 font-light line-through">
                  {task.text}
                </span>
                <button
                  onClick={() => deleteSignalTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-gray-400 hover:text-red-500 active:text-red-500 transition-all w-8 h-8 flex items-center justify-center hover:scale-110 active:scale-110 touch-manipulation"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Signal Limit Warning */}
        {activeSignalTasks.length >= 5 && (
          <div className="mb-6 p-3 bg-gray-100 rounded-xl">
            <p className="text-sm text-gray-600 text-center font-light">
              Signal limit reached. Complete a task to add another.
            </p>
          </div>
        )}

        {/* Noise Section */}
        <div className="border-t border-gray-100 pt-6">
          <button
            onClick={() => setShowNoise(!showNoise)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 active:bg-gray-50 rounded-xl transition-colors touch-manipulation"
          >
            <span className="text-sm font-medium text-gray-500">
              Noise • {noiseTasks.length} items
            </span>
            <span className={`text-gray-400 transition-transform ${showNoise ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {showNoise && (
            <div className="mt-3 space-y-1">
              {noiseTasks.map((task, index) => (
                <div key={index} className="group flex items-center justify-between text-sm text-gray-400 p-3 bg-gray-50 rounded-lg hover:bg-gray-200 active:bg-gray-200 hover:shadow-sm active:shadow-sm transition-all duration-200 touch-manipulation">
                  <span className="flex-1 group-hover:text-gray-600 group-focus-within:text-gray-600 transition-colors">{task}</span>
                  <button
                    onClick={() => deleteNoiseTask(index)}
                    className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 text-gray-400 hover:text-red-500 active:text-red-500 transition-all w-6 h-6 flex items-center justify-center ml-2 hover:scale-125 active:scale-125 touch-manipulation"
                  >
                    ×
                  </button>
                </div>
              ))}
              {noiseTasks.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400 animate-pulse">
                  No noise captured yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Jobs Quote */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-center text-sm text-gray-400 font-light italic leading-relaxed">
            "Focus is about saying no to the hundred other good ideas."
          </p>
          <p className="text-center text-xs text-gray-400 mt-2">- Steve Jobs</p>
        </div>

        {/* Empty State */}
        {activeSignalTasks.length === 0 && completedSignalTasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 font-light">
              What deserves your signal today?
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 