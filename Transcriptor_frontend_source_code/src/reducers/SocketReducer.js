const initialState = {
  connected: false,
  statusData: null,
  reSpeakData: null,
  isAuthenticatingToken: false,
}

const socketReducers = (state = initialState, { type, payload }) => {
  switch (type) {
    case 'SET_IS_AUTHENTICATING_SOCKET':
      return { ...state, isAuthenticatingToken: payload }
    case 'SOCKET_CONNECTED':
      return { ...state, connected: true }
    case 'SOCKET_STATUS_UPDATED':
      return { ...state, statusData: payload }
    case 'UPDATE_RESPEAK_DATA':
      return { ...state, reSpeakData: payload }
    default:
      return state
  }
}

export default socketReducers
