import React from 'react'
import { mount } from 'enzyme'
import App from '../App.js'
import Login from '../Components/Forms/Login'
import Register from '../Components/Forms/Register'

describe('Components/Forms/Register.js', () => {
  /*
        Mock window.location.href
    */
  const { location } = window
  const URL = 'http://localhost:3003/register'

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

  test('error message displayed on empty form submit', () => {
    const wrapper = mount(<App />)

    const $register = wrapper.find(Register)

    const $nextBtn = $register.find('button.next-btn')
    $nextBtn.simulate('click')

    const $errorMessage = wrapper.find('.error-message')

    expect($errorMessage.text()).toBe('Please check your First Name')
  })

  test('error message displayed when last name is empty', () => {
    const wrapper = mount(<App />)

    const $register = wrapper.find(Register)

    const formData = [
      {
        id: '#firstname',
        name: 'firstname',
        value: 'Gagan',
      },
      {
        id: '#lastname',
        name: 'lastname',
        value: '',
      },
      {
        id: '#email',
        name: 'email',
        value: 'randomID@gmail.com',
      },
      {
        id: '#password',
        name: 'password',
        value: 'valid_password',
      },
    ]

    for (const field of formData) {
      const $field = $register.find(field.id)
      $field.simulate('change', {
        target: { name: field.name, value: field.value },
      })
    }

    const $nextBtn = $register.find('button.next-btn')
    $nextBtn.simulate('click')

    const $errorMessage = wrapper.find('.error-message')
    expect($errorMessage.text()).toBe('Please check your Last Name')
  })

  test('error message displayed when email is empty', () => {
    const wrapper = mount(<App />)

    const $register = wrapper.find(Register)

    const formData = [
      {
        id: '#firstname',
        name: 'firstname',
        value: 'Gagan',
      },
      {
        id: '#lastname',
        name: 'lastname',
        value: 'Ganapathy',
      },
      {
        id: '#email',
        name: 'email',
        value: '',
      },
      {
        id: '#password',
        name: 'password',
        value: 'valid_password',
      },
    ]

    for (const field of formData) {
      const $field = $register.find(field.id)
      $field.simulate('change', {
        target: { name: field.name, value: field.value },
      })
    }

    const $nextBtn = $register.find('button.next-btn')
    $nextBtn.simulate('click')

    const $errorMessage = wrapper.find('.error-message')
    expect($errorMessage.text()).toBe('Please check your Email ID')
  })

  test('error message displayed when password is empty', () => {
    const wrapper = mount(<App />)

    const $register = wrapper.find(Register)

    const formData = [
      {
        id: '#firstname',
        name: 'firstname',
        value: 'Gagan',
      },
      {
        id: '#lastname',
        name: 'lastname',
        value: 'Ganapathy',
      },
      {
        id: '#email',
        name: 'email',
        value: 'randomID@gmail.com',
      },
      {
        id: '#password',
        name: 'password',
        value: '',
      },
    ]

    for (const field of formData) {
      const $field = $register.find(field.id)
      $field.simulate('change', {
        target: { name: field.name, value: field.value },
      })
    }

    const $nextBtn = $register.find('button.next-btn')
    $nextBtn.simulate('click')

    const $errorMessage = wrapper.find('.error-message')
    expect($errorMessage.text()).toBe('Please check your password')
  })

  test('link to `Login` works', () => {
    let wrapper = mount(<App />)

    const $register = wrapper.find(Register)

    const $loginLink = $register.find('a')
    const href = $loginLink.prop('href')

    window.location.href = 'http://localhost:3003' + href // to go /login

    wrapper = mount(<App />)

    expect(wrapper.exists(Login)).toBe(true)
  })
})
