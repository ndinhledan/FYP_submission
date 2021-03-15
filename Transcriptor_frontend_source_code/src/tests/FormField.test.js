import React from 'react'
import { mount } from 'enzyme'
import FormField from '../Components/Error/FormField'

describe('Components/Error/FormField.js', () => {
  test('form input error component display correct message', () => {
    const ERROR_MESSAGE = 'Enter an email ID'
    const wrapper = mount(<FormField message={ERROR_MESSAGE} />)

    const $span = wrapper.find('.error-message')

    expect($span.text()).toBe(ERROR_MESSAGE)
  })
})
