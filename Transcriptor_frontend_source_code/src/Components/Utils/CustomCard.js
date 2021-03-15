import React, { useState } from 'react'
import Skeleton from 'react-loading-skeleton' // (https://github.com/dvtng/react-loading-skeleton#readme)
import { Card, Dropdown } from 'semantic-ui-react'
import ConfirmationModal from './ConfirmationModal'
import { useToasts } from 'react-toast-notifications'
import PropTypes from 'prop-types'
import dataProvider from '../dataProvider'
import { timeFormat } from '../timeFormat'
import '../styles.css'

/* import react-redux hook for dispatching actions */
import { useDispatch } from 'react-redux'

/* import actions */
import {
  setTranscriptionIdForEdit,
  setTranscriptionIdForAssign,
  setTranscriptionIdForReSpeak,
  enableEditMode,
  disableEditMode,
  deleteTranscription,
} from '../../actions/TranscriptionActions'

const moment = require('moment')

const CustomCard = props => {
  const [mode, setMode] = useState('choose')

  const dispatch = useDispatch()
  const { addToast, removeToast } = useToasts()

  const loading = props.data === null

  const styles = CustomCardStyles

  const time = moment(props.createdAt).format('LT')
  const date = moment(props.createdAt).format('LL')

  const isEditorOpen = () => {
    return localStorage.getItem('editorConfig') !== null
  }

  const isReSpeakOpen = () => {
    return localStorage.getItem('reSpeakConfig') !== null
  }

  const options = [
    {
      key: 1,
      text: 'edit',
      value: 1,
      disabled: isEditorOpen() || isReSpeakOpen(),
      selected: false,
    },
    {
      key: 2,
      text: 're-speak',
      value: 2,
      disabled: isEditorOpen() || isReSpeakOpen(),
    },
    {
      key: 3,
      text: 'assign',
      value: 3,
    },
  ]

  const ActionDispatchers = {
    editMode: enable =>
      enable ? dispatch(enableEditMode()) : dispatch(disableEditMode()),
    transcriptionIdForEdit: _id => dispatch(setTranscriptionIdForEdit(_id)),
    transcriptionIdForAssign: _id => dispatch(setTranscriptionIdForAssign(_id)),
    transcriptionIdForReSpeak: _id =>
      dispatch(setTranscriptionIdForReSpeak(_id)),
    delete: _id => dispatch(deleteTranscription(_id)),
  }

  const modeHandler = (e, { options, value }) => {
    const optionText = options.filter(option => option.value === value)[0].text
    setMode(optionText)

    switch (value) {
      case 1: // edit
        ActionDispatchers.transcriptionIdForEdit(props._id)
        break

      case 2: // re-speak
        ActionDispatchers.transcriptionIdForReSpeak(props._id)
        break

      case 3: // assign
        ActionDispatchers.transcriptionIdForAssign(props._id) // [ not implemented yet! ]
        break

      default:
    }
  }

  const createLinkForDownload = (url, type) => {
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${props.filename}_${date}_${time}.${type}`) // or any other extension
    document.body.appendChild(link)
    link.click()
  }

  const downloadTranscriptAndAudio = () => {
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
        id: props._id,
        options: {
          responseType: 'blob',
        },
      })
      .then(res => {
        removeToast(2)
        createLinkForDownload(
          window.URL.createObjectURL(new Blob([res.data])),
          'zip',
        )
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
  }

  const Status = props => {
    const { status, id } = { ...props }
    const styles = CustomCardStyles
    const increment = parseFloat(100 / 8)
    const $statusLoader = document.getElementsByClassName(`${id}`)[0]
    const stages = [
      ['MONOLIZE-RESAMPLE: monolize and resample the input file', 0],
      [
        'DIARIZATION: partitioning an input audio stream into speech segments.',
        1,
      ],
      ['STARTING processing input file', 2],
      ['KALDI-DATA-PREPARATION: convert to kaldi format', 3],
      ['FEATURE-EXTRACTION: extract features in the input file', 4],
      ['DECODING the input file to raw text', 5],
      ['POST-PROCESSING convert raw text to different formats', 6],
    ]

    const stageMap = new Map(stages)

    if (status.toLowerCase() !== 'done') {
      if ($statusLoader) {
        if (stageMap.has(status)) {
          const idx = stageMap.get(status)
          $statusLoader.animate(
            [
              {
                width: `${increment * idx}%`,
              },
              {
                width: `${increment * (idx + 1)}%`,
              },
            ],
            {
              duration: 1500,
              fill: 'forwards',
            },
          )
        }
      }
      return <span className="status-flag">{status}</span>
    } else {
      if ($statusLoader) $statusLoader.style.display = 'none'
      return (
        <React.Fragment>
          <i
            className="fas fa-download"
            onClick={downloadTranscriptAndAudio}
          ></i>
          <Dropdown
            text={mode}
            options={options}
            style={styles.dropdown}
            selectOnBlur={false}
            selectOnNavigation={false}
            onChange={modeHandler}
          />
        </React.Fragment>
      )
    }
  }

  const modalCallback = action => {
    if (action === 'yes') {
      ActionDispatchers.delete(props._id)
    }
  }

  const Mode = () => {
    if (isEditorOpen()) {
      const ID = JSON.parse(localStorage.getItem('editorConfig'))._id

      if (ID === props._id) {
        return <span className="mode-flag">IN EDIT</span>
      }
    } else if (isReSpeakOpen()) {
      const ID = JSON.parse(localStorage.getItem('reSpeakConfig'))._id

      if (ID === props._id) {
        return <span className="mode-flag">IN RE-SPEAK</span>
      }
    }

    // display cross icon
    return (
      <ConfirmationModal
        callback={modalCallback}
        content={'Warning'}
        icon={'warning'}
        body={'Are you sure you want to delete this transcription ?'}
      />
    )
  }

  return (
    <Card style={styles.Card}>
      <Card.Content>
        <Card.Header className="card-header">
          {!loading ? props.filename : <Skeleton width={250} height={18} />}
          {!loading && (
            <span className="duration">({timeFormat(props.duration)})</span>
          )}
          <span>{!loading && <Mode />}</span>
        </Card.Header>
        <Card.Meta className="card-meta">
          {!loading ? date + ', ' + time : <Skeleton width={180} height={15} />}
          {!loading ? (
            <span style={{ display: 'none' }}>dummy skeleton</span>
          ) : (
            <Skeleton width={60} height={15} />
          )}
          <div className="tags-container">
            <div className="tag">{props.language}</div>
            <div className="tag">{props.mimeType}</div>
          </div>

          {!loading && <Status status={props.status} id={props._id} />}
        </Card.Meta>
        <div className={`status-loader ${props._id}`}></div>
      </Card.Content>
    </Card>
  )
}

Card.propTypes = {
  _id: PropTypes.string,
  header: PropTypes.string,
  meta: PropTypes.string,
  language: PropTypes.string,
  mimeType: PropTypes.string,
}

const CustomCardStyles = {
  Card: {
    marginLeft: '1%',
    width: '98%',
    height: 'auto', // (Keep it auto)
    cursor: 'pointer',
    fontFamily: 'Open Sans',
    fontWeight: '300',
    paddingBottom: '50px',
  },
  dropdown: {
    right: '12px',
    bottom: '10px',
    position: 'absolute',
    borderRadius: '0.3rem',
    minWidth: '80px',
    width: 'auto',
    border: '1px solid black',
    backgroundColor: '#f5f5f5',
    fontSize: '13px',
    color: 'black',
    textAlign: 'center',
    paddingLeft: '3px',
    paddingRight: '3px',
  },
  status: {
    right: '12px',
    bottom: '10px',
    position: 'absolute',
    borderRadius: '0.3rem',
    minWidth: '80px',
    width: 'auto',
    border: '1px solid black',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    fontSize: '13px',
    color: 'black',
    textAlign: 'center',
    paddingLeft: '3px',
    paddingRight: '3px',
  },
}

export default CustomCard
