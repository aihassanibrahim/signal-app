import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://umkvdwcolybhvhmxcmpp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVta3Zkd2NvbHliaHZobXhjbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTk5MzUsImV4cCI6MjA2OTg3NTkzNX0.A8bc48ZcDSFZLS5HHbrGU3ercOkUwsRhQWWOjVuL6sQ';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SignalApp() {
  const [signalTasks, setSignalTasks] = useState([
    { id: 1, text: "Study for calculus midterm", completed: false, timeSpent: 10800 },
    { id: 2, text: "Finish history essay draft", completed: false, timeSpent: 2700 },
    { id: 3, text: "Prepare for job interview", completed: true, timeSpent: 3600 }
  ]);
  
  const [noiseTasks, setNoiseTasks] = useState([
    "Check social media", "Organize desk", "Reply to group chat", "Watch YouTube videos", "Do laundry"
  ]);

  const [signalInput, setSignalInput] = useState('');
  const [showNoise, setShowNoise] = useState(false);
  const [showDailyReset, setShowDailyReset] = useState(false);
  const [showQuickNoise, setShowQuickNoise] = useState(false);
  const [quickNoiseInput, setQuickNoiseInput] = useState('');
  const [focusTimer, setFocusTimer] = useState({ taskId: null, startTime: null, elapsed: 0 });
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const signalTime = signalTasks.reduce((total, task) => total + task.timeSpent, 0);
  const totalTime = 25200; // 7 hours in seconds
  const signalRatio = Math.round((signalTime / totalTime) * 100);

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

  // Initialize app
  useEffect(() => {
    initializeAuth();
    checkDailyReset();
  }, []);

  // Check for saved email on app start
  useEffect(() => {
    const savedEmail = localStorage.getItem('signalEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setShowEmailInput(false);
      loadLocalData();
    } else {
      setShowEmailInput(true);
    }
  }, []);

  // No need for Supabase listeners when using localStorage only

  const initializeAuth = async () => {
    // Simple initialization - just set syncing to false
    setSyncing(false);
  };

  const signInWithEmail = async (emailAddress) => {
    try {
      console.log('Setting email:', emailAddress);
      
      // Just save the email and close the popup
      localStorage.setItem('signalEmail', emailAddress);
      setEmail(emailAddress);
      setShowEmailInput(false);
      setSyncing(false);
      
      // Load any existing data
      loadLocalData();
      
    } catch (error) {
      console.error('Error setting email:', error);
      setShowEmailInput(false);
      setSyncing(false);
    }
  };

  const loadLocalData = () => {
    try {
      const savedSignalTasks = localStorage.getItem('signalTasks');
      const savedNoiseTasks = localStorage.getItem('noiseTasks');
      
      if (savedSignalTasks) {
        setSignalTasks(JSON.parse(savedSignalTasks));
      }
      if (savedNoiseTasks) {
        setNoiseTasks(JSON.parse(savedNoiseTasks));
      }
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  };

  const loadSupabaseData = (userEmail) => {
    try {
      console.log('Setting up Supabase data loading for email:', userEmail);
      
      // Load initial data
      loadSignalTasks(userEmail);
      loadNoiseTasks(userEmail);

      // Set up polling for real-time updates (every 3 seconds)
      const pollInterval = setInterval(() => {
        loadSignalTasks(userEmail);
        loadNoiseTasks(userEmail);
      }, 3000);

      // Return cleanup function
      return () => {
        console.log('Cleaning up Supabase polling');
        clearInterval(pollInterval);
      };
    } catch (error) {
      console.error('Error loading Supabase data:', error);
      loadLocalData();
    }
  };

  const loadSignalTasks = async (userEmail) => {
    try {
      const { data, error } = await supabase
        .from('signal_tasks')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('Loaded signal tasks:', data?.length || 0);
      setSignalTasks(data || []);
    } catch (error) {
      console.error('Error loading signal tasks:', error);
      loadLocalData();
    }
  };

  const loadNoiseTasks = async (userEmail) => {
    try {
      const { data, error } = await supabase
        .from('noise_tasks')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('Loaded noise tasks:', data?.length || 0);
      setNoiseTasks(data?.map(task => task.text) || []);
    } catch (error) {
      console.error('Error loading noise tasks:', error);
      const savedNoiseTasks = localStorage.getItem('noiseTasks');
      if (savedNoiseTasks) {
        setNoiseTasks(JSON.parse(savedNoiseTasks));
      }
    }
  };

  const checkDailyReset = () => {
    const lastReset = localStorage.getItem('lastDailyReset');
    const today = new Date().toDateString();
    if (lastReset !== today) {
      setShowDailyReset(true);
    }
  };

  const saveSignalTasks = async (tasks) => {
    setSignalTasks(tasks);
    localStorage.setItem('signalTasks', JSON.stringify(tasks));
    console.log('Saved signal tasks to localStorage:', tasks.length, 'tasks');
  };

  const saveNoiseTasks = async (tasks) => {
    setNoiseTasks(tasks);
    localStorage.setItem('noiseTasks', JSON.stringify(tasks));
    console.log('Saved noise tasks to localStorage:', tasks.length, 'tasks');
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
    if (signalInput.trim() && signalTasks.filter(t => !t.completed).length < 5) {
      const newTask = {
        id: Date.now(),
        text: signalInput.trim(),
        completed: false,
        timeSpent: 0
      };
      const updatedTasks = [...signalTasks, newTask];
      saveSignalTasks(updatedTasks);
      setSignalInput('');
    }
  };

  const addQuickNoise = () => {
    if (quickNoiseInput.trim()) {
      const updatedNoise = [...noiseTasks, quickNoiseInput.trim()];
      saveNoiseTasks(updatedNoise);
      setQuickNoiseInput('');
      setShowQuickNoise(false);
    }
  };

  const startFocusTimer = (taskId) => {
    if (focusTimer.taskId === taskId && isTimerRunning) {
      setIsTimerRunning(false);
      const updatedTasks = signalTasks.map(task => 
        task.id === taskId 
          ? { ...task, timeSpent: task.timeSpent + focusTimer.elapsed }
          : task
      );
      saveSignalTasks(updatedTasks);
      setFocusTimer({ taskId: null, startTime: null, elapsed: 0 });
    } else {
      setFocusTimer({ 
        taskId, 
        startTime: Date.now(), 
        elapsed: 0 
      });
      setIsTimerRunning(true);
    }
  };

  const toggleSignalTask = (id) => {
    const updatedTasks = signalTasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveSignalTasks(updatedTasks);
  };

  const deleteSignalTask = (id) => {
    const updatedTasks = signalTasks.filter(task => task.id !== id);
    saveSignalTasks(updatedTasks);
  };

  const completeDailyReset = () => {
    localStorage.setItem('lastDailyReset', new Date().toDateString());
    setShowDailyReset(false);
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
        {showEmailInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full">
              <h2 className="text-xl font-light text-gray-800 mb-4 text-center">
                Sync across devices
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Enter your email to sync your tasks across all devices
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
                disabled={!email.includes('@')}
                className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Start Syncing
              </button>
              <button
                onClick={() => {
                  setShowEmailInput(false);
                  const localUserId = localStorage.getItem('signalUserId') || 'local-' + Date.now();
                  localStorage.setItem('signalUserId', localUserId);
                  setUserId(localUserId);
                  loadLocalData();
                }}
                className="w-full mt-2 text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
              >
                Continue without sync
              </button>
            </div>
          </div>
        )}

        {/* Daily Reset Modal */}
        {showDailyReset && (
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
                className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
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
            {syncing && (
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {signalRatio}% focused • {formatDuration(signalTime)} on signal
          </div>
          {email && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="text-xs text-gray-400">
                Synced with {email}
              </div>
              <button
                onClick={() => {
                  supabase.auth.signOut();
                  localStorage.removeItem('signalEmail');
                  setEmail('');
                  setShowEmailInput(true);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Switch email
              </button>
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
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isLongPressing 
                ? 'bg-gray-700 text-white scale-110' 
                : 'bg-black text-white hover:bg-gray-800 hover:scale-105'
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
                className="bg-gray-700 text-white px-3 py-1 text-xs rounded-md"
              >
                Add to Noise
              </button>
              <button
                onClick={() => {setShowQuickNoise(false); setQuickNoiseInput('');}}
                className="bg-gray-300 text-gray-600 px-3 py-1 text-xs rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Signal Tasks */}
        <div className="space-y-3 mb-8">
          {activeSignalTasks.map((task) => (
            <div key={task.id} className="group flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <button
                onClick={() => toggleSignalTask(task.id)}
                className="w-6 h-6 border-2 border-gray-300 rounded-md flex items-center justify-center hover:border-gray-400 transition-colors"
              >
              </button>
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => startFocusTimer(task.id)}
              >
                <span className="text-gray-800 font-light">
                  {task.text}
                </span>
                {focusTimer.taskId === task.id && isTimerRunning && (
                  <div className="text-xs text-gray-500 mt-1 bg-blue-50 px-2 py-1 rounded-full inline-block">
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
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
                <button
                  onClick={() => deleteSignalTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all w-6 h-6 flex items-center justify-center"
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
              <div key={task.id} className="group flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <button
                  onClick={() => toggleSignalTask(task.id)}
                  className="w-6 h-6 bg-black rounded-md flex items-center justify-center"
                >
                  <span className="text-white text-sm">✓</span>
                </button>
                <span className="flex-1 text-gray-400 font-light line-through">
                  {task.text}
                </span>
                <button
                  onClick={() => deleteSignalTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all w-6 h-6 flex items-center justify-center"
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
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
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
                <div key={index} className="text-sm text-gray-400 p-2 bg-gray-50 rounded-lg">
                  {task}
                </div>
              ))}
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