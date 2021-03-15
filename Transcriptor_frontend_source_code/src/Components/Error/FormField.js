import React from 'react'

const InputError = props => {
  return (
    <div style={styles.error}>
      <span>
        <svg
          aria-hidden="true"
          style={styles.icon}
          fill="currentColor"
          focusable="false"
          width="16px"
          height="16px"
          viewBox="0 0 24 24"
          xmlns="https://www.w3.org/2000/svg"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
        </svg>
      </span>

      <span style={styles.message} className="error-message">
        {props.message}
      </span>
    </div>
  )
}

/*
  Define Styles for the InputError Component
*/
const styles = {
  error: {
    color: '#d93025',
    fontSize: '12px',
    lineHeight: 'normal',
    marginTop: '2px',
  },
  icon: {
    marginTop: '2px',
    display: 'inline-block',
  },
  message: {
    marginLeft: '5px',
    display: 'inline-block',
    position: 'absolute',
    marginTop: '2px',
  },
}

export default InputError
