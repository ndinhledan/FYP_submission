const initialState = {
  user: null,
  isLoading: false,
}

const userReducers = (state = initialState, { type, payload }) => {
  switch (type) {
    case 'SET_LOADING_USER':
      state = { ...state, isLoading: payload }
      break
    case 'SET_AUTHENTICATE_USER':
      state = { ...state, user: payload }
      break
    default:
      return state
  }
  return state
}

export default userReducers
