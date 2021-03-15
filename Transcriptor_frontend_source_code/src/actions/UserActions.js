import dataProvider from '../Components/dataProvider'
import {
  requestLogoutSocket,
  requestSocketAuthentication,
} from './SocketActions'
import { handleError, handleSuccessMessage } from './TranscriptionActions'

export const registerUser = data => async dispatch => {
  dispatch(setAuthenticatingUser(true))

  try {
    const res = await dataProvider.auth('register', {
      options: {
        data,
      },
    })
    if (res) {
      dispatch(handleSuccessMessage('Register success! Redirecting...'))

      await dispatch(signUserIn(data))
    } else {
      dispatch(handleError("Couldn't register user, please try again!"))
    }
  } catch (err) {
    if (err.response && 'message' in err.response.data) {
      dispatch(handleError(err.response.data.message))
    } else {
      dispatch(
        handleError(
          'Failed to register user, please refresh your page and try again!',
        ),
      )
    }
  } finally {
    dispatch(setAuthenticatingUser(false))
  }
}

export const signUserIn = data => async dispatch => {
  dispatch(setAuthenticatingUser(true))
  try {
    const res = await dataProvider.auth('login', {
      options: {
        data,
      },
    })
    if (res) {
      const token = res.data.accessToken
      localStorage.setItem('token', token)
      dispatch(requestSocketAuthentication(token))
    } else {
      dispatch(handleError('Please check your login credentials!'))
    }
  } catch (err) {
    console.log(err)
    if (err.response && 'message' in err.response.data) {
      dispatch(handleError(err.response.data.message))
    } else {
      dispatch(handleError('Login failed, please refresh and try again!'))
    }
  } finally {
    dispatch(setAuthenticatingUser(false))
  }
}

export const signUserOut = () => dispatch => {
  localStorage.clear()
  dispatch(setUserAuthed(null))
  dispatch(requestLogoutSocket())
}

const setAuthenticatingUser = payload => ({
  type: 'SET_LOADING_USER',
  payload,
})

export const setUserAuthed = user => ({
  type: 'SET_AUTHENTICATE_USER',
  payload: user,
})
