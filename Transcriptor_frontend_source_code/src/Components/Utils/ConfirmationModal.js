import React, { useState } from 'react'
import { Button, Header, Icon, Modal } from 'semantic-ui-react'
import '../styles.css'

const ConfirmationModal = props => {
  const [modalOpen, setModalOpen] = useState(false)

  const handleOpen = () => {
    setModalOpen(true)
  }

  const handleClose = action => {
    setModalOpen(false)
    props.callback(action)
  }

  return (
    <Modal
      trigger={<i className="fas fa-times-circle" onClick={handleOpen}></i>}
      basic
      size="small"
      className="confirmation-modal"
      open={modalOpen}
    >
      <Header icon={props.icon} content={props.content} />
      <Modal.Content>
        <p>{props.body}</p>
      </Modal.Content>
      <Modal.Actions>
        <Button basic inverted onClick={() => handleClose('no')}>
          <Icon name="remove" /> No
        </Button>
        <Button color="red" inverted onClick={() => handleClose('yes')}>
          <Icon name="checkmark" /> Yes
        </Button>
      </Modal.Actions>
    </Modal>
  )
}

export default ConfirmationModal
