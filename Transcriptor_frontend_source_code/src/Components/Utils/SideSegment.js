/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react'
import { Segment, Button } from 'semantic-ui-react'
import { ReactSortable } from 'react-sortablejs'
import SortableCard from './SortableCard'
import { useToasts } from 'react-toast-notifications'
import localforage from 'localforage'
import { timeFormat } from '../timeFormat'
import '../styles.css'

const SideSegement = props => {
  const { sentenceInfo, activeSentence, sentenceFiles, sentenceStatus } = props
  const [files, setFiles] = useState(sentenceFiles)
  const [status, setStatus] = useState(sentenceStatus)
  const [audioObj, setAudioObj] = useState(null)

  const { addToast } = useToasts()

  let AUDIO_TIMER = null

  useEffect(() => {
    setFiles(sentenceFiles)
    setStatus(sentenceStatus)
  }, [sentenceFiles, sentenceStatus])

  useEffect(() => {
    // update in the indexedDB storage
    localforage.getItem('allFiles', (err, res) => {
      if (res) {
        const allFiles = res

        allFiles[activeSentence] = {
          status: files.length > 0 ? status : null,
          files,
        }

        localforage.setItem('allFiles', allFiles)
      }
    })

    if (status && files.length === 0) {
      props.callbacks.nullifySentence(activeSentence)

      localStorage.removeItem('global_recording_flag')
      localStorage.removeItem('global_play_audio_flag')
    }
  }, [files, status])

  const notify = (message, type) => {
    /*
            type: error | warning | success
        */
    addToast(message, {
      autoDismiss: true,
      appearance: type,
      autoDismissTimeout: 3000,
    })
  }

  const addRecordSegment = () => {
    const newFile = {
      id: files.length,
      name: `${sentenceInfo.sentenceId}_${files.length + 1}.mp3`,
      displayName: `segment_${files.length + 1}.mp3`,
      blob: null,
      duration: null,
    }

    setFiles(files => [...files, newFile])
    setStatus('in-edit')
    props.callbacks.addSentenceToEdit(activeSentence)
  }

  const deleteSegment = id => {
    const currId = localStorage.getItem('currently_playing')

    if (currId === id.toString()) {
      /*
                Trying to delete the currently playing segment
                will not allow to delete until playback stops
            */
      notify('Cannot delete currently playing segment.', 'error')
    } else {
      /* delete  */
      setFiles(files => files.filter(file => file.id !== id))

      /* Rename the ids */
      setFiles(files =>
        files.map(file => {
          if (file.id > id - 1) {
            /* id is 0 indexed */
            file.id -= 1
            const s_id = file.name.split('_')[0]
            file.name = s_id + '_' + (file.id + 1) + '.mp3'
          }
          return file
        }),
      )

      if (files.length > 1) {
        setStatus('in-edit')
        props.callbacks.addSentenceToEdit(activeSentence)
      }
    }
  }

  const saveSegment = (id, blob) => {
    setFiles(files =>
      files.map(file => {
        if (file.id === id) {
          file.blob = blob
          const audio = new Audio(URL.createObjectURL(blob))
          audio.onloadedmetadata = () => {
            file.duration = audio.duration
          }
        }
        return file
      }),
    )
  }

  const getAudioIcon = elem => {
    if (Array.from(elem.classList).includes('sortable-listen-icon')) {
      /*
                As the play event listener is `sortable-listen-icon` div (SortableCard.js)
                which is parent to the icon `fa-play` / `fa-stop`
            */
      elem = elem.childNodes[0]
    }

    return elem
  }

  const playSegment = (id, elem) => {
    const file = files.filter(file => file.id === id)[0]
    if (file.blob) {
      localStorage.setItem('global_play_audio_flag', 'true')
      localStorage.setItem('currently_playing', id)

      const audio = new Audio(URL.createObjectURL(file.blob))

      /*
                Saving currently playinh audio obj
                needed when user presses stop audio.
            */
      setAudioObj(audio)

      audio.onloadedmetadata = () => {
        const duration = audio.duration * 1000

        elem = getAudioIcon(elem)

        elem.classList.remove('fa-play')
        elem.classList.add('fa-stop')

        AUDIO_TIMER = setTimeout(() => {
          elem.classList.remove('fa-stop')
          elem.classList.add('fa-play')

          localStorage.removeItem('global_play_audio_flag')
          localStorage.removeItem('currently_playing')
        }, duration)
      }
      audio.play()
    } else {
      notify("Segment isin't recorded yet!", 'error')
    }
  }

  const stopSegment = (id, elem) => {
    elem = getAudioIcon(elem)

    clearTimeout(AUDIO_TIMER)

    /*
            A way to stop audio play
        */
    audioObj.pause()
    audioObj.currentTime = 0

    setAudioObj(null)

    elem.classList.remove('fa-stop')
    elem.classList.add('fa-play')

    localStorage.removeItem('global_play_audio_flag')
    localStorage.removeItem('currently_playing')
  }

  const changeDisplayName = (id, newName) => {
    setFiles(files =>
      files.map(file => {
        if (file.id === id) {
          file.displayName = newName
        }
        return file
      }),
    )
  }

  const callbacks = {
    deleteSegment,
    saveSegment,
    playSegment,
    stopSegment,
    changeDisplayName,
  }

  const handleSave = () => {
    if (files.length > 0) {
      setStatus('saved')
      props.callbacks.sentenceSaved(activeSentence)
    } else {
      notify('No files recorded for this sentence!', 'error')
    }
  }

  const ReSpeakStatus = () => {
    let status = null
    let className = ''
    switch (sentenceInfo.reSpeak.status) {
      case 1:
        status = 'Re-speak in progress for this sentence'
        className = 'respeak-in-progress'
        break
      case 2:
        status = 'Re-speak already done for this sentence'
        className = 'respeak-done'
        break
      case 3:
        status = 'Re-speak failed for this sentence'
        className = 'respeak-failed'
        break
      default:
        break
    }

    return <span className={`respeak-status ${className}`}>{status}</span>
  }

  return (
    <Segment className="respeak-container">
      <div className="sentence-container-respeak">
        <h1 className="sentence-title">
          Sentence :
          <span className="sentence-times">
            {`(${timeFormat(sentenceInfo.begin.slice(0, 5))}
                          - ${timeFormat(sentenceInfo.end.slice(0, 5))})`}
          </span>
          <ReSpeakStatus />
        </h1>
        <div className="sentence-respeak">{sentenceInfo.lines}</div>
      </div>
      <div className="recorder-container-respeak">
        {files && (
          <ReactSortable
            list={files}
            setList={setFiles}
            animation={200}
            delayOnTouchStart={true}
            delay={2}
            className="sortable-container"
          >
            {files.map((item, key) => (
              <SortableCard key={key} data={item} callbacks={callbacks} />
            ))}
          </ReactSortable>
        )}
      </div>
      <div className="footer-respeak">
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={addRecordSegment}>
          <i className="fas fa-plus"></i>
        </Button>
      </div>
    </Segment>
  )
}

export default SideSegement
