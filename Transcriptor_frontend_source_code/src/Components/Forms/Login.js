import React, { useState } from 'react'
import { Form } from 'semantic-ui-react'
import InputError from '../Error/FormField'
import { Redirect } from 'react-router-dom'
import PropTypes from 'prop-types'
import '../styles.css'

import { Button, Paper } from '@material-ui/core'
import styled from 'styled-components'
import { signUserIn } from '../../actions/UserActions'
import { useDispatch, useSelector } from 'react-redux'

const ActionWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
`

const LoginForm = props => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState({
    email: null,
    password: null,
  })

  const { user, isLoading } = useSelector(state => ({ ...state.USER }))

  const dispatch = useDispatch()

  const styles = LoginFormStyles

  const handleInputChange = (setFunction, fieldValue) => setFunction(fieldValue)

  const authenticateUser = async () => {
    setErrorState({ email: null, password: null })
    // setLoading(true);

    /*
            Validate form Data
        */
    if (email === '') {
      setErrorState({ ...errorState, email: 'empty' })
    } else if (email !== '' && password === '') {
      setErrorState({ ...errorState, password: 'empty' })
    } else if (email !== '' && password !== '') {
      const formData = { email, password }

      dispatch(signUserIn(formData))
    }
  }

  return (
    <React.Fragment>
      {user && <Redirect to="/" />}
      <Paper style={{ padding: '1em 1.5em' }}>
        <h3 style={styles.title}>Sign in</h3>
        <Form style={styles.FormBox}>
          <Form.Field style={styles.inputField}>
            <input
              id="email"
              name="email"
              type="text"
              disabled={isLoading}
              placeholder="Email ID"
              style={
                errorState.email !== null
                  ? { ...styles.input, ...styles.error }
                  : styles.input
              }
              onChange={e => handleInputChange(setEmail, e.target.value)}
            />

            {errorState.email === 'empty' && (
              <InputError message={'Enter an email ID'} />
            )}

            {errorState.email === 'wrong' && (
              <InputError message={"Couldn't find your account"} />
            )}
          </Form.Field>
          <Form.Field style={styles.inputField}>
            <input
              id="password"
              name="password"
              disabled={isLoading}
              type="password"
              placeholder="Password"
              style={
                errorState.password !== null
                  ? { ...styles.input, ...styles.error }
                  : styles.input
              }
              onChange={e => handleInputChange(setPassword, e.target.value)}
            />
            {errorState.password === 'empty' && (
              <InputError message={'Enter a password'} />
            )}

            {errorState.password === 'wrong' && (
              <InputError message={'Wrong password. Try again'} />
            )}
          </Form.Field>
          <ActionWrapper>
            <Button disabled={isLoading} href="#/register">
              <b>Register</b>
            </Button>
            <Button
              disabled={isLoading}
              type="submit"
              variant="contained"
              onClick={authenticateUser}
              color="primary"
            >
              Login
            </Button>
          </ActionWrapper>
        </Form>
      </Paper>
    </React.Fragment>
  )
}

/*
  Define LoginForm PropTypes
*/
LoginForm.propTypes = {
  location: PropTypes.object,
}

/*
  Define Styles for the LoginForm Component
*/
const LoginFormStyles = {
  FormBox: {
    marginTop: '3em',
    fontFamily: 'Open Sans',
    fontWeight: '400',
  },
  inputField: {
    fontSize: '16px',
    width: '100%',
  },
  input: {
    margin: '1px 1px 0px',
    padding: '13px 15px',
    height: '54px',
    border: '1px solid rgba(0,0,0,0.2)',
  },
  button: {
    margin: '24px',
    backgroundColor: '0 0',
    color: '#fff',
    float: 'right',
  },
  label: {
    margin: '30px 16px',
    fontSize: '15px',
    fontWeight: 'bold',
    a: {
      textDecoration: 'none',
      color: '#fff',
    },
  },
  error: {
    border: '1.5px solid #d93025',
  },
  title: {
    fontSize: '24px',
    textAlign: 'center',
    fontFamily: 'Open Sans',
    fontWeight: '400',
    marginTop: 20,
  },
}

export default LoginForm
