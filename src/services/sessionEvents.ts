// Lets the axios layer (outside the React tree) notify a root-mounted modal
// that the admin's session has expired, without prop-drilling or a context call.
type Listener = (message: string) => void

let listeners: Listener[] = []

export function onSessionExpired(listener: Listener): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function emitSessionExpired(message: string): void {
  listeners.forEach((listener) => listener(message))
}
