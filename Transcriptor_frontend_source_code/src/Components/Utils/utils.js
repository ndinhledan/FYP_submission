import { clamp, get, last, filter, keys } from 'lodash'
import { ObjectID } from 'bson'

export const getChannelAudioBuffersFromABlob = async blob => {
  const audioBuffers = []

  const audioBuffer = await blob.arrayBuffer()

  const ac = new AudioContext()

  const data = await ac.decodeAudioData(audioBuffer)

  const numOfChannels = data.numberOfChannels

  for (let i = 0; i < numOfChannels; i++) {
    const currentChannel = data.getChannelData(i)

    const newChannelArrayBuffer = ac.createBuffer(1, data.length, 44100)

    newChannelArrayBuffer.copyToChannel(currentChannel, 0)

    // const singleChannel = newChannelArrayBuffer.getChannelData(0)

    // for (let j = 0; j < newChannelArrayBuffer.length; j++) {
    //     singleChannel[j] = currentChannel[j]
    // }

    audioBuffers.push(newChannelArrayBuffer)
  }

  return audioBuffers
}

export const getChannelAudioBuffersFromAnAudioBuffer = (ac, data) => {
  const audioBuffers = []

  const numOfChannels = data.numberOfChannels

  for (let i = 0; i < numOfChannels; i++) {
    const currentChannel = data.getChannelData(i)

    const newChannelArrayBuffer = ac.createBuffer(1, data.length, 44100)

    newChannelArrayBuffer.copyToChannel(currentChannel, 0)

    // const singleChannel = newChannelArrayBuffer.getChannelData(0)

    // for (let j = 0; j < newChannelArrayBuffer.length; j++) {
    //     singleChannel[j] = currentChannel[j]
    // }

    audioBuffers.push(newChannelArrayBuffer)
  }

  return audioBuffers
}

export const getTimeDurationFromSeconds = (_secs, getMilli = false) => {
  const parts = [0, 0, 0]

  const secs = parseFloat(_secs)

  parts[0] = Math.floor(secs / 3600)

  parts[1] = Math.floor((secs - parts[0] * 3600) / 60)

  const s = secs - parts[0] * 3600 - parts[1] * 60

  parts[2] = getMilli ? s.toFixed(3) : Math.floor(s)

  return parts.map(p => p.toString().padStart(2, 0)).join(':')
}

export const getSectionAudioBuffer = (audioCtx, audioBuffer, start, end) => {
  const { numberOfChannels, sampleRate } = audioBuffer
  const newArrayBuffer = audioCtx.createBuffer(
    numberOfChannels,
    (end - start) * sampleRate,
    sampleRate,
  )

  const startIndex = clamp(start * sampleRate, 0, Infinity)
  const endIndex = clamp(end * sampleRate, startIndex, Infinity)

  for (let i = 0; i < numberOfChannels; i++) {
    const dataToCopy = audioBuffer.getChannelData(i)
    const newChannelData = newArrayBuffer.getChannelData(i)

    for (let j = startIndex; j < endIndex; j++) {
      newChannelData[j - startIndex] = dataToCopy[j]
    }
  }

  return newArrayBuffer
}

export const getNewObjectId = () => {
  const objectId = new ObjectID()
  return objectId.toHexString()
}

export const playBackRateOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export const getTranscriptionStatus = transcript => {
  const status = transcript.status

  if (status === 'processing') {
    const logs = get(transcript, 'logs', [])
    const lenLogs = logs.length
    if (lenLogs === 0) {
      return 'Processing...'
    } else {
      const lastLog = last(logs)
      return get(lastLog, 'content', '')
    }
  }

  return status
}

export const MIN_SECTION_LENGTH = 10
export const MAX_SECTION_LENGTH = 60

export const filterFunction = (filters, data) => {
  const _filteredData = filter(data, record => {
    const filterKeys = keys(filters)

    if (!filterKeys.length) return true

    const filterValues = filterKeys.map(field => filters[field].split(/\s+/).join('').toLowerCase())

    // all filters are empty - return all
    if (!filterValues.filter(v => v && v !== 'all').length) return true

    for (let i = 0; i < filterKeys.length; i++) {
      const currentField = filterKeys[i]
      const filterValue = filterValues[i]

      const compareValue = (get(record, currentField, '') || '').split(/\s+/).join('').toLowerCase()

      if (filterValue && filterValue !== 'all' && !compareValue.includes(filterValue) && !filterValue.includes(compareValue)) {
        return false
      }
    }

    return true
  })

  return _filteredData
}