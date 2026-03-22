import { create } from 'zustand'

const useAppStore = create((set) => ({
  // Matrix Client
  matrixClient: null,
  setMatrixClient: (client) => set({ matrixClient: client }),

  // Ausgewählter "Server" (Matrix Space)
  activeSpaceId: null,
  setActiveSpaceId: (id) => set({ activeSpaceId: id }),

  // Ausgewählter Kanal (Matrix Room)
  activeRoomId: null,
  setActiveRoomId: (id) => set({ activeRoomId: id }),

  // Räume die wir kennen
  rooms: [],
  setRooms: (rooms) => set({ rooms }),

  // Nachrichten pro Raum
  messages: {},
  addMessage: (roomId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] || []), message],
      },
    })),

  // Auth
  isLoggedIn: false,
  setLoggedIn: (val) => set({ isLoggedIn: val }),

  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}))

export default useAppStore