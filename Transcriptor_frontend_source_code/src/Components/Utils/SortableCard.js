/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react'
import MicRecorder from 'mic-recorder-to-mp3'
import { useToasts } from 'react-toast-notifications'
import { timeFormat } from '../timeFormat'
import $ from 'jquery'

// Also check : https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b

const recorder = new MicRecorder({ bitRate: 128 })

const SortableCard = ({ data: item, callbacks }) => {
  const [recording, setRecording] = useState(false)
  const { addToast } = useToasts()

  useEffect(() => {
    $(`#${item.id}`).blur(function() {
      callbacks.changeDisplayName(item.id, this.innerText)
    })

    return () => {
      $(`#${item.id}`).unbind()

      localStorage.removeItem('global_play_audio_flag')
      localStorage.removeItem('global_recording_flag')

      recorder.stop()
    }
  }, [])

  const setGlobalFlag = type => {
    /*
            type : recording | play_audio

            Acts as mutex lock for recording and listening
            only one segement at the same time.
        */
    localStorage.setItem(`global_${type}_flag`, 'true')
  }

  const unSetGlobalFlag = type => {
    /*
            type : recording | play_audio
        */
    localStorage.removeItem(`global_${type}_flag`)
  }

  const getGlobalFlagStatus = type => {
    if (localStorage.getItem(`global_${type}_flag`)) return true

    return false
  }

  const notify = (message, type, duration = 3000) => {
    /*
            type: error | warning | success
        */
    addToast(message, {
      autoDismiss: true,
      appearance: type,
      autoDismissTimeout: duration,
    })
  }

  const startRecording = () => {
    recorder
      .start()
      .then(() => {
        setRecording(true)
        setGlobalFlag('recording')
      })
      .catch(e => console.error(e))
  }

  const stopRecording = () => {
    recorder
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        setRecording(false)
        unSetGlobalFlag('recording')
        callbacks.saveSegment(item.id, blob)

        notify(
          'Segment recorded successfully, press the play button to listen!',
          'success',
          5000,
        )
      })
      .catch(e => console.error(e))
  }

  const handleDelete = () => {
    if (recording) {
      stopRecording()
    }
    callbacks.deleteSegment(item.id)
  }

  const toggleAudio = e => {
    if (!getGlobalFlagStatus('recording')) {
      const currPlayingId = localStorage.getItem('currently_playing')
      if (currPlayingId) {
        if (currPlayingId.toString() === item.id.toString()) {
          // stop audio play
          callbacks.stopSegment(item.id, e.target)
        } else {
          notify('Cannot play two segments at the same time!', 'error')
        }
      } else {
        // no audio playing, play current segment
        callbacks.playSegment(item.id, e.target)
      }
    } else {
      notify('Cannot play and record at the same time!', 'error')
    }
  }

  const handleRecording = () => {
    /*
            Recording === true meaning currently segment
            is being recorded
        */
    if (!recording) {
      if (
        !getGlobalFlagStatus('recording') &&
        !getGlobalFlagStatus('play_audio')
      ) {
        startRecording()
      } else {
        if (getGlobalFlagStatus('recording')) {
          notify('Cannot record two segments at the same time!', 'error')
        } else if (getGlobalFlagStatus('play_audio')) {
          notify('Cannot record when segment is playing!', 'error')
        }
      }
    } else {
      stopRecording()
    }
  }

  return (
    <div className="sortable-list" key={item.id}>
      {item.duration && (
        <span id={`time-label-${item.id}`} className="time-label">
          {timeFormat(item.duration)}
        </span>
      )}
      <div className="sortable-filename">
        <span
          contentEditable="true"
          id={item.id}
          className="sortable-display-name"
        >
          {item.displayName}
        </span>
      </div>
      <div
        className="sortable-listen-icon"
        onClick={toggleAudio}
        title="play segment"
      >
        <i className="fa fa-play"></i>
      </div>
      <div
        className="sortable-record-icon"
        onClick={handleRecording}
        title="record segment"
      >
        <i className={`fas fa-microphone ${recording ? 'recording' : ''}`}></i>
      </div>
      <div
        className="sortable-delete-icon"
        onClick={handleDelete}
        title="delete segment"
      >
        <i className="fas fa-times"></i>
      </div>
    </div>
  )
}

export default SortableCard
