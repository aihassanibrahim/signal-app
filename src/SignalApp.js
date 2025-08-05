import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQOCV0Kr4VE8lQy65OysENAqsSw6B_JPk",
  authDomain: "signal-cc8cf.firebaseapp.com",
  projectId: "signal-cc8cf",
  storageBucket: "signal-cc8cf.firebasestorage.app",
  messagingSenderId: "376721453532",
  appId: "1:376721453532:web:8e264b47e0cc6a82a21f19",
  measurementId: "G-784C3RD4ZX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function SignalApp() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [showRoomSetup, setShowRoomSetup] = useState(false);
  const [roomInput, setRoomInput] = useState('');
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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  const signalTime = signalTasks.reduce((total, task) => total + task.timeSpent, 0);
  const totalTime = 25200; // 7 hours in seconds
  const signalRatio = Math.round((signalTime / totalTime) * 100);

  // Hantera Firebase autentisering
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        console.log('Användare inloggad:', user.uid);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize app - load data once
  useEffect(() => {
    if (user) {
      checkRoomCode();
    }
  }, [user]);

  // Lyssna på realtidsuppdateringar från Firestore
  useEffect(() => {
    if (!user || !roomCode) return;

    const roomDocRef = doc(db, 'rooms', roomCode);
    
    const unsubscribe = onSnapshot(roomDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSignalTasks(data.signalTasks || []);
        setNoiseTasks(data.noiseTasks || []);
        
        // Återställ timer om det finns en aktiv
        if (data.focusTimer && data.focusTimer.taskId) {
          setFocusTimer(data.focusTimer);
          setIsTimerRunning(data.isTimerRunning || false);
        }
        setInitialLoadComplete(true);
      } else {
        // Skapa initial room med default data
        initializeRoomData();
      }
    });

    return () => unsubscribe();
  }, [user, roomCode]);

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

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const checkRoomCode = useCallback(() => {
    const savedRoomCode = localStorage.getItem('signalRoomCode');
    if (savedRoomCode) {
      setRoomCode(savedRoomCode);
      loadData();
      checkForModals();
    } else {
      setShowRoomSetup(true);
      setInitialLoadComplete(true);
    }
  }, []);

  const createNewRoom = async () => {
    const newRoomCode = generateRoomCode();
    localStorage.setItem('signalRoomCode', newRoomCode);
    setRoomCode(newRoomCode);
    setShowRoomSetup(false);
    
    // Skapa rummet med default data
    await initializeRoomData(newRoomCode);
    loadData();
    checkForModals();
  };

  const joinExistingRoom = async () => {
    if (!roomInput.trim() || roomInput.length !== 6) {
      alert('Ange en 6-siffrig rumskod');
      return;
    }

    // Kontrollera om rummet finns
    const roomDocRef = doc(db, 'rooms', roomInput);
    const roomDoc = await getDoc(roomDocRef);
    
    if (roomDoc.exists()) {
      localStorage.setItem('signalRoomCode', roomInput);
      setRoomCode(roomInput);
      setShowRoomSetup(false);
      setRoomInput('');
      loadData();
      checkForModals();
    } else {
      alert('Rumskoden finns inte. Kontrollera att koden är korrekt.');
    }
  };

  const initializeRoomData = useCallback(async (code = roomCode) => {
    if (!user || !code) return;
    
    try {
      const defaultTasks = [
        { id: 1, text: "Study for calculus midterm", completed: false, timeSpent: 10800 },
        { id: 2, text: "Finish history essay draft", completed: false, timeSpent: 2700 },
        { id: 3, text: "Prepare for job interview", completed: true, timeSpent: 3600 }
      ];
      
      const defaultNoise = [
        "Check social media", "Organize desk", "Reply to group chat", "Watch YouTube videos", "Do laundry"
      ];

      await setDoc(doc(db, 'rooms', code), {
        signalTasks: defaultTasks,
        noiseTasks: defaultNoise,
        focusTimer: { taskId: null, startTime: null, elapsed: 0 },
        isTimerRunning: false,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        createdBy: user.uid
      });
    } catch (error) {
      console.error('Fel vid initialisering av rumsdata:', error);
    }
  }, [user, roomCode]);

  const updateRoomData = async (updates) => {
    if (!user || !roomCode) return;
    
    try {
      await updateDoc(doc(db, 'rooms', roomCode), {
        ...updates,
        lastActive: serverTimestamp(),
        lastUpdatedBy: user.uid
      });
    } catch (error) {
      console.error('Fel vid uppdatering av data:', error);
    }
  };

  const loadData = () => {
    // Data laddas nu via Firestore onSnapshot
  };

  const checkForModals = () => {
    // Check daily reset first (higher priority)
    const lastReset = localStorage.getItem('lastDailyReset');
    const today = new Date().toDateString();
    
    if (lastReset !== today) {
      setShowDailyReset(true);
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
  };

  const signInWithEmail = (emailAddress) => {
    if (emailAddress && emailAddress.includes('@')) {
      localStorage.setItem('signalEmail', emailAddress);
      setEmail(emailAddress);
      setShowEmailInput(false);
      localStorage.removeItem('skippedSync');
    }
  };

  const skipSync = () => {
    localStorage.setItem('skippedSync', 'true');
    setShowEmailInput(false);
  };

  const completeDailyReset = () => {
    localStorage.setItem('lastDailyReset', new Date().toDateString());
    setShowDailyReset(false);
    
    const savedEmail = localStorage.getItem('signalEmail');
    const hasSkippedSync = localStorage.getItem('skippedSync') === 'true';
    
    if (!savedEmail && !hasSkippedSync) {
      setTimeout(() => {
        setShowEmailInput(true);
      }, 300);
    }
  };

  const changeRoom = () => {
    localStorage.removeItem('signalRoomCode');
    setRoomCode('');
    setShowRoomSetup(true);
    setSignalTasks([]);
    setNoiseTasks([]);
    setFocusTimer({ taskId: null, startTime: null, elapsed: 0 });
    setIsTimerRunning(false);
  };

  const saveSignalTasks = async (tasks) => {
    console.log('Saving signal tasks:', tasks.length);
    setSignalTasks(tasks);
    await updateRoomData({ signalTasks: tasks });
  };

  const saveNoiseTasks = async (tasks) => {
    console.log('Saving noise tasks:', tasks.length);
    setNoiseTasks(tasks);
    await updateRoomData({ noiseTasks: tasks });
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

  const addSignalTask = async () => {
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
    await saveSignalTasks(updatedTasks);
    setSignalInput('');
    
    setNewTaskId(newTask.id);
    setTimeout(() => setNewTaskId(null), 500);
  };

  const addQuickNoise = async () => {
    if (!quickNoiseInput.trim()) return;

    const updatedNoise = [...noiseTasks, quickNoiseInput.trim()];
    await saveNoiseTasks(updatedNoise);
    setQuickNoiseInput('');
    setShowQuickNoise(false);
  };

  const startFocusTimer = async (taskId) => {
    if (focusTimer.taskId === taskId && isTimerRunning) {
      // Stop timer
      setIsTimerRunning(false);
      const updatedTasks = signalTasks.map(task => 
        task.id === taskId 
          ? { ...task, timeSpent: task.timeSpent + focusTimer.elapsed }
          : task
      );
      await saveSignalTasks(updatedTasks);
      const newFocusTimer = { taskId: null, startTime: null, elapsed: 0 };
      setFocusTimer(newFocusTimer);
      await updateRoomData({ 
        focusTimer: newFocusTimer,
        isTimerRunning: false 
      });
    } else {
      // Start timer
      const newFocusTimer = { 
        taskId, 
        startTime: Date.now(), 
        elapsed: 0 
      };
      setFocusTimer(newFocusTimer);
      setIsTimerRunning(true);
      await updateRoomData({ 
        focusTimer: newFocusTimer,
        isTimerRunning: true 
      });
    }
  };

  const toggleSignalTask = async (id) => {
    setCompletingTaskId(id);
    
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setTimeout(async () => {
      const updatedTasks = signalTasks.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      );
      await saveSignalTasks(updatedTasks);
      setCompletingTaskId(null);
    }, 300);
  };

  const deleteSignalTask = async (id) => {
    const updatedTasks = signalTasks.filter(task => task.id !== id);
    await saveSignalTasks(updatedTasks);
  };

  const deleteNoiseTask = async (index) => {
    const updatedNoise = noiseTasks.filter((_, i) => i !== index);
    await saveNoiseTasks(updatedNoise);
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

  // Loading state medan Firebase initialiseras
  if (!initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar Signal App...</p>
          {roomCode && (
            <p className="text-xs text-gray-400 mt-2">Rum: {roomCode}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        
        {/* Room Setup Modal */}
        {showRoomSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full">
              <h2 className="text-xl font-light text-gray-800 mb-4 text-center">
                Cross-Device Sync Setup
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Create a room or join an existing one to sync across all your devices
              </p>
              
              <button
                onClick={createNewRoom}
                className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 active:bg-gray-800 transition-colors touch-manipulation mb-4"
              >
                Create New Room
              </button>
              
              <div className="text-center mb-4">
                <span className="text-xs text-gray-400">or</span>
              </div>
              
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit room code"
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:bg-gray-100 transition-colors mb-4 text-center font-mono text-lg tracking-wider"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && joinExistingRoom()}
              />
              
              <button
                onClick={joinExistingRoom}
                disabled={roomInput.length !== 6}
                className="w-full bg-gray-600 text-white py-3 rounded-xl font-medium hover:bg-gray-700 active:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
              >
                Join Room
              </button>
              
              <p className="text-xs text-gray-400 mt-4 text-center">
                Your room code will be saved on this device. Share it with other devices to sync.
              </p>
            </div>
          </div>
        )}

        {/* Email Input Modal */}
        {initialLoadComplete && showEmailInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 mx-4 max-w-sm w-full">
              <h2 className="text-xl font-light text-gray-800 mb-4 text-center">
                Backup your data
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                Optional: Enter your email for backup notifications
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
                className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 active:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation"
              >
                Save Email
              </button>
              <button
                onClick={skipSync}
                className="w-full mt-2 text-gray-500 py-2 text-sm hover:text-gray-700 active:text-gray-700 transition-colors touch-manipulation"
              >
                Skip for now
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
          <h1 className="text-2xl font-light text-gray-800 mb-2">Today's Focus</h1>
          <div className="text-sm text-gray-500">
            {signalRatio}% focused • {formatDuration(signalTime)} on signal
          </div>
          {roomCode && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="text-xs text-gray-400">
                Room: <span className="font-mono font-semibold">{roomCode}</span>
              </div>
              <button
                onClick={changeRoom}
                className="text-xs text-gray-500 hover:text-gray-700 active:text-gray-700 underline transition-colors touch-manipulation"
              >
                Change
              </button>
            </div>
          )}
          {email && (
            <div className="text-xs text-gray-400 mt-1">
              Backup: {email}
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
                    : 'border-gray-300 active:border-gray-400 active:scale-105'
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

        {/* PWA Install Prompt */}
        {showInstallPrompt && (
          <div className="fixed bottom-4 left-4 right-4 bg-black text-white p-4 rounded-xl shadow-lg z-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Installera Signal App</p>
                <p className="text-sm text-gray-300">För bästa upplevelse</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInstallPrompt(false)}
                  className="px-3 py-1 text-sm text-gray-300 hover:text-white"
                >
                  Inte nu
                </button>
                <button
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
                >
                  Installera
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 