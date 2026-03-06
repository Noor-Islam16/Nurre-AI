// Service Worker for NureeAI Timer
// Handles background timer execution to prevent throttling

// Timer state management
const timers = new Map();
const UPDATE_INTERVAL = 1000; // Update every second
const intervals = new Map();

// Helper to calculate elapsed time
function calculateElapsed(timer) {
  if (!timer) return 0;
  
  const now = Date.now();
  let elapsed = now - timer.startedAt;
  
  // Account for paused time
  if (timer.pausedAt) {
    elapsed = timer.pausedAt - timer.startedAt;
  }
  
  return elapsed - timer.totalPausedDuration;
}

// Helper to broadcast timer updates to all clients
async function broadcastTimerUpdate(timerId) {
  const timer = timers.get(timerId);
  if (!timer) return;
  
  const elapsed = calculateElapsed(timer);
  const remaining = Math.max(0, timer.duration - elapsed);
  const remainingSeconds = Math.floor(remaining / 1000);
  
  // Get all clients (tabs)
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  
  // Send update to all clients
  clients.forEach(client => {
    client.postMessage({
      type: 'TIMER_UPDATE',
      data: {
        timerId,
        remainingSeconds,
        isRunning: !timer.pausedAt && remaining > 0,
        isPaused: !!timer.pausedAt,
        duration: Math.floor(timer.duration / 1000 / 60), // in minutes
        startedAt: timer.startedAt,
        taskId: timer.taskId
      }
    });
  });
  
  // Check if timer completed
  if (remaining <= 0 && !timer.completed) {
    timer.completed = true;
    await handleTimerComplete(timerId);
  }
}

// Handle timer completion
async function handleTimerComplete(timerId) {
  const timer = timers.get(timerId);
  if (!timer) return;
  
  // Clear interval
  const intervalId = intervals.get(timerId);
  if (intervalId) {
    clearInterval(intervalId);
    intervals.delete(timerId);
  }
  
  // Notify all clients
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
  
  clients.forEach(client => {
    client.postMessage({
      type: 'TIMER_COMPLETE',
      data: {
        timerId,
        taskId: timer.taskId,
        duration: Math.floor(timer.duration / 1000 / 60),
        completedAt: Date.now()
      }
    });
  });
  
  // Show notification if permission granted
  if (self.registration.showNotification) {
    try {
      await self.registration.showNotification('Focus Timer Complete!', {
        body: `Your ${Math.floor(timer.duration / 1000 / 60)} minute focus session has ended.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'timer-complete',
        requireInteraction: true,
        actions: [
          { action: 'start-break', title: 'Take a Break' },
          { action: 'start-another', title: 'Start Another' }
        ]
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
  
  // Clean up completed timer after a delay
  setTimeout(() => {
    timers.delete(timerId);
  }, 5000);
}

// Start broadcasting updates for a timer
function startBroadcasting(timerId) {
  // Clear any existing interval
  const existingInterval = intervals.get(timerId);
  if (existingInterval) {
    clearInterval(existingInterval);
  }
  
  // Broadcast immediately
  broadcastTimerUpdate(timerId);
  
  // Set up regular broadcasts
  const intervalId = setInterval(() => {
    const timer = timers.get(timerId);
    if (!timer || timer.completed || timer.pausedAt) {
      clearInterval(intervalId);
      intervals.delete(timerId);
      return;
    }
    broadcastTimerUpdate(timerId);
  }, UPDATE_INTERVAL);
  
  intervals.set(timerId, intervalId);
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'START_TIMER': {
      const { timerId, duration, taskId } = data;
      
      // Store timer state
      timers.set(timerId, {
        timerId,
        startedAt: Date.now(),
        duration: duration * 60 * 1000, // Convert minutes to ms
        pausedAt: null,
        totalPausedDuration: 0,
        taskId,
        completed: false
      });
      
      // Start broadcasting updates
      startBroadcasting(timerId);
      
      // Send confirmation
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          success: true,
          timerId
        });
      }
      break;
    }
    
    case 'PAUSE_TIMER': {
      const { timerId } = data;
      const timer = timers.get(timerId);
      
      if (timer && !timer.pausedAt) {
        timer.pausedAt = Date.now();
        
        // Stop broadcasting
        const intervalId = intervals.get(timerId);
        if (intervalId) {
          clearInterval(intervalId);
          intervals.delete(timerId);
        }
        
        // Send update
        broadcastTimerUpdate(timerId);
      }
      
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
      break;
    }
    
    case 'RESUME_TIMER': {
      const { timerId } = data;
      const timer = timers.get(timerId);
      
      if (timer && timer.pausedAt) {
        // Calculate pause duration and add to total
        const pauseDuration = Date.now() - timer.pausedAt;
        timer.totalPausedDuration += pauseDuration;
        timer.pausedAt = null;
        
        // Resume broadcasting
        startBroadcasting(timerId);
      }
      
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
      break;
    }
    
    case 'STOP_TIMER': {
      const { timerId, completed = false } = data;
      const timer = timers.get(timerId);
      
      if (timer) {
        // Stop broadcasting
        const intervalId = intervals.get(timerId);
        if (intervalId) {
          clearInterval(intervalId);
          intervals.delete(timerId);
        }
        
        // Mark as completed if specified
        if (completed) {
          timer.completed = true;
          await handleTimerComplete(timerId);
        } else {
          // Send stop notification
          const clients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
          });
          
          clients.forEach(client => {
            client.postMessage({
              type: 'TIMER_STOPPED',
              data: { timerId }
            });
          });
          
          timers.delete(timerId);
        }
      }
      
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
      break;
    }
    
    case 'GET_TIMER_STATE': {
      const { timerId } = data;
      const timer = timers.get(timerId);
      
      if (timer) {
        const elapsed = calculateElapsed(timer);
        const remaining = Math.max(0, timer.duration - elapsed);
        
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            exists: true,
            remainingSeconds: Math.floor(remaining / 1000),
            isRunning: !timer.pausedAt && remaining > 0,
            isPaused: !!timer.pausedAt,
            startedAt: timer.startedAt,
            taskId: timer.taskId
          });
        }
      } else {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ exists: false });
        }
      }
      break;
    }
    
    case 'GET_ALL_TIMERS': {
      const activeTimers = Array.from(timers.values()).map(timer => {
        const elapsed = calculateElapsed(timer);
        const remaining = Math.max(0, timer.duration - elapsed);
        
        return {
          timerId: timer.timerId,
          remainingSeconds: Math.floor(remaining / 1000),
          isRunning: !timer.pausedAt && remaining > 0,
          isPaused: !!timer.pausedAt,
          taskId: timer.taskId
        };
      });
      
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ timers: activeTimers });
      }
      break;
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'start-break') {
    // Send message to start break timer
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'START_BREAK',
            data: { duration: 5 }
          });
        });
      })
    );
  } else if (event.action === 'start-another') {
    // Send message to start another focus session
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'START_NEW_SESSION',
            data: {}
          });
        });
      })
    );
  }
  
  // Focus or open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window/tab open
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/focus');
      }
    })
  );
});

// Install event
self.addEventListener('install', (event) => {
  console.log('Timer Service Worker installed');
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Timer Service Worker activated');
  event.waitUntil(self.clients.claim()); // Take control of all clients immediately
});

// Periodic sync for timer recovery (if browser supports it)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-timers') {
    event.waitUntil(checkAndRecoverTimers());
  }
});

// Check and recover timers (for when SW restarts)
async function checkAndRecoverTimers() {
  // This would connect to IndexedDB to recover timer state
  // For now, we'll rely on the main app to re-register active timers
  console.log('Checking for timers to recover...');
}