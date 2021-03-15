import React from 'react'
import { mount } from 'enzyme'
import App from '../App'

describe('App.js', () => {
  /*
        Mock window.location.href
    */
  const { location } = window

  beforeAll(() => {
    delete window.location

    window.location = {
      href: '',
    }
  })

  afterAll(() => {
    window.location = location
  })

  test('register component is rendered on `/register`', () => {
    const URL = 'http://localhost:3003/register'

    window.location.href = URL

    const wrapper = mount(<App />)
    const $h3 = wrapper.find('h3')

    expect($h3.text()).toBe('Register')
  })

  test('register component is rendered on `/login`', () => {
    const URL = 'http://localhost:3003/login'

    window.location.href = URL

    const wrapper = mount(<App />)
    const $h3 = wrapper.find('h3')

    expect($h3.text()).toBe('Sign in')
  })
})
