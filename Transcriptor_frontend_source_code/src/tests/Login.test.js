import React from 'react'
import { mount } from 'enzyme'
import App from '../App.js'
import Login from '../Components/Forms/Login'
import Register from '../Components/Forms/Register'

describe('Components/Forms/Login.js', () => {
  /*
        Mock window.location.href
    */
  const { location } = window
  const URL = 'http://localhost:3003/login'

  beforeAll(() => {
    delete window.location

    window.location = {
      href: '',
    }

    window.location.href = URL
  })

  afterAll(() => {
    window.location = location
  })

  test('error is displayed on empty form submit', () => {
    const wrapper = mount(<App />)

    const $login = wrapper.find(Login)

    const $nextBtn = $login.find('button.next-btn')
    $nextBtn.simulate('click')

    const $errorMessage = wrapper.find('.error-message')

    expect($errorMessage.text()).toBe('Enter an email ID')
  })

  test('error is displayed on empty password field', () => {
    const wrapper = mount(<App />)

    const $login = wrapper.find(Login)

    const $emailField = $login.find('#email')
    $emailField.simulate('change', {
      target: { name: 'email', value: 'abcde@gmail.com' },
    })

    const $nextBtn = $login.find('button.next-btn')
    $nextBtn.simulate('click')

    const $errorMessage = wrapper.find('.error-message')

    expect($errorMessage.text()).toBe('Enter a password')
  })

  test('link to `create account` works', () => {
    let wrapper = mount(<App />)

    const $login = wrapper.find(Login)

    const $createAccountLink = $login.find('a')
    const href = $createAccountLink.prop('href')

    window.location.href = 'http://localhost:3003' + href // to go /register

    wrapper = mount(<App />)

    expect(wrapper.exists(Register)).toBe(true)
  })
})
