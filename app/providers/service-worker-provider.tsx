'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

interface ServiceWorkerContextType {
  isSupported: boolean
  isRegistered: boolean
  registration: ServiceWorkerRegistration | null
  sendMessage: (message: any) => Promise<any>
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType>({
  isSupported: false,
  isRegistered: false,
  registration: null,
  sendMessage: async () => null
})

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator
  
  // Store message callbacks
  const messageCallbacks = useRef<Map<string, (data: any) => void>>(new Map())
  const messageIdCounter = useRef(0)
  
  // Send message to service worker with response
  const sendMessage = async (message: any): Promise<any> => {
    if (!registration?.active) {
      console.warn('Service worker not active')
      return null
    }
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      // Set up response handler
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data)
      }
      
      // Send message with port for response (we checked active is not null above)
      registration.active!.postMessage(message, [messageChannel.port2])
      
      // Timeout after 5 seconds
      setTimeout(() => {
        resolve(null)
      }, 5000)
    })
  }
  
  useEffect(() => {
    if (!isSupported) {
      console.log('Service workers not supported')
      return
    }
    
    let mounted = true
    
    const registerServiceWorker = async () => {
      try {
        // Register service worker
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        
        if (!mounted) return
        
        console.log('Service worker registered:', reg)
        setRegistration(reg)
        setIsRegistered(true)
        
        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && mounted) {
              console.log('Service worker updated')
              // Could show a notification to the user
            }
          })
        })
        
        // Handle messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('Message from service worker:', event.data)
          
          const { type, data } = event.data
          
          // Handle different message types
          switch (type) {
            case 'TIMER_UPDATE':
              // Dispatch custom event for timer updates
              window.dispatchEvent(new CustomEvent('sw-timer-update', {
                detail: data
              }))
              break
              
            case 'TIMER_COMPLETE':
              // Dispatch timer complete event
              window.dispatchEvent(new CustomEvent('sw-timer-complete', {
                detail: data
              }))
              
              // Show in-app notification
              window.dispatchEvent(new CustomEvent('timer-complete', {
                detail: { taskId: data.taskId }
              }))
              break
              
            case 'TIMER_STOPPED':
              // Dispatch timer stopped event
              window.dispatchEvent(new CustomEvent('sw-timer-stopped', {
                detail: data
              }))
              break
              
            case 'START_BREAK':
              // Handle break request from notification
              window.dispatchEvent(new CustomEvent('sw-start-break', {
                detail: data
              }))
              break
              
            case 'START_NEW_SESSION':
              // Handle new session request from notification
              window.dispatchEvent(new CustomEvent('sw-start-new-session', {
                detail: data
              }))
              break
          }
        })
        
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }
    
    registerServiceWorker()
    
    return () => {
      mounted = false
    }
  }, [isSupported])
  
  // Request notification permission when registered
  useEffect(() => {
    if (!isRegistered) return
    
    // Check and request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't automatically request, wait for user interaction
      // This could be triggered by a button click instead
      console.log('Notification permission can be requested when starting timer')
    }
  }, [isRegistered])
  
  return (
    <ServiceWorkerContext.Provider 
      value={{
        isSupported,
        isRegistered,
        registration,
        sendMessage
      }}
    >
      {children}
    </ServiceWorkerContext.Provider>
  )
}

export const useServiceWorker = () => {
  const context = useContext(ServiceWorkerContext)
  if (!context) {
    throw new Error('useServiceWorker must be used within ServiceWorkerProvider')
  }
  return context
}