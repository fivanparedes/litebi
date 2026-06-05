import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { useSettingsStore } from './settingsStore'

// Helper for random color
const generateColor = () => {
  const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc', '#f472b6']
  return colors[Math.floor(Math.random() * colors.length)]
}

export const useCollaborationStore = defineStore('collaboration', () => {
  const settingsStore = useSettingsStore()
  
  // Yjs State
  const ydoc = new Y.Doc()
  let provider = null
  
  // Reactive presence
  const collaborators = ref(new Map())
  const userColor = ref(generateColor())
  const isConnected = ref(false)

  // Disconnect from current room
  const disconnect = () => {
    if (provider) {
      provider.disconnect()
      provider.destroy()
      provider = null
      isConnected.value = false
      collaborators.value.clear()
    }
  }

  // Connect to a new room
  const connect = () => {
    disconnect()
    
    // We append a custom prefix so different LiteBI apps don't collide if they use common room names like "test"
    const room = `litebi-collab-${settingsStore.roomName}`
    
    // Create new provider
    // Using default signaling servers provided by the y-webrtc community for demo purposes
    provider = new WebrtcProvider(room, ydoc)
    isConnected.value = true

    // Update local awareness
    updateLocalPresence()

    // Listen to remote awareness changes
    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates()
      const newMap = new Map()
      states.forEach((state, clientID) => {
        // Skip our own client ID
        if (clientID !== ydoc.clientID && state.user) {
          newMap.set(clientID, state.user)
        }
      })
      collaborators.value = newMap
    })
  }

  // Update our state (sent to others)
  const updateLocalPresence = (extraState = {}) => {
    if (!provider) return
    provider.awareness.setLocalStateField('user', {
      name: settingsStore.username,
      color: userColor.value,
      ...extraState
    })
  }

  // Update cursor position (called from DashboardCanvas)
  const updateCursor = (x, y) => {
    if (!isConnected.value) return
    updateLocalPresence({ cursor: { x, y } })
  }

  // React to username changes
  watch(() => settingsStore.username, () => {
    if (isConnected.value) updateLocalPresence()
  })

  // React to room name changes
  watch(() => settingsStore.roomName, () => {
    if (isConnected.value) connect() // reconnect to new room only if already connected
  })

  return {
    ydoc,
    collaborators,
    isConnected,
    userColor,
    connect,
    disconnect,
    updateCursor
  }
})
