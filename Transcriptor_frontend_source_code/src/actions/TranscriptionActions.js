import dataProvider from '../Components/dataProvider'
import { processSentences, transformOneSentence, processOneSentence } from './utils'
import { debounce, reduce, omit, get, map } from 'lodash'

import LRU from '../Components/LRU'
import { getChannelAudioBuffersFromAnAudioBuffer } from '../Components/Utils/utils'

const audioContext = new (window.AudioContext || window.webkitAudioContext)()

export const updateTranscriptStatus = payload => dispatch => {
  dispatch({
    type: 'UPDATE_TRANSCRIPT_STATUS',
    payload,
  })
}

export const changeTranscriptListPage = (page, limit) => dispatch => {
  dispatch({
    type: 'CHANGE_TRANSCRIPT_LIST_PAGE',
    payload: page,
  })

  dispatch(getTranscriptionList(page, limit))
}

export const changeTranscriptListLimit = (page, limit) => dispatch => {
  dispatch({
    type: 'CHANGE_TRANSCRIPT_LIST_LIMIT',
    payload: limit,
  })

  dispatch(getTranscriptionList(page, limit))
}

export const getTranscriptionList = (page, limit) => async dispatch => {
  dispatch({ type: 'TRANSCRIPTION_LIST_LOADING', payload: true })

  try {
    const res = await dataProvider.speech.getList('transcriptions', {
      params: { page, limit },
    })

    const _list = res.data.speeches
    const totalCount = res.data.total

    const list = reduce(
      _list,
      (acc, t) => {
        acc[t._id] = t

        return acc
      },
      {},
    )

    dispatch({
      type: 'SET_TRANSCRIPTION_LIST',
      payload: {
        list,
        totalCount,
      },
    })
  } catch (err) {
    if (err.response && 'message' in err.response.data) {
      handleError(err.response.data.message + ' Try, refreshing your page!')
    } else {
      handleError(
        'Error occured fetching transcriptions, please refresh your page and try again!',
      )
    }
  } finally {
    dispatch({ type: 'TRANSCRIPTION_LIST_LOADING', payload: false })
  }
}

export const getAssignedTranscriptionList = (
  page,
  limit,
  assignmentComplete,
  assignedRole = '',
) => async dispatch => {
  dispatch({ type: 'TRANSCRIPTION_LIST_LOADING', payload: true })

  const params = { page, limit, assignmentComplete }
  if (assignedRole) params.assignedRole = assignedRole

  try {
    const res = await dataProvider.speech.getAssignedList('transcriptions', {
      params: params,
    })

    const _list = res.data.speeches
    console.log('ASSIGN ACTION', _list)
    const totalAssignedCount = res.data.total

    const assignedList = reduce(
      _list,
      (acc, t) => {
        acc[t._id] = t

        return acc
      },
      {},
    )

    // console.log('ASSIGN ACTION', assignedList)

    dispatch({
      type: 'SET_ASSIGNED_TRANSCRIPTION_LIST',
      payload: {
        assignedList,
        totalAssignedCount,
      },
    })
  } catch (err) {
    if (err.response && 'message' in err.response.data) {
      handleError(err.response.data.message + ' Try, refreshing your page!')
    } else {
      handleError(
        'Error occured fetching transcriptions, please refresh your page and try again!',
      )
    }
  } finally {
    dispatch({ type: 'TRANSCRIPTION_LIST_LOADING', payload: false })
  }
}

export const removeFromAssignedTranscriptions = (speechId, assignedTranscriptionList) => dispatch => {
  assignedTranscriptionList = omit(assignedTranscriptionList, [speechId])
  dispatch({
    type: 'SET_ASSIGNED_TRANSCRIPTION_LIST',
    payload: {
      assignedList: assignedTranscriptionList,
    },
  })
}

export const setTranscriptionCorrect = (speechId, correct, assignedTranscriptionList) => async dispatch => {
  try {
    await dataProvider.speech.correctTranscription('correct', {
      id: speechId,
      options: {
        data: {
          correct: correct,
        },
      },
    })

    assignedTranscriptionList[speechId].transcriptionCorrect = correct
    
    dispatch({
      type: 'SET_ASSIGNED_TRANSCRIPTION_LIST',
      payload: {
        assignedList: assignedTranscriptionList,
      },
    })
  } catch (err) {
    if (err.response && 'message' in err.response.data) {
      handleError(err.response.data.message + ' Try, refreshing your page!')
    } else {
      handleError(
        'Error setting the transcription as correct, please refresh your page and try again!',
      )
    }
  }
}

export const setTranscriptionIdForEdit = _id => {
  return {
    type: 'SET_TRANSCRIPTION_ID_FOR_EDIT',
    payload: _id,
  }
}

export const cleanUpEditor = () => dispatch => {
  dispatch({
    type: 'SET_TRANSCRIPTION_ID',
    payload: null,
  })
}

export const setFileData = file => {
  return {
    type: 'SET_FILE_DATA',
    payload: file,
  }
}

const savePromise = async (data, id, type) => {
  const _sentences = transformOneSentence(data)
  try {
    const dataFunction = dataProvider.speech.transcripts[type]
    if (dataFunction) {
      const response = await dataFunction('', {
        id,
        options: {
          data: {
            ..._sentences,
          },
        },
      })
      return response
    }
  } catch (er) {
    console.log(er)
    // dispatch(handleError(error.response.data.message))
  }
}

export const updateSpeakerName = (oldValue, newValue, type, sentence) => async (dispatch, getState) => {
  const { TRANSCRIPTION: { transcripts, transcriptionId } } = getState()
  if (type === 'single') {
    await updateSentence(dispatch, transcriptionId, 'update', { ...sentence, speaker: newValue }, transcripts)
  } else {
    const newTranscript = await Promise.all(map(transcripts, async t => {
      if (t.speaker === oldValue) {
        const newSentence = { ...t, speaker: newValue }
        await savePromise(newSentence, transcriptionId, 'update')

        return newSentence
      }

      return t
    }))

    dispatch({
      type: 'SET_TRANSCRIPT',
      payload: newTranscript,
    })
  }
}

const updateSentence = async (dispatch, id, type, sentence, data) => {
  dispatch({
    type: 'SET_SAVING_TRANSCRIPT',
    payload: true,
  })

  const res = await savePromise(sentence, id, type)

  if ((type === 'create' || type === 'update') && res) {
    const index = data.findIndex(({ sentenceId }) => sentenceId === sentence.sentenceId)

    const newTranscript = [
      ...data.slice(0, index),
      {
        ...processOneSentence(res.data),
        id: index + 1 + '',
      },
      ...data.slice(index + 1),
    ]

    dispatch({
      type: 'SET_TRANSCRIPT',
      payload: newTranscript,
    })
  }

  dispatch({
    type: 'SET_SAVING_TRANSCRIPT',
    payload: false,
  })

  return res
}

const updateTranscriptDebounce = debounce(updateSentence, 500)

export const updateTranscripts = (data, id, type, sentence) => async dispatch => {
  if (type !== 'create') { // dont update just yet
    dispatch({
      type: 'SET_TRANSCRIPT',
      payload: data,
    })
  }

  if (type === 'update') {
    updateTranscriptDebounce(dispatch, id, type, sentence, data)
  } else {
    await updateSentence(dispatch, id, type, sentence, data)
  }
}

export const setTranscriptionIdForAssign = _id => {
  return {
    type: 'SET_TRANSCRIPTION_ID_FOR_ASSIGN',
    payload: _id,
  }
}

export const setTranscriptionIdForReSpeak = _id => {
  return {
    type: 'SET_TRANSCRIPTION_ID_FOR_RESPEAK',
    payload: _id,
  }
}

export const addSectionForReSpeak = sentenceId => {
  return {
    type: 'ADD_SECTION_FOR_RESPEAK',
    payload: sentenceId,
  }
}

export const saveEventEmitter = ee => {
  return {
    type: 'SAVE_EVENT_EMITTER',
    payload: ee,
  }
}

export const toggleSaveMode = flag => {
  return {
    type: 'TOGGLE_SAVE_MODE',
    payload: flag,
  }
}

export const enableEditMode = () => {
  return {
    type: 'ENABLE_EDIT_MODE',
  }
}

export const disableEditMode = () => (dispatch, getState) => {
  const { TRANSCRIPTION: { audioPlayer } } = getState()

  audioPlayer.pause()

  dispatch({
    type: 'DISABLE_EDIT_MODE',
  })
}

export const enableReSpeakMode = () => {
  return {
    type: 'ENABLE_RESPEAK_MODE',
  }
}

export const disableReSpeakMode = () => {
  return {
    type: 'DISABLE_RESPEAK_MODE',
  }
}

export const deleteTranscription = transcriptionId => {
  return {
    type: 'DELETE_TRANSCRIPTION',
    payload: transcriptionId,
  }
}

export const setTranscriptionId = transcriptionId => {
  return {
    type: 'SET_TRANSCRIPTION_ID',
    payload: transcriptionId,
  }
}

export const deleteSentence = sentenceId => {
  return {
    type: 'DELETE_SENTENCE',
    payload: sentenceId,
  }
}

export const setSentenceId = sentenceId => {
  return {
    type: 'SET_SENTENCE_ID',
    payload: sentenceId,
  }
}

export const releaseToast = toastProps => {
  return {
    type: 'ADD_TOAST',
    payload: toastProps,
  }
}

export const changeChannel = channel => {
  return {
    type: 'CHANGE_CHANNEL',
    payload: channel,
  }
}

export const handleError = error => {
  return {
    type: 'SET_ERROR',
    payload: error,
  }
}

export const removeError = () => {
  return {
    type: 'SET_ERROR',
    payload: null,
  }
}

export const handleSuccessMessage = msg => {
  return {
    type: 'SET_SUCCESS',
    payload: msg,
  }
}

export const removeSuccessMessage = msg => {
  return {
    type: 'SET_SUCCESS',
    payload: null,
  }
}

export const getTranscriptionId = propsId => dispatch => {
  let _id = null

  if (localStorage.getItem('editorConfig') !== null) {
    const config = JSON.parse(localStorage.getItem('editorConfig'))

    _id = config._id
  } else {
    _id = propsId
  }

  dispatch({
    type: 'SET_TRANSCRIPTION_ID',
    payload: _id,
  })

  return _id
}

export const getLocalStorageEditId = () => {
  if (localStorage.getItem('editorConfig') !== null) {
    const config = JSON.parse(localStorage.getItem('editorConfig'))

    return config._id
  }

  return null
}

export const setTranscript = data => {
  return {
    type: 'SET_TRANSCRIPT',
    payload: data,
  }
}

export const getTranscriptionData = transcriptionId => async dispatch => {
  dispatch({
    type: 'SET_LOADING',
    payload: true,
  })

  try {
    const res = await dataProvider.speech.get('', {
      id: transcriptionId,
    })

    const { uploadedFile, sentences, duration } = res.data
    const { notes, channelSet } = processSentences(sentences)

    dispatch({
      type: 'SET_FILE_DATA',
      payload: {
        ...uploadedFile,
        duration,
      },
    })

    dispatch(setTranscript(notes))

    dispatch({
      type: 'SET_CHANNELS',
      payload: channelSet,
    })

    dispatch({
      type: 'SET_LOADING',
      payload: false,
    })
  } catch (error) {
    console.log(error)
    // dispatch(handleError(error.response.data.message))
  }
}

const getAudioSource = async (_id, fileInfo, dispatch) => {
  try {
    const audioCache = new LRU(3) // cache size

    await audioCache.init()
    const key = `blob-${_id}`

    if (audioCache.has(key)) {
      console.log('USING CACHED FILE')
      const start = new Date().getTime()
      const blob = await audioCache.get(key)

      const end = new Date().getTime()

      console.log('CACHE GET ', end - start)

      return blob
    } else {
      console.log('FILE NOT CACHED')
      dispatch({
        type: 'SET_DOWNLOADING_AUDIO',
        payload: true,
      })

      const start = new Date().getTime()

      const res = await dataProvider.getDirect(`${fileInfo.cloudLink}`, {
        options: {
          responseType: 'blob',
          onDownloadProgress: function (progressEvent) {
            const percentage = ((progressEvent.loaded / progressEvent.total) * 100)

            dispatch({
              type: 'SET_DOWNLOAD_AUDIO_PROGRESS',
              payload: percentage,
            })
          },
        },
      })

      const fetchedBlob = new Blob([res.data], { type: fileInfo.mimetype || 'audio/mp3' })

      const end = new Date().getTime()

      console.log('DOWNLOADING ', end - start)

      const cStart = new Date().getTime()

      await audioCache.put(key, fetchedBlob)

      const cEnd = new Date().getTime()

      console.log('CACHE PUT ', cEnd - cStart)

      return fetchedBlob
    }
  } catch (e) {
    return Promise.reject(e)
  } finally {
    dispatch({
      type: 'SET_DOWNLOADING_AUDIO',
      payload: false,
    })

    dispatch({
      type: 'SET_DOWNLOAD_AUDIO_PROGRESS',
      payload: 0,
    })
  }
}

export const loadAudioSource = (_id) => async dispatch => {
  const id = _id || getLocalStorageEditId()

  dispatch({
    type: 'SET_TRANSCRIPTION_ID',
    payload: id,
  })

  dispatch({
    type: 'SET_LOADING',
    payload: true,
  })

  dispatch({
    type: 'SET_DECODING_BUFFER',
    payload: true,
  })

  try {
    const res = await dataProvider.speech.get('', {
      id,
    })

    const { uploadedFile, sentences, duration } = res.data
    const { notes, channelSet } = processSentences(sentences)

    const fileInfo = {
      ...uploadedFile,
      duration,
    }

    dispatch({
      type: 'SET_FILE_DATA',
      payload: {
        ...uploadedFile,
        duration,
      },
    })

    const defaultSentenceId = get(notes, '0.sentenceId', '')

    dispatch(setTranscript(notes))

    dispatch({
      type: 'CHANGE_TRANSCRIPT_INDEX',
      payload: defaultSentenceId,
      from: 'default_transcript_id',
    })

    dispatch({
      type: 'SET_CHANNELS',
      payload: channelSet,
    })

    dispatch({
      type: 'SET_LOADING',
      payload: false,
    })

    const blob = await getAudioSource(id, fileInfo, dispatch)

    const audioType = (blob.type || 'audio/mp3').split('/')[1]

    console.log(audioType)

    // audio buffer

    const start = performance.now()
    const arrayBuffer = await blob.arrayBuffer()
    const end = performance.now()

    // since we don't have an exact way to estimate the decoding time, we use the time it takes to read as array buffer as an estimate
    // https://github.com/WebAudio/web-audio-api/issues/335#issuecomment-308430651
    // eslint-disable-next-line no-warning-comments
    // TODO when we have an exact way for decode audio data progress then implement this
    // mp3 seems to take more time to decode than wav
    const estimatedTime = audioType === 'mp3' ? Math.ceil((end - start) * 50) : Math.ceil((end - start) * 25)

    dispatch({
      type: 'SET_ESTIMATED_DECODING_TIME',
      payload: estimatedTime,
    })
    const _start = performance.now()
    
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const audioBuffersForChannels = getChannelAudioBuffersFromAnAudioBuffer(
      audioContext,
      audioBuffer,
    )

    // audio player
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.src = URL.createObjectURL(blob)
    const _end = performance.now()

    console.log(_end - _start)

    dispatch({
      type: 'SET_AUDIO_PLAYER',
      payload: audio,
    })

    dispatch({
      type: 'SET_AUDIO_SOURCE',
      payload: {
        audioSource: {
          blob,
          duration,
        },
        audioBuffer,
        audioContext,
        channelCount: audioBuffersForChannels.length,
        audioBuffersForChannels: {
          ...audioBuffersForChannels.reduce((acc, v, i) => {
            acc[i] = v
            return acc
          }, {}),
          all: audioBuffer,
        },
        currentChannel: 'all',
      },
    })
  } catch (error) {
    dispatch(handleError(error.message + ' Try, refreshing your page!'))
    dispatch(setGetSourceError(true))
    console.log(error, error.stack)
  } finally {
    dispatch({
      type: 'SET_DECODING_BUFFER',
      payload: false,
    })
    dispatch({
      type: 'SET_ESTIMATED_DECODING_TIME',
      payload: 0,
    })
  }
}

export const setGetSourceError = v => ({
  type: 'SET_SOURCE_ERROR',
  payload: v,
})
