'use client'

import { useEffect, useState } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

const listeners: Array<(state: ToastState) => void> = []
let memoryState: ToastState = { toasts: [] }

function dispatch(action: any) {
  memoryState = reducer(memoryState, action)
  // Snapshot listeners to avoid issues if a listener unsubscribes during notify
  const snapshot = listeners.slice()
  snapshot.forEach((listener) => {
    try {
      listener(memoryState)
    } catch (_) {
      // no-op: guard against listener errors affecting others
    }
  })
}

type ActionType = 
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'UPDATE_TOAST'; toast: Partial<Toast> }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string }

function reducer(state: ToastState, action: ActionType): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, 5),
      }

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      if (toastId) {
        return {
          ...state,
          toasts: state.toasts.filter((t) => t.id !== toastId),
        }
      }

      return {
        ...state,
        toasts: [],
      }
    }

    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
  // Default: return current state unchanged
  return state
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

export function toast(props: Omit<Toast, 'id'>) {
  const id = genId()
  const toast = { ...props, id }
  
  dispatch({
    type: 'ADD_TOAST',
    toast,
  })
  
  if (props.duration !== 0) {
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', toastId: id })
    }, props.duration || 5000)
  }
  
  return {
    id,
    dismiss: () => dispatch({ type: 'DISMISS_TOAST', toastId: id }),
    update: (props: Partial<Toast>) =>
      dispatch({ type: 'UPDATE_TOAST', toast: { ...props, id } }),
  }
}

export function useToast() {
  const [state, setState] = useState<ToastState>(memoryState)

  // Subscribe on mount; unsubscribe on unmount
  useEffect(() => {
    const listener = (s: ToastState) => setState(s)
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  }
}
