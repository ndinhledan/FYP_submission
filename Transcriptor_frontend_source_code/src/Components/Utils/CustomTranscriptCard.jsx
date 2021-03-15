import React, { useCallback, useState } from 'react'
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton' // (https://github.com/dvtng/react-loading-skeleton#readme)
// import { Card, Dropdown } from 'semantic-ui-react';
// import ConfirmationModal from './ConfirmationModal';
import { useToasts } from 'react-toast-notifications'
import dataProvider from '../dataProvider'
import { timeFormat } from '../timeFormat'
import '../styles.css'

import { values } from 'lodash'

import Card from '@material-ui/core/Card'
import CardHeader from '@material-ui/core/CardHeader'
import CardActions from '@material-ui/core/CardActions'
import IconButton from '@material-ui/core/IconButton'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import Chip from '@material-ui/core/Chip'

import Dropzone from 'react-dropzone'
import { Button } from 'semantic-ui-react'

/* import react-redux hook for dispatching actions */
import { useDispatch, useSelector } from 'react-redux'

/* import actions */
import {
  setTranscriptionIdForEdit,
  setTranscriptionIdForAssign,
  setTranscriptionIdForReSpeak,
  deleteTranscription,
  removeFromAssignedTranscriptions,
  setTranscriptionCorrect,
} from '../../actions/TranscriptionActions'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Checkbox } from '@material-ui/core'

const moment = require('moment')

export const CustomTranscriptCard = ({
  _id,
  filename,
  createdAt,
  language,
  mimeType,
  status,
  isLoading,
  duration,
  subPage,
  assignedRole,
  assignmentComplete,
  transcriptionCorrect,
}) => {
  // const isLoading = true

  const dispatch = useDispatch()
  const assignedTranscriptionList = useSelector(
    state => state.TRANSCRIPTION.assignedTranscriptionList,
  )

  const { addToast, removeToast } = useToasts()

  const [transcript, setTranscript] = useState(null)

  const isEditorOpen = () => {
    return localStorage.getItem('editorConfig') !== null
  }

  const isReSpeakOpen = () => {
    return localStorage.getItem('reSpeakConfig') !== null
  }

  const [anchorEl, setAnchorEl] = useState(null)

  const handleOpenMenu = useCallback(e => {
    setAnchorEl(e.currentTarget)
  }, [])

  const handleClose = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const options = {
    edit: {
      value: 'edit',
      label: 'Edit this transcription',
      disabled: isEditorOpen() || isReSpeakOpen(),
    },
    reSpeak: {
      value: 're-speak',
      label: 'Re speak this transcription',
      disabled: isEditorOpen() || isReSpeakOpen(),
    },
    assign: {
      value: 'assign',
      label: 'Assign this transcription',
    },
  }

  // const options = [
  //   {
  //     value: 'edit',
  //     label: 'Edit this transcription',
  //     disabled: isEditorOpen() || isReSpeakOpen(),
  //   },
  //   {
  //     value: 're-speak',
  //     label: 'Re speak this transcription',
  //     disabled: isEditorOpen() || isReSpeakOpen(),
  //   },
  //   {
  //     value: 'assign',
  //     label: 'Assign this transcription',
  //   },
  // ]

  const ActionDispatchers = {
    transcriptionIdForEdit: _id => dispatch(setTranscriptionIdForEdit(_id)),
    transcriptionIdForAssign: _id => dispatch(setTranscriptionIdForAssign(_id)),
    transcriptionIdForReSpeak: _id =>
      dispatch(setTranscriptionIdForReSpeak(_id)),
    delete: _id => dispatch(deleteTranscription(_id)),
    removeAssignedTranscription: (_id, assignedTranscriptionList) =>
      dispatch(
        removeFromAssignedTranscriptions(_id, assignedTranscriptionList),
      ),
    setCorrect: (_id, correct, assignedTranscriptionList) =>
      dispatch(
        setTranscriptionCorrect(_id, correct, assignedTranscriptionList),
      ),
  }

  const createLinkForDownload = useCallback(
    (url, type) => {
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `${filename}_${moment(createdAt).format('LL_LT')}.${type}`,
      ) // or any other extension
      document.body.appendChild(link)
      link.click()
    },
    [createdAt, filename],
  )

  const downloadTranscriptAndAudio = useCallback(() => {
    /*
                Downloading transcripts and audio into  a zip
            */
    addToast('Preparing files for export, please wait...', {
      autoDismiss: false,
      appearance: 'success',
      id: 2, // random ID
    })

    dataProvider.speech
      .post('export', {
        id: _id,
        options: {
          responseType: 'blob',
        },
      })
      .then(res => {
        removeToast(2)
        createLinkForDownload(window.URL.createObjectURL(new Blob([res.data])), 'zip')
      })
      .catch(err => {
        if (err.response && 'message' in err.response.data) {
          addToast(err.response.data.message, {
            autoDismiss: true,
            appearance: 'error',
            autoDismissTimeout: 3000,
          })
        } else {
          addToast('Network error, please try again!', {
            autoDismiss: true,
            appearance: 'error',
            autoDismissTimeout: 3000,
          })
        }
      })
  }, [addToast, removeToast, _id, createLinkForDownload])

  const handleMenuClick = useCallback(
    value => {
      switch (value) {
        case 'edit': // edit
          ActionDispatchers.transcriptionIdForEdit(_id)
          break

        case 're-speak': // re-speak
          ActionDispatchers.transcriptionIdForReSpeak(_id)
          break

        case 'assign': // assign
          ActionDispatchers.transcriptionIdForAssign(_id) // [ not implemented yet! ]
          break
        case 'delete':
          return ActionDispatchers.delete(_id)
        case 'download':
          return downloadTranscriptAndAudio()
        default:
      }
    },
    [_id, ActionDispatchers, downloadTranscriptAndAudio],
  )

  const isInMode = () => {
    if (isEditorOpen()) {
      const ID = JSON.parse(localStorage.getItem('editorConfig'))._id

      if (ID === _id) {
        return (
          <Chip
            style={{ marginRight: 5 }}
            color="secondary"
            label="IN EDIT"
            size="small"
          />
        )
      }
    } else if (isReSpeakOpen()) {
      const ID = JSON.parse(localStorage.getItem('reSpeakConfig'))._id

      if (ID === _id) {
        return (
          <Chip
            style={{ marginRight: 5 }}
            color="secondary"
            label="IN RE-SPEAK"
            size="small"
          />
        )
      }
    }

    return null
  }

  const handleComplete = async val => {
    try {
      await dataProvider.speech.completeAssignment('complete', {
        id: _id,
        options: {
          data: {
            complete: val,
          },
        },
      })

      addToast(`Assignment marked as ${val ? 'complete' : 'incomplete'}`, {
        autoDismiss: true,
        appearance: 'success',
        autoDismissTimeout: 3000,
        id: 3, // random ID
      })

      ActionDispatchers.removeAssignedTranscription(
        _id,
        assignedTranscriptionList,
      )
    } catch (err) {
      console.log(err)
      addToast(`Failed to mark as ${val ? 'complete' : 'incomplete'}`, {
        autoDismiss: true,
        appearance: 'error',
        autoDismissTimeout: 3000,
        id: 3, // random ID
      })
    }
  }

  const handleCorrect = async val => {
    try {
      ActionDispatchers.setCorrect(_id, val, assignedTranscriptionList)

      // addToast(`Assignment marked as ${val ? 'complete' : 'incomplete'}`, {
      //   autoDismiss: true,
      //   appearance: 'success',
      //   autoDismissTimeout: 3000,
      //   id: 3, // random ID
      // })
    } catch (err) {
      console.log(err)
      addToast(`Failed to mark as ${val ? 'correct' : 'incorrect'}`, {
        autoDismiss: true,
        appearance: 'error',
        autoDismissTimeout: 3000,
        id: 3, // random ID
      })
    }
  }

  const handleConfirmUpload = async () => {
    addToast('Preparing file for re-upload, please wait...', {
      autoDismiss: false,
      appearance: 'success',
      id: 3, // random ID
    })
    try {
      const formdata = new FormData()
      formdata.append('transcript', transcript, transcript.name)
      await dataProvider.speech.reuploadTranscript('reupload', {
        id: _id,
        options: {
          data: formdata,
        },
      })
      setTranscript(null)
      removeToast(3)
      addToast('File uploaded successfully', {
        autoDismiss: true,
        appearance: 'success',
        autoDismissTimeout: 3000,
        id: 3, // random ID
      })
    } catch (err) {
      addToast('Failed to upload file', {
        autoDismiss: true,
        appearance: 'error',
        autoDismissTimeout: 3000,
        id: 3, // random ID
      })
    }
  }

  const handleCancelUpload = () => {
    setTranscript(null)
  }

  const UploadButton = () => {
    return (
      <Dropzone
        onDrop={acceptedFiles => setTranscript(acceptedFiles[0])}
        multiple={false}
        accept={['.TextGrid']}
        noDrag
        noKeyboard
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()}>
            <input {...getInputProps()} disabled={assignmentComplete} />
            <IconButton disabled={assignmentComplete}>
              <FontAwesomeIcon icon="download" rotation={180} size="xs" />
            </IconButton>
          </div>
        )}
      </Dropzone>
    )
  }

  return (
    <Card style={{ width: '100%' }}>
      {isLoading ? (
        <div style={{ height: 120, width: '100%', padding: '5px 20px' }}>
          <SkeletonTheme
            color="rgba(0, 0, 0, 0.3)"
            highlightColor="rgba(0, 0, 0, 0.7)"
          >
            <div style={{ marginBottom: 10 }}>
              <Skeleton width="50%" height={30} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <Skeleton width="30%" height={20} />
            </div>
            <div>
              <Skeleton width="10%" height={20} />
            </div>
          </SkeletonTheme>
        </div>
      ) : (
        <>
          <CardHeader
            action={
              status.toLowerCase() !== 'done' ? null : (
                <>
                  <IconButton aria-label="choose" onClick={handleOpenMenu}>
                    <FontAwesomeIcon icon="ellipsis-v" size="xs" />
                  </IconButton>
                  <Menu
                    id="card-menu"
                    anchorEl={anchorEl}
                    keepMounted
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                  >
                    {values(options).map(({ value, disabled, label }) => (
                      <MenuItem
                        key={value}
                        disabled={disabled}
                        onClick={() => handleMenuClick(value)}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )
            }
            title={`${filename}`}
            subheader={`${moment(createdAt).format('LL LT')} (${timeFormat(
              duration,
            )})`}
          />
          {transcript && (
            <div
              style={{
                display: 'flex',
                marginLeft: 15,
                fontSize: 'large',
                alignItems: 'center',
              }}
            >
              <p
                style={{
                  marginBottom: 'auto',
                  marginTop: 'auto',
                  marginRight: 10,
                }}
              >
                Upload: <strong>{transcript.name}</strong>
              </p>
              <Button
                inverted
                color="green"
                icon="check"
                size="mini"
                onClick={handleConfirmUpload}
              />
              <div style={{ marginRight: 5 }} />
              <Button
                inverted
                color="red"
                icon="times"
                size="mini"
                onClick={handleCancelUpload}
              />
            </div>
          )}
          <CardActions>
            {subPage.toLowerCase() === 'assigned' && (
              <Chip
                color="secondary"
                style={{ textTransform: 'capitalize' }}
                label={assignedRole}
              />
            )}
            <Chip label={language} />
            <Chip label={mimeType} />
            <span style={{ flex: 1 }} />
            {status.toLowerCase() !== 'done' ? (
              <Chip
                color="primary"
                style={{ textTransform: 'capitalize' }}
                label={status}
              />
            ) : (
              <>
                {isInMode()}
                {subPage.toLowerCase() === 'assigned' &&
                  (assignedRole === 'verifier' || assignedRole === 'admin') && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                      Transcription Correct:{' '}
                    <Checkbox
                      onChange={(e, d) => handleCorrect(d)}
                      disabled={assignmentComplete}
                      checked={transcriptionCorrect}
                    />
                  </div>
                )}
                <IconButton disabled={options.edit.disabled}
                  onClick={() => handleMenuClick(options.edit.value)}>
                  <FontAwesomeIcon icon="edit" size="xs" />
                </IconButton>
                {subPage.toLowerCase() === 'assigned' &&
                  (assignedRole === 'transcriber' ||
                    assignedRole === 'admin') &&
                  UploadButton()}
                {subPage.toLowerCase() === 'created' && (
                  <IconButton onClick={() => handleMenuClick('delete')}>
                    <FontAwesomeIcon icon="trash" size="xs" />
                  </IconButton>
                )}
                <IconButton onClick={downloadTranscriptAndAudio}>
                  <FontAwesomeIcon icon="download" size="xs" />
                </IconButton>
                {subPage.toLowerCase() === 'assigned' && (
                  <React.Fragment>
                    {assignmentComplete ? (
                      <Button
                        negative
                        content="Mark As Incomplete"
                        onClick={() => handleComplete(false)}
                      />
                    ) : (
                      <Button
                        positive
                        content="Mark As Complete"
                        onClick={() => handleComplete(true)}
                      />
                    )}
                  </React.Fragment>
                )}
              </>
            )}
          </CardActions>
        </>
      )}
    </Card>
  )
}
