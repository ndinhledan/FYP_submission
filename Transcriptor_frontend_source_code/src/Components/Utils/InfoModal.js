import React from 'react'
import { Button, Modal } from 'semantic-ui-react'
import shortcuts from '../shortcuts'
import '../styles.css'

const InfoModal = () => {
  const ShortCuts = () => {
    const ShortCutSections = []
    for (const title in shortcuts) {
      ShortCutSections.push(
        <div className="modal-section">
          <div className="modal-section-title">{title}</div>
          <div className="modal-section-body">
            {shortcuts[title].map(({ label, icon, title }) => {
              return (
                <div className="shortcut-info">
                  <label className="shortcut-label">{label}</label>
                  <label className="shortcut-label-title">{title}</label>
                  {/* <img className="shortcut-icon" alt={title} src={icon} title={title} /> */}
                </div>
              )
            })}
          </div>
        </div>,
      )
    }
    return ShortCutSections
  }

  return (
    <Modal
      trigger={
        <Button>
          <i className="fas fa-info-circle"></i>
        </Button>
      }
      className="info-modal"
    >
      <div className="modal-body">
        <ShortCuts />
      </div>
    </Modal>
  )
}

export default InfoModal
