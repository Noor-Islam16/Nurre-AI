import { useEffect, useRef } from 'react'

/**
 * Hook to manage cleanup functions for React components
 * Ensures all cleanup functions are called when component unmounts
 */
export function useCleanup() {
  const cleanupFns = useRef<(() => void)[]>([])

  const addCleanup = (fn: () => void) => {
    cleanupFns.current.push(fn)
  }

  useEffect(() => {
    return () => {
      cleanupFns.current.forEach(fn => {
        try {
          fn()
        } catch (error) {
          console.error('Cleanup error:', error)
        }
      })
      cleanupFns.current = []
    }
  }, [])

  return addCleanup
}

/**
 * Hook for setInterval with automatic cleanup
 * Prevents memory leaks from intervals not being cleared
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(callback)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval
  useEffect(() => {
    if (delay === null) return

    const tick = () => {
      if (savedCallback.current) {
        savedCallback.current()
      }
    }
    
    const id = setInterval(tick, delay)
    
    return () => clearInterval(id)
  }, [delay])
}

/**
 * Hook for setTimeout with automatic cleanup
 * Prevents memory leaks from timeouts not being cleared
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(callback)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the timeout
  useEffect(() => {
    if (delay === null) return

    const id = setTimeout(() => {
      if (savedCallback.current) {
        savedCallback.current()
      }
    }, delay)
    
    return () => clearTimeout(id)
  }, [delay])
}

/**
 * Hook to manage event listeners with automatic cleanup
 * Prevents memory leaks from event listeners not being removed
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | Element | null = window,
  options?: boolean | AddEventListenerOptions
) {
  const savedHandler = useRef<(event: WindowEventMap[K]) => void>(handler)

  // Update ref.current value if handler changes
  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    // Make sure element supports addEventListener
    if (!element || !element.addEventListener) return

    // Create event listener that calls handler function stored in ref
    const eventListener = (event: Event) => {
      if (savedHandler.current) {
        savedHandler.current(event as WindowEventMap[K])
      }
    }

    // Add event listener
    element.addEventListener(eventName, eventListener, options)

    // Remove event listener on cleanup
    return () => {
      element.removeEventListener(eventName, eventListener, options)
    }
  }, [eventName, element, options])
}

/**
 * Hook to track and cleanup ResizeObserver
 * Prevents memory leaks from observers not being disconnected
 */
export function useResizeObserver(
  ref: React.RefObject<Element>,
  callback: ResizeObserverCallback
) {
  const observerRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    if (!ref.current) return

    // Create observer
    observerRef.current = new ResizeObserver(callback)
    observerRef.current.observe(ref.current)

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [ref, callback])
}

/**
 * Hook to track and cleanup IntersectionObserver
 * Prevents memory leaks from observers not being disconnected
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!ref.current) return

    // Create observer
    observerRef.current = new IntersectionObserver(callback, options)
    observerRef.current.observe(ref.current)

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [ref, callback, options])
}

/**
 * Hook to manage WebSocket connections with automatic cleanup
 * Prevents memory leaks from unclosed connections
 */
export function useWebSocket(
  url: string | null,
  options?: {
    onOpen?: (event: Event) => void
    onMessage?: (event: MessageEvent) => void
    onError?: (event: Event) => void
    onClose?: (event: CloseEvent) => void
    reconnect?: boolean
    reconnectInterval?: number
  }
) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null)

  const connect = () => {
    if (!url) return

    try {
      ws.current = new WebSocket(url)

      if (options?.onOpen) {
        ws.current.addEventListener('open', options.onOpen)
      }

      if (options?.onMessage) {
        ws.current.addEventListener('message', options.onMessage)
      }

      if (options?.onError) {
        ws.current.addEventListener('error', options.onError)
      }

      if (options?.onClose) {
        ws.current.addEventListener('close', (event) => {
          options.onClose!(event)

          // Auto-reconnect if enabled
          if (options.reconnect && !event.wasClean) {
            reconnectTimeoutId.current = setTimeout(() => {
              connect()
            }, options.reconnectInterval || 5000)
          }
        })
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
    }
  }

  useEffect(() => {
    connect()

    // Cleanup
    return () => {
      if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current)
      }

      if (ws.current) {
        ws.current.close()
        ws.current = null
      }
    }
  }, [url])

  const send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(data)
    }
  }

  const close = () => {
    if (ws.current) {
      ws.current.close()
    }
  }

  return { send, close }
}