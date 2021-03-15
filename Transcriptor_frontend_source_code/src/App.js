import React, { useEffect } from 'react'
import 'semantic-ui-css/semantic.min.css'
import { Grid } from 'semantic-ui-react'
import LoginForm from './Components/Forms/Login'
import RegisterForm from './Components/Forms/Register'
import { useToasts } from 'react-toast-notifications'
import { library } from '@fortawesome/fontawesome-svg-core'
import * as icons from './icons'
import { useSelector, useDispatch } from 'react-redux'
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom'
import Dashboard from './Components/Screens/Dashboard'
import {
  removeError,
  removeSuccessMessage,
} from './actions/TranscriptionActions'
import { requestSocketAuthentication } from './actions'

library.add(icons)

const PrivateRoute = () => {
  const { user } = useSelector(state => ({ ...state.USER }))

  return !user ? (
    <Redirect to="login" />
  ) : (
    <Switch>
      <Route path="/dashboard" exact={true} component={Dashboard} />
      <Redirect from="/" to="/dashboard" />
    </Switch>
  )
}

const RegisterPage = () => {
  const styles = AppStyles

  return (
    <div className="App">
      <Grid columns={3}>
        <Grid.Column></Grid.Column>
        <Grid.Column style={{ ...styles.FormContainer }}>
          <RegisterForm />
        </Grid.Column>
        <Grid.Column></Grid.Column>
      </Grid>
    </div>
  )
}

const LoginPage = () => {
  const styles = AppStyles
  const { isAuthenticatingToken } = useSelector(state => ({ ...state.SOCKET }))

  console.log(isAuthenticatingToken)

  return isAuthenticatingToken ? null : (
    <div className="App">
      <Grid columns={3}>
        <Grid.Column></Grid.Column>
        <Grid.Column style={{ ...styles.FormContainer }}>
          <LoginForm />
        </Grid.Column>
        <Grid.Column></Grid.Column>
      </Grid>
    </div>
  )
}

const App = () => {
  const { addToast } = useToasts()
  const { errorMsg, successMsg } = useSelector(state => ({
    ...state.TRANSCRIPTION,
  }))
  const dispatch = useDispatch()

  useEffect(() => {
    if (errorMsg) {
      addToast(errorMsg, {
        autoDismiss: true,
        appearance: 'error',
        autoDismissTimeout: 3000,
      })

      dispatch(removeError())
    }
  }, [errorMsg, dispatch, addToast])

  useEffect(() => {
    if (successMsg) {
      addToast(successMsg, {
        autoDismiss: true,
        appearance: 'success',
        autoDismissTimeout: 3000,
      })

      dispatch(removeSuccessMessage())
    }
  }, [successMsg, dispatch, addToast])

  useEffect(() => {
    /*
            Authenticate socket connection with token
            using the socket middleware
        */
    dispatch(requestSocketAuthentication())
  }, [dispatch])

  return (
    <Router>
      <Switch>
        <Route path="/login" exact={true} component={LoginPage} />
        <Route path="/register" exact={true} component={RegisterPage} />
        <Route path="/">
          <PrivateRoute />
        </Route>
      </Switch>
    </Router>
  )
}

/*
  Define Styles for the App Component
*/
const AppStyles = {
  FormContainer: {
    margin: '10% auto',
    // border: '1px solid rgba(0, 0, 0, 0.2)',
    padding: '48px 40px 36px',
    borderRadius: '10px',
    maxWidth: '482px',
    paddingBottom: '100px',
  },
}

export default App
