export const socketConnectionAuthenticated = () => {
  return {
    type: 'SOCKET_CONNECTED',
  }
}

/*
    used only in the socket middleware
*/
export const requestSocketAuthentication = payload => {
  return {
    type: 'REQUEST_SOCKET_AUTHENTICATION',
    payload,
  }
}

export const socketDataUpdated = data => {
  return {
    type: 'SOCKET_STATUS_UPDATED',
    payload: data,
  }
}

export const updateReSpeakData = data => {
  return {
    type: 'UPDATE_RESPEAK_DATA',
    payload: data,
  }
}

export const requestLogoutSocket = () => ({
  type: 'LOGOUT_SOCKET',
})

export const setIsAuthenticatingSocket = payload => ({
  type: 'SET_IS_AUTHENTICATING_SOCKET',
  payload,
})
