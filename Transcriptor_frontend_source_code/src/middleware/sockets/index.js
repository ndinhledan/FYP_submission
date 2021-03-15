import io from 'socket.io-client'
import {
  setUserAuthed,
  updateTranscriptStatus,
  socketDataUpdated,
  socketConnectionAuthenticated,
  updateReSpeakData,
  setIsAuthenticatingSocket,
} from '../../actions'

const socketMiddleware = () => {
  return store => {
    const socket = io(`${process.env.REACT_APP_API_HOST}`, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    })

    socket.on('connect', data => {
      console.log('Socket connected!')
    })

    socket.on('authentication failed', data => {
      store.dispatch(setIsAuthenticatingSocket(false))
      console.log('Socket authentication failed!')
    })

    socket.on('unauthenticated', data => {
      console.log('Socket authentication failed!')
    })

    socket.on('authenticated', user => {
      console.log('Socket authenticated successfully!')

      store.dispatch(socketConnectionAuthenticated())
      store.dispatch(setUserAuthed(user))
      store.dispatch(setIsAuthenticatingSocket(false))

      socket.emit('join room')
    })

    socket.on('status updated', data => {
      /*
                Only send the important info from data
            */
      const { _id, content } = { ...data.speech, ...data.status }
      store.dispatch(socketDataUpdated({ _id, content }))
      store.dispatch(updateTranscriptStatus({ _id, content }))
    })

    socket.on('respeak done', data => {
      store.dispatch(updateReSpeakData(data))
    })

    const authenticateSocket = _token => {
      const token = _token || localStorage.getItem('token')
      if (token) {
        store.dispatch(setIsAuthenticatingSocket(true))
        socket.emit('authenticate', {
          token,
        })
      }
    }

    const logoutSocket = () => {
      socket.emit('logout')
      console.log('Socket logout')
    }

    return next => action => {
      switch (action.type) {
        case 'REQUEST_SOCKET_AUTHENTICATION':
          authenticateSocket(action.payload)
          break
        case 'LOGOUT_SOCKET':
          logoutSocket()
          break
        default:
          next(action)
      }
    }
  }
}

export default socketMiddleware
