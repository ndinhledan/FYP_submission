import React, { useCallback, useState, useEffect } from 'react'
// import { makeStyles } from '@material-ui/core/styles'
import Modal from '@material-ui/core/Modal'
import Radio from '@material-ui/core/Radio'
import RadioGroup from '@material-ui/core/RadioGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import FormControl from '@material-ui/core/FormControl'
import FormLabel from '@material-ui/core/FormLabel'
import TextField from '@material-ui/core/TextField'
import Paper from '@material-ui/core/Paper'
import { FlexBox } from './FlexBox'
import { Button } from '@material-ui/core'

import { updateSpeakerName } from '../../actions'

import { useDispatch } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// const useStyles = makeStyles((theme) => ({
//   paper: {
//     position: 'absolute',
//     width: 400,
//     backgroundColor: theme.palette.background.paper,
//     border: '2px solid #000',
//     boxShadow: theme.shadows[5],
//     padding: theme.spacing(2, 4, 3),
//   },
// }))

function getModalStyle () {
  const top = 50
  const left = 50
  
  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: `translate(-${top}%, -${left}%)`,
    position: 'absolute',
    padding: '30px',
    paddingBottom: '10px',
    backgroundColor: '#424242',
    color: '#fff',
  }
}

export const EditSpeakerNameModal = ({ isOpen, handleClose, ...data }) => {
//   const classes = useStyles()

  const dispatch = useDispatch()

  const { speaker } = data

  const [modalStyle] = React.useState(getModalStyle)
  const [applyTo, setApplyTo] = useState('single')
  const [speakerName, setSpeakerName] = useState(speaker)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChangeApplyTo = useCallback(e => {
    setApplyTo(e.target.value)
  }, [])

  const handleChangeSpeakerName = useCallback(e => {
    setSpeakerName(e.target.value)
  }, [])

  const handleSaveEditSpeaker = async () => {
    setIsSubmitting(true)

    await dispatch(updateSpeakerName(speaker, speakerName, applyTo, data))

    handleClose()
    setIsSubmitting(false)
  }

  useEffect(() => {
    if (isOpen) {
      setSpeakerName(speaker)
    }
  }, [isOpen, speaker])

  const body = (
    <Paper style={modalStyle}>
      <h2 style={{ marginBottom: 20 }} id="speaker-name-modal-title">Edit Speaker Name</h2>
      <FlexBox direction="column" alignItems="flex-start">
        <TextField disabled={isSubmitting} label="Speaker Name" value={speakerName} onChange={handleChangeSpeakerName} />
        <FormControl component="fieldset" style={{ marginTop: 20 }}>
          <FormLabel component="legend" style={{ borderBottom: 0, margin: 0 }}>Apply to</FormLabel>
          <RadioGroup aria-label="Apply to" name="Apply to" value={applyTo} onChange={handleChangeApplyTo}>
            <FormControlLabel disabled={isSubmitting} value="single" control={<Radio />} label="Only this sentence" />
            <FormControlLabel disabled={isSubmitting} value="all" control={<Radio />} label={<span>All of <b>{speaker}</b>&apos;s sentences</span>} />
          </RadioGroup>
        </FormControl>
      </FlexBox>
      <FlexBox justifyContent="flex-end" style={{ marginTop: 20 }}>
        <Button disabled={isSubmitting} onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={isSubmitting}
          onClick={handleSaveEditSpeaker}
          style={{ marginLeft: 10 }}
          color="primary"> {isSubmitting ? <FontAwesomeIcon icon="spinner" spin /> : 'Save' }</Button>
      </FlexBox>
      
    </Paper>
  )

  return (
    <Modal
      open={isOpen}
      onClose={isSubmitting ? null : handleClose}
      aria-labelledby="speaker-name-modal-title"
      aria-describedby="speaker-name-modal-description"
    >
      {body}
    </Modal>
  )
}
