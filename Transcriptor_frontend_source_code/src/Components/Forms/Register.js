import React, { useState } from 'react'
import { Form } from 'semantic-ui-react'
import InputError from '../Error/FormField'
import '../styles.css'
import { Redirect } from 'react-router-dom'

import { Paper, Button } from '@material-ui/core'
import styled from 'styled-components'
import { useSelector, useDispatch } from 'react-redux'
import { registerUser } from '../../actions/UserActions'

const ActionWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 20px;
`

const RegisterForm = () => {
  const styles = LoginFormStyles

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorState, setErrorState] = useState({
    // firstname: null,
    // lastname: null,
    email: null,
    password: null,
    name: null,
  })

  const { user, isLoading } = useSelector(state => ({ ...state.USER }))

  const handleInputChange = (setFunction, fieldValue) => setFunction(fieldValue)

  const dispatch = useDispatch()

  const authenticateUser = () => {
    setErrorState({
      name: null,
      email: null,
      password: null,
    })

    if (name === '') {
      setErrorState({ ...errorState, name: 'error' })
    } else if (email === '') {
      setErrorState({ ...errorState, email: 'error' })
    } else if (password === '') {
      setErrorState({ ...errorState, password: 'error' })
    } else {
      const formData = { name, email, password }

      /*
                Send formData to the backend to authenticate
            */
      dispatch(registerUser(formData))
    }
  }

  return (
    <React.Fragment>
      {user && <Redirect to="/" />}
      <Paper style={{ paddingTop: 10 }}>
        <h3 style={styles.title}>Register</h3>
        <Form style={styles.FormBox}>
          <Form.Field style={styles.inputField}>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Name"
              disabled={isLoading}
              style={
                errorState.name !== null
                  ? { ...styles.input, ...styles.error }
                  : styles.input
              }
              onChange={e => handleInputChange(setName, e.target.value)}
            />
            {errorState.name === 'error' && (
              <InputError message={'Please check your Name'} />
            )}
          </Form.Field>
          <Form.Field style={styles.inputField}>
            <input
              id="email"
              name="email"
              disabled={isLoading}
              type="text"
              placeholder="Email ID"
              style={
                errorState.email !== null
                  ? { ...styles.input, ...styles.error }
                  : styles.input
              }
              onChange={e => handleInputChange(setEmail, e.target.value)}
            />

            {errorState.email === 'error' && (
              <InputError message={'Please check your Email ID'} />
            )}
          </Form.Field>
          <Form.Field style={styles.inputField}>
            <input
              id="password"
              name="password"
              disabled={isLoading}
              type="password"
              placeholder="Password (atleast 6 chars long)"
              style={
                errorState.password !== null
                  ? { ...styles.input, ...styles.error }
                  : styles.input
              }
              onChange={e => handleInputChange(setPassword, e.target.value)}
            />
            {errorState.password === 'error' && (
              <InputError message={'Please check your password'} />
            )}
          </Form.Field>
          <ActionWrapper>
            <Button disabled={isLoading} href="#/login">
              <b>Login</b>
            </Button>
            <Button
              disabled={isLoading}
              type="submit"
              variant="contained"
              onClick={authenticateUser}
              color="primary"
            >
              Register
            </Button>
          </ActionWrapper>
        </Form>
      </Paper>
    </React.Fragment>
  )
}

/*
  Define Styles for the Register Component
*/
const LoginFormStyles = {
  FormBox: {
    fontFamily: 'Open Sans',
    fontWeight: '400',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 30px',
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: '#fff',
  },
  label: {
    fontSize: '15px',
    fontWeight: 'bold',
    a: {
      textDecoration: 'none',
      color: 'rgba(0,0,0,0.8)',
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
  },
}

export default RegisterForm
