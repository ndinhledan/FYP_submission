/* eslint-disable react-hooks/exhaustive-deps */
/* eslint no-loop-func: "off" */
import React, { useState, useEffect } from 'react'
import EventEmitter from 'event-emitter'
import hotkeys from 'hotkeys-js'
import $ from 'jquery'
import '../styles.css'
import { EditorLoader } from '../Utils/Loader'
import { timeFormat } from '../timeFormat'
import dataProvider from '../dataProvider'
import LRU from '../LRU'

import { useDispatch, useSelector } from 'react-redux'
import { updateReSpeakData } from '../../actions/SocketActions'
import {
  saveEventEmitter,
  toggleSaveMode,
  releaseToast,
} from '../../actions/TranscriptionActions'
import { useToasts } from 'react-toast-notifications'
import { getChannelAudioBuffersFromABlob } from '../Utils/utils'

const WaveformPlaylist = require('waveform-playlist-transcriptor')

const Playlist = props => {
  const [playlistLoaded, setPlaylistLoaded] = useState(false)
  const [audioSource, setAudioSource] = useState(null)
  const [channelAudioBuffers, setChannelAudioBuffers] = useState([])

  const { inSaveMode, toast, channel } = useSelector(state => ({
    ...state.TRANSCRIPTION,
  }))
  const { reSpeakData } = useSelector(state => ({ ...state.SOCKET }))

  const dispatch = useDispatch()
  const { addToast, removeToast } = useToasts()

  useEffect(() => {
    if (toast != null) {
      const { content, ...toastProps } = toast
      addToast(content, { autoDismiss: true, ...toastProps })

      dispatch(releaseToast(null))
    }
  }, [toast])

  useEffect(() => {
    if (audioSource) {
      const $annotations = document.getElementsByClassName('annotation')
      const $sentenceSectionBoxes = document.getElementsByClassName(
        'annotation-box',
      )

      for (const $annotation of $annotations) {
        const sentenceChannel = $annotation.id.split('-')[2]

        if (channel === sentenceChannel) {
          $annotation.classList.add('channel-active')
        } else {
          $annotation.classList.remove('channel-active')
        }
      }

      for (const $sentenceSectionBox of $sentenceSectionBoxes) {
        const sentenceChannel = $sentenceSectionBox.id.split('-')[3]

        if (sentenceChannel === channel) {
          $sentenceSectionBox.classList.add('channel-active')
        } else {
          $sentenceSectionBox.classList.remove('channel-active')
        }
      }
    }
  }, [channel])

  const cachedSamplesPerPixel =
    1800 -
    (JSON.parse(localStorage.getItem('editorState'))
      ? JSON.parse(localStorage.getItem('editorState')).zoomLevel
      : 300)

  /*
        setInterval objects
    */
  let cursorUpdate = null
  let autoSave = null

  const cleanUp = () => {
    hotkeys.unbind('ctrl+p')
    hotkeys.unbind('ctrl+z')
    hotkeys.unbind('up')
    hotkeys.unbind('down')
    hotkeys.unbind('enter')
    hotkeys.unbind('ctrl+r')
    hotkeys.unbind('command+r')
    hotkeys.unbind('tab')
    clearInterval(cursorUpdate)
    clearInterval(autoSave)
  }

  const getAudioSource = async () => {
    try {
      const audioCache = new LRU(3) // cache size

      await audioCache.init()

      const key = `blob-${props._id}`

      if (audioCache.has(key)) {
        console.log('USING CACHED FILE')
        const start = new Date().getTime()
        const blob = await audioCache.get(key)

        const end = new Date().getTime()

        console.log('CACHE GET ', end - start)

        return blob
      } else {
        console.log('FILE NOT CACHED')
        const start = new Date().getTime()

        const res = await dataProvider.get(`${props.fileInfo.path}`, {
          options: {
            responseType: 'blob',
          },
        })

        const fetchedBlob = new Blob([res.data], { type: 'audio/mp3' })

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
    }
  }

  useEffect(() => {
    if (reSpeakData) {
      const { sentences } = reSpeakData

      dispatch(
        releaseToast({
          content: 'New version of sentences found via re-speak!',
          appearance: 'info',
          autoDismissTimeout: 3000,
        }),
      )

      for (const _id in sentences) {
        const { text } = sentences[_id] // { status, text }
        const $annotation = document.getElementById(`annotation-${_id}`)

        const $lockIcon = $annotation.getElementsByClassName('fa-lock')[0]
        $lockIcon.style.display = 'none'

        const $annotationTextarea = $annotation.getElementsByClassName(
          'annotation-lines',
        )[0]
        $annotationTextarea.value = text

        $annotation.style.cursor = 'pointer'
        $annotationTextarea.style.cursor = 'auto'

        $annotation.classList.add('flash')

        setTimeout(() => {
          $annotation.classList.remove('flash')
        }, 1500)
      }

      dispatch(updateReSpeakData(null))
    }
  }, [reSpeakData])

  useEffect(() => {
    const loadAudioSource = async () => {
      try {
        const blob = await getAudioSource()
        const duration = props.fileInfo.duration

        const channelBlobs = await getChannelAudioBuffersFromABlob(blob)

        setAudioSource({ blob, duration })
        setChannelAudioBuffers(channelBlobs)
      } catch (err) {
        dispatch(
          releaseToast({
            content: err.message + ' Try, refreshing your page!',
            appearance: 'error',
            autoDismissTimeout: 5000,
          }),
        )
      }
    }

    loadAudioSource()
  }, [])

  useEffect(() => {
    if (audioSource) {
      // if (audioSource && channelAudioBuffers.length) {
      const playlist = WaveformPlaylist.init(
        {
          container: document.getElementById('waveform-playlist-container'),
          timescale: true,
          state: 'cursor',
          mono: true,
          colors: {
            waveOutlineColor: 'white',
            timeColor: 'grey',
            fadeColor: 'black',
          },
          annotationList: {
            annotations: props.notes,
            controls: props.actions,
            editable: true,
            isContinuousPlay: false,
            linkEndpoints: false,
          },
          seekStyle: 'line',
          samplesPerPixel: cachedSamplesPerPixel,
          waveHeight: 100,
          zoomLevels: [300, 400, 500, 700, 800, 1000, 1100, 1300, 1400, 1500],
          options: {
            isAutomaticScroll: false,
          },
          controls: {
            /*
                            Controls display is set to none,
                            only used to click() the mute button using JS
                        */
            show: true,
            width: 0,
          },
        },
        EventEmitter(),
      )

      setTimeout(() => {
        const start = new Date().getTime()
        const channelOptions = props.channelOptions

        const selectedChannel = (channelOptions || []).findIndex(
          ({ value }) => value === channel,
        )

        playlist
          .load([
            {
              src: audioSource.blob,
              // src: channelAudioBuffers[selectedChannel],
              muted: false,
            },
          ])
          .then(function() {
            const end = new Date().getTime()

            $('.playlist-toolbar').fadeIn(0)
            $('#waveform-playlist-container').fadeIn(0)

            console.log('EXEC : ', end - start)

            setPlaylistLoaded(true)

            const ee = playlist.getEventEmitter()
            dispatch(saveEventEmitter(ee))

            const $waveformPlaylistContainer = document.getElementById(
              'waveform-playlist-container',
            )

            if ($waveformPlaylistContainer) {
              /*
                                Elements & Variables
                            */
              const $zoomOut = document.getElementsByClassName(
                'btn-zoom-out',
              )[0]
              const $zoomIn = document.getElementsByClassName('btn-zoom-in')[0]
              const $waveform = document.getElementsByClassName(
                'playlist-tracks',
              )[0]
              const $annotationsTextBoxContainer = document.getElementsByClassName(
                'annotations-text',
              )[0]
              const $sentenceSectionBoxes = document.getElementsByClassName(
                'annotation-box',
              )
              const $annotationsBoxesDiv = document.getElementsByClassName(
                'annotations-boxes',
              )[0]
              const $annotationsTextBoxes = document.getElementsByClassName(
                'annotation-lines',
              )
              const $annotationsSpeaker = document.getElementsByClassName(
                'annotation-speaker',
              )
              const $cursor = document.getElementsByClassName('cursor')[0]
              const $waveformTrack = document.getElementsByClassName(
                'waveform',
              )[0]
              const $selectionPoint = document.getElementsByClassName(
                'point',
              )[0]
              let $annotations = document.getElementsByClassName('annotation') // will change on delete
              const $timeTicks = Array.from(
                document.getElementsByClassName('time'),
              )
              const $sentenceDeleteCrosses = $annotationsTextBoxContainer.getElementsByClassName(
                'fa-times',
              )
              const $setenceRevertIcons = $annotationsTextBoxContainer.getElementsByClassName(
                'fa-history',
              )
              const $lockIcons = $annotationsTextBoxContainer.getElementsByClassName(
                'fa-lock',
              )
              const $unLockIcons = $annotationsTextBoxContainer.getElementsByClassName(
                'fa-unlock',
              )

              const notesCache = props.notes
              let prevScroll = 0
              const zoomLevels = [
                300,
                400,
                500,
                700,
                800,
                1000,
                1100,
                1300,
                1400,
                1500,
              ]
              const cachedZoomLevel = JSON.parse(
                localStorage.getItem('editorState'),
              )
                ? JSON.parse(localStorage.getItem('editorState')).zoomLevel
                : 300
              let currZoomLevel = zoomLevels.indexOf(cachedZoomLevel)
              const annotationsContainerHeight =
                $annotationsTextBoxContainer &&
                $annotationsTextBoxContainer.offsetHeight - 20
              let annotationBoxHeights = Array.from($annotations).map(
                $annotation => $annotation.offsetHeight,
              )
              const scrollPoints = new Set()
              const sentenceIdOnCursor = 0
              const cursorLimit =
                $annotationsBoxesDiv && $annotationsBoxesDiv.offsetWidth
              let nextPlayMode = 'play'
              let editMode = false
              let sentenceSectionMode = false
              let popUpInDisplay = false
              let speakerPopUpInDisplay = false
              let percentagePopUp = false
              let popUpOpenForSentenceId = -1
              let currentHighlightedSentence = -1
              const speakerMap = new Map() // speakerName -> [ list of sentence _id's ]
              const sentenceMap = new Map() // sentence _id -> sentenceIdx
              const PLAY_BACK_RATE_OFFSET = 0.1
              const SAMPLE_RATE = 44100
              let SAMPLES_PER_PIXEL = 1800 - zoomLevels[currZoomLevel]

              for (let i = 1; i < annotationBoxHeights.length; i++) {
                annotationBoxHeights[i] += annotationBoxHeights[i - 1]
              }

              /*
                                Time related vars and methods
                            */

              const timeStringToFloat = time => {
                const [hours, minutes, seconds] = time
                  .split(':')
                  .map(unit => parseFloat(unit))

                const totalSeconds = hours * 3600 + minutes * 60 + seconds

                return totalSeconds
              }

              const secondsToPixels = seconds => {
                return (parseFloat(seconds) * SAMPLE_RATE) / SAMPLES_PER_PIXEL
              }

              const pixelsToSeconds = pixels => {
                return (pixels * SAMPLES_PER_PIXEL) / SAMPLE_RATE
              }

              /*
                                Unsubscribe to all event listeners
                                for case when page is refreshed
                            */
              cleanUp()

              /*
                                Utility functions
                            */
              const updateAnnotationBoxHeights = () => {
                annotationBoxHeights = Array.from($annotations).map(
                  $annotation => $annotation.offsetHeight,
                )

                for (let i = 1; i < annotationBoxHeights.length; i++) {
                  annotationBoxHeights[i] += annotationBoxHeights[i - 1]
                }
              }

              const updateAnnotations = () => {
                $annotations = document.getElementsByClassName('annotation')

                updateAnnotationBoxHeights()
              }

              const removeSentenceHighlight = $element => {
                $element && $element.classList.remove('current-selected')
              }

              const addSentenceHighlight = $element => {
                $element && $element.classList.add('current-selected')
              }

              // eslint-disable-next-line
              const removeAllSentenceHighlights = () => {
                Array.from($annotations).map($e =>
                  $e.classList.remove('current-selected'),
                )
              }

              const addSectionHighlight = $element => {
                $element && $element.classList.add('section-highlight')
              }

              const removeSectionHighlight = $element => {
                $element && $element.classList.remove('section-highlight')
              }

              const removeAllSectionHighlights = () => {
                Array.from($sentenceSectionBoxes).map($e =>
                  $e.classList.remove('section-highlight'),
                )
              }

              const removeAllHighlights = () => {
                Array.from($annotations).map($e =>
                  $e.classList.remove('current-selected'),
                )
                Array.from($sentenceSectionBoxes).map($e =>
                  $e.classList.remove('section-highlight'),
                )
              }

              const getCurrentHighlightedElement = () => {
                if (currentHighlightedSentence !== -1) {
                  return $annotations[currentHighlightedSentence]
                }
                return null
              }

              const lower_bound = (target, list) => {
                let l = 0
                let r = list.length

                while (l < r) {
                  const mid = parseInt((l + r) / 2)

                  if (list[mid] >= target) {
                    r = mid
                  } else {
                    l = mid + 1
                  }
                }

                return l
              }

              const calcSentenceScrollEndPoints = () => {
                const annotationsContainerScrollTop =
                  $annotationsTextBoxContainer.scrollTop

                let topSentenceId = lower_bound(
                  annotationsContainerScrollTop,
                  annotationBoxHeights,
                )

                if (
                  annotationBoxHeights[topSentenceId] ===
                  annotationsContainerHeight
                ) {
                  topSentenceId += 1
                }

                const bottomSentenceId = lower_bound(
                  annotationsContainerScrollTop + annotationsContainerHeight,
                  annotationBoxHeights,
                )

                scrollPoints.clear()
                scrollPoints.add(topSentenceId)
                scrollPoints.add(bottomSentenceId)
              }

              let maxSpeakerTagWidth = -1

              const constructAnnotationsContainer = () => {
                /*
                                    Replace .annotation-lines with div contenteditables
                                    for no reason but edit works when playing now!

                                    NOTE: $textarea is a DIV actually will change it later or you can :)
                                */
                let idx = 0
                for (const $annotation of $annotations) {
                  let { sentenceId, channel: sentenceChannel } = props.notes[
                    idx
                  ]

                  sentenceMap.set(sentenceId, idx + 1)

                  sentenceChannel =
                    sentenceChannel !== 'undefined'
                      ? sentenceChannel
                      : 'channel1'

                  $annotation.id = `annotation-${sentenceId}-${sentenceChannel}`
                  $annotation.classList.remove('respeak-failed')

                  if (sentenceChannel === channel) {
                    $annotation.classList.add('channel-active')
                  }

                  const $contentEditAbleSpan = $annotation.getElementsByClassName(
                    'annotation-lines',
                  )[0]
                  const $annotationsActionsDiv = $annotation.getElementsByClassName(
                    'annotation-actions',
                  )[0]
                  const sentenceText = $contentEditAbleSpan.innerText.trim()

                  const $speakerSpan = document.createElement('div')
                  $speakerSpan.className = 'annotation-speaker'

                  const speaker = props.notes[idx].speaker

                  if (speakerMap.has(speaker)) {
                    const listOfSentences = speakerMap.get(speaker)
                    listOfSentences.push({
                      _id: sentenceId,
                      sentenceIdx: idx + 1,
                    })

                    speakerMap.set(speaker, listOfSentences)
                  } else {
                    speakerMap.set(speaker, [
                      { _id: sentenceId, sentenceIdx: idx + 1 },
                    ])
                  }

                  $speakerSpan.id = `speaker-name-${sentenceId}`
                  $speakerSpan.textContent = `${speaker}`
                  $speakerSpan.setAttribute(
                    'title',
                    `Sentence by Speaker - ${speaker}`,
                  )

                  const $textarea = document.createElement('div')

                  $textarea.setAttribute('contenteditable', 'true')
                  $textarea.textContent = sentenceText

                  $textarea.classList.add('annotation-lines')

                  $annotation.removeChild($contentEditAbleSpan)
                  $annotation.insertBefore($textarea, $annotationsActionsDiv)
                  $annotation.insertBefore($speakerSpan, $textarea)

                  const $revertIcon = $annotation.getElementsByClassName(
                    'fa-history',
                  )[0]
                  const $lockIcon = $annotation.getElementsByClassName(
                    'fa-lock',
                  )[0]

                  switch (props.notes[idx].reSpeak.status) {
                    case 0:
                      // never in respeak before
                      $lockIcon.style.display = 'none'
                      break

                    case 1:
                      // respeak in progress
                      $annotation.style.cursor = 'not-allowed'
                      $textarea.style.cursor = 'not-allowed'
                      break

                    case 2:
                      // respeak done
                      $lockIcon.style.display = 'none'
                      break

                    case 3:
                      // respeak failed
                      $annotation.classList.add('respeak-failed')
                      $annotation.setAttribute('title', 're-speak failed')
                      break

                    default:
                      break
                  }

                  if (!props.notes[idx].prevText) {
                    $revertIcon.classList.add('disable')
                  } else if (
                    props.notes[idx].prevText === props.notes[idx].lines
                  ) {
                    $revertIcon.classList.add('disable')
                  }
                  idx++
                }

                idx = 0
                for (const $sentenceSectionBox of $sentenceSectionBoxes) {
                  const { sentenceId, channel: sentenceChannel } = props.notes[
                    idx
                  ]
                  $sentenceSectionBox.id = `annotation-box-${sentenceId}-${sentenceChannel}`

                  if (sentenceChannel === channel) {
                    $sentenceSectionBox.classList.add('channel-active')
                  }
                  idx++
                }
              }

              const updateMaxSpeakerWidth = () => {
                maxSpeakerTagWidth = -1
                for (const $annotation of $annotations) {
                  const $speakerBox = $annotation.getElementsByClassName(
                    'annotation-speaker',
                  )[0]

                  if ($speakerBox.style.width === '') {
                    const r = $speakerBox.getBoundingClientRect()

                    maxSpeakerTagWidth = Math.max(maxSpeakerTagWidth, r.width)
                  } else {
                    $speakerBox.style.width = '1px'

                    maxSpeakerTagWidth = Math.max(
                      maxSpeakerTagWidth,
                      $speakerBox.scrollWidth,
                    )
                  }
                }

                setTimeout(() => adjustSpeakerBoxWidths(), 100)
              }

              const adjustSpeakerBoxWidths = () => {
                for (const $annotation of $annotations) {
                  const $speakerBox = $annotation.getElementsByClassName(
                    'annotation-speaker',
                  )[0]
                  $speakerBox.style.width = maxSpeakerTagWidth + 'px'
                }
              }

              const buildAnnotationHeights = () => {
                for (const $annotation of $annotations) {
                  const $textarea = $annotation.getElementsByClassName(
                    'annotation-lines',
                  )[0]

                  $textarea.style.height = '1px'
                  $textarea.style.height = $textarea.scrollHeight + 25 + 'px'
                  $textarea.style.overflow = 'hidden'
                }
                updateAnnotations()
              }

              const resizeAnnotation = $annotationTextBox => {
                $annotationTextBox.style.height =
                  '1px' /* to get content height using scroll Height */
                $annotationTextBox.style.height =
                  $annotationTextBox.scrollHeight + 15 + 'px'
              }

              const moveUp = () => {
                const len = $annotations.length

                const prev = currentHighlightedSentence
                let next = (currentHighlightedSentence - 1) % len

                if (prev === 0) {
                  /* press up arrow on first sentence */
                  next = len - 1
                  currentHighlightedSentence = next

                  removeSentenceHighlight($annotations[prev])
                  addSentenceHighlight($annotations[next])

                  const scrollToVal = annotationBoxHeights[len - 1]
                  $annotationsTextBoxContainer.scrollTo({
                    left: 0,
                    top: scrollToVal,
                  })

                  return {
                    $prevSentenceNode: $annotations[prev],
                  }
                } else if (prev > 0) {
                  /* press up arrow on some sentence except first */
                  currentHighlightedSentence = next

                  removeSentenceHighlight($annotations[prev])
                  addSentenceHighlight($annotations[next])

                  if (scrollPoints.has(next)) {
                    if (next === 0) {
                      $annotationsTextBoxContainer.scrollTo({ left: 0, top: 0 })
                    } else {
                      const scrollToVal = annotationBoxHeights[next - 1]
                      $annotationsTextBoxContainer.scrollTo({
                        left: 0,
                        top: scrollToVal,
                      })
                    }
                  }
                  return {
                    $prevSentenceNode: $annotations[prev],
                  }
                }
                return {
                  $prevSentenceNode: null,
                }
              }

              const moveDown = () => {
                const len = $annotations.length

                const prev = currentHighlightedSentence
                const next = (currentHighlightedSentence + 1) % len

                currentHighlightedSentence = next

                if (prev >= 0) {
                  /* Press down arrow on any sentence */
                  if (next === 0) {
                    $annotationsTextBoxContainer.scrollTo({ left: 0, top: 0 })
                  } else {
                    if (scrollPoints.has(next)) {
                      const scrollToVal = annotationBoxHeights[prev]
                      $annotationsTextBoxContainer.scrollTo({
                        left: 0,
                        top: scrollToVal,
                      })
                    }
                  }

                  removeSentenceHighlight($annotations[prev])
                  addSentenceHighlight($annotations[next])

                  return {
                    $prevSentenceNode: $annotations[prev],
                  }
                }

                /* Press down arrow on init */
                addSentenceHighlight($annotations[next])
                return {
                  $prevSentenceNode: null,
                }
              }

              const getSentenceInfo = $element => {
                if ($element) {
                  const sentenceId = $element.getElementsByClassName(
                    'annotation-id',
                  )[0].innerText
                  let startTime = $element.getElementsByClassName(
                    'annotation-start',
                  )[0].innerText
                  let endTime = $element.getElementsByClassName(
                    'annotation-end',
                  )[0].innerText
                  const text = $element.getElementsByClassName(
                    'annotation-lines',
                  )[0].innerText

                  startTime = timeStringToFloat(startTime)
                  endTime = timeStringToFloat(endTime)

                  return { sentenceId, startTime, endTime, text }
                }
                return null
              }

              const getTimeAtCursorPosition = () => {
                const cursorPos = parseFloat($cursor.style.left)

                const oneSecondInPix = secondsToPixels(1)

                const pauseTime = parseFloat(cursorPos / oneSecondInPix)

                return pauseTime
              }

              const moveCursor = offsetSeconds => {
                let cursorPos = parseInt($cursor.style.left)
                const offset = secondsToPixels(offsetSeconds)

                cursorPos += offset

                $cursor.style.left = cursorPos.toString() + 'px'
              }

              const setCursorByTime = time => {
                const offset = secondsToPixels(time)

                $cursor.style.left = offset.toString() + 'px'
              }

              const setCursorByLeft = left => {
                $cursor.style.left = left.toString() + 'px'
              }

              const diffTimes = (oldTime, newTime) => oldTime !== newTime

              const diffExists = (
                sentenceId,
                newText,
                currNewStartTime,
                currNewEndTime,
              ) => {
                const oldText = notesCache[sentenceId].lines.trim()

                const currOldStartTime = parseFloat(
                  notesCache[sentenceId].begin,
                )
                const currOldEndTime = parseFloat(notesCache[sentenceId].end)

                const currStartTimeChanged = diffTimes(
                  currOldStartTime,
                  currNewStartTime,
                )
                const currEndTimeChanged = diffTimes(
                  currOldEndTime,
                  currNewEndTime,
                )

                let textChanged = false

                if (currStartTimeChanged) {
                  notesCache[sentenceId].begin = currNewStartTime.toString()
                }
                if (currEndTimeChanged) {
                  notesCache[sentenceId].end = currNewEndTime.toString()
                }
                if (newText.length !== oldText.length || newText !== oldText) {
                  notesCache[sentenceId].lines = newText.trim()

                  textChanged = true
                }

                return {
                  currStartTimeChanged,
                  currEndTimeChanged,
                  textChanged,
                }
              }

              const save = async $sentenceNode => {
                const sentences = []

                if ($sentenceNode !== null) {
                  const info = getSentenceInfo($sentenceNode)
                  if (info) {
                    let { sentenceId, text, startTime, endTime } = info

                    sentenceId -= 1 // convert to zero based indexing

                    const {
                      currStartTimeChanged,
                      currEndTimeChanged,
                      textChanged,
                    } = diffExists(sentenceId, text, startTime, endTime)

                    if (
                      currStartTimeChanged ||
                      currEndTimeChanged ||
                      textChanged
                    ) {
                      dispatch(toggleSaveMode(true))

                      if (
                        sentenceId === 0 &&
                        $annotations[sentenceId + 1] &&
                        props.notes[sentenceId + 1]
                      ) {
                        const { text, startTime, endTime } = getSentenceInfo(
                          $annotations[sentenceId + 1],
                        )
                        sentences.push({
                          sentenceId: props.notes[sentenceId + 1].sentenceId,
                          text,
                          startTime,
                          endTime,
                        })
                      } else if (
                        sentenceId === $annotations.length - 1 &&
                        $annotations[sentenceId - 1] &&
                        props.notes[sentenceId - 1]
                      ) {
                        const { text, startTime, endTime } = getSentenceInfo(
                          $annotations[sentenceId - 1],
                        )
                        sentences.push({
                          sentenceId: props.notes[sentenceId - 1].sentenceId,
                          text,
                          startTime,
                          endTime,
                        })
                      } else {
                        if (
                          $annotations[sentenceId + 1] &&
                          $annotations[sentenceId - 1]
                        ) {
                          const {
                            sentenceId: prevId,
                            ...prevSentenceData
                          } = getSentenceInfo($annotations[sentenceId + 1])
                          sentences.push({
                            sentenceId: props.notes[sentenceId + 1].sentenceId,
                            ...prevSentenceData,
                          })

                          const {
                            sentenceId: nextId,
                            ...nextSentenceData
                          } = getSentenceInfo($annotations[sentenceId - 1])
                          sentences.push({
                            sentenceId: props.notes[sentenceId - 1].sentenceId,
                            ...nextSentenceData,
                          })
                        }
                      }

                      if (textChanged) {
                        /*
                                                    Some edit has happened which means
                                                    revert back is allowed now
                                                */
                        const $revertIcon = $sentenceNode.getElementsByClassName(
                          'fa-history',
                        )[0]
                        $revertIcon.classList.remove('disable')
                      }

                      sentences.push({
                        sentenceId: props.notes[sentenceId].sentenceId,
                        text,
                        startTime,
                        endTime,
                      })

                      try {
                        const res = await dataProvider.speech.transcripts.update(
                          '',
                          {
                            id: props._id,
                            options: {
                              data: {
                                sentences,
                              },
                            },
                          },
                        )

                        return res
                      } catch (e) {
                        return Promise.reject(e)
                      }
                    }
                  }
                }
                return null
              }

              const scrollToSection = sentenceId => {
                addSectionHighlight($sentenceSectionBoxes[sentenceId - 1])

                const scrollVal =
                  parseInt($sentenceSectionBoxes[sentenceId - 1].style.left) -
                  20
                const LIMIT = 500 // 8000px

                $waveform.scrollTo({
                  left: prevScroll + scrollVal,
                  top: 0,
                  behavior: Math.abs(scrollVal) > LIMIT ? 'auto' : 'smooth',
                })

                prevScroll += scrollVal
              }

              const scrollToSentence = sentenceId => {
                $annotationsTextBoxContainer.scrollTo({
                  left: 0,
                  top:
                    parseInt(sentenceId) === 1
                      ? 0
                      : annotationBoxHeights[sentenceId - 2],
                  behavior: 'smooth',
                })
              }

              const findSentence = time => {
                for (const $annotation of $annotations) {
                  // can use lower_bound()
                  const { sentenceId, startTime, endTime } = getSentenceInfo(
                    $annotation,
                  )

                  if (time >= startTime && time < endTime) {
                    return {
                      $currSentence: $annotation,
                      sentenceId,
                    }
                  }
                }
                return {
                  $currSentence: null,
                  sentenceId: null,
                }
              }

              const restart = () => {
                const $currentHighlighted = getCurrentHighlightedElement()

                if ($currentHighlighted) {
                  const { startTime, endTime } = getSentenceInfo(
                    $currentHighlighted,
                  )
                  const rate = parseFloat(localStorage.getItem('playbackRate'))
                  ee.emit('play', startTime, endTime, rate)

                  nextPlayMode = 'pause'
                  props.callbacks.changeTrackMode('play', null, ee)
                }
              }

              const resetCursorAfterPlayback = ($sentence, startTime) => {
                const { sentenceId, endTime } = getSentenceInfo($sentence)
                const startPoint =
                  parseInt($sentenceSectionBoxes[sentenceId - 1].style.left) +
                  $waveform.scrollLeft

                const rate = parseFloat(localStorage.getItem('playbackRate'))

                SECTION_TIMER = setTimeout(() => {
                  sentenceSectionMode = false
                  localStorage.removeItem('section-playing-editor')
                  localStorage.removeItem('SECTION_TIMER_ID')
                  setCursorByLeft(startPoint)
                  props.callbacks.changeTrackMode('pause', null, ee)
                  nextPlayMode = 'play'
                }, ((endTime - startTime + 0.1) * 1000) / rate)

                // update the current section timer id to localStorage
                localStorage.setItem('SECTION_TIMER_ID', SECTION_TIMER)
              }

              let SECTION_TIMER = null

              const cueTrack = () => {
                localStorage.removeItem('globalNextPlayMode')

                sentenceSectionMode = !!localStorage.getItem(
                  'section-playing-editor',
                )

                if (editMode || sentenceSectionMode) {
                  /*
                                        play / pause (using ctrl + p) inside sentence or sentence section click
                                    */

                  const $currentHighlighted = getCurrentHighlightedElement()

                  if ($currentHighlighted) {
                    if (nextPlayMode === 'play') {
                      /*
                                                track was paused, now playing
                                            */
                      const cursorPos = getTimeAtCursorPosition()
                      const rate = parseFloat(
                        localStorage.getItem('playbackRate'),
                      )
                      let { startTime, endTime } = getSentenceInfo(
                        $currentHighlighted,
                      )

                      startTime = Math.max(startTime, cursorPos)

                      resetCursorAfterPlayback($currentHighlighted, startTime)

                      ee.emit('play', startTime, endTime, rate)
                      nextPlayMode = 'pause'
                    } else {
                      /*
                                                track was playing, now paused
                                            */
                      ee.emit('pause')
                      nextPlayMode = 'play'

                      clearTimeout(SECTION_TIMER)
                      localStorage.removeItem('SECTION_TIMER_ID')
                    }
                  }
                } else {
                  /*
                                        play / pause in complete track
                                    */
                  if (nextPlayMode === 'play') {
                    /*
                                            currently track paused
                                        */
                    const cursorPos = getTimeAtCursorPosition() // returns time at which the cursor is.

                    const rate = parseFloat(
                      localStorage.getItem('playbackRate'),
                    )

                    ee.emit('play', cursorPos, Infinity, rate)
                    nextPlayMode = 'pause'
                  } else {
                    /*
                                            currently track is playing
                                        */
                    ee.emit('pause')
                    nextPlayMode = 'play'
                  }
                }
                props.callbacks.changeTrackMode(
                  nextPlayMode === 'play' ? 'pause' : 'play',
                  null,
                  ee,
                )
                updateEditorState()
              }

              const buildElement = (
                type,
                className,
                id,
                styles = '',
                textContent = '',
              ) => {
                const $e = document.createElement(type)
                const $style = document.createElement('style')

                if (id) $e.id = id
                if (className) $e.className = className
                if (textContent) $e.innerHTML = textContent

                $style.innerHTML = styles

                document.body.appendChild($style)

                return $e
              }

              const adjustLeft = () => {
                /*
                                    Adjust the left of the pop-up based on dynamic width
                                */
                const $popUp = document.getElementsByClassName(
                  'pop-up-container',
                )[0]
                const styles = getComputedStyle($popUp)

                if ($popUp) {
                  $popUp.style.left =
                    parseFloat(styles.left) -
                    parseFloat($popUp.clientWidth / 2) +
                    28 +
                    'px'
                }
              }

              /* TEMPORARILY REMOVED */
              const showTimePopUp = () => {
                const cursorPos = getTimeAtCursorPosition()
                const { left, top } = $cursor.getBoundingClientRect()
                const $playlistContainer = document.getElementById(
                  'waveform-playlist-container',
                )

                if ($playlistContainer) {
                  const cursorLeft = parseInt($cursor.style.left)
                  if (
                    cursorLeft >= prevScroll &&
                    cursorLeft <= prevScroll + cursorLimit
                  ) {
                    /*
                                            Display pop-up only when $cursor is in view on the waveform
                                        */
                    const $playlist = document.getElementsByClassName(
                      'playlist',
                    )[0]

                    const time = timeFormat(cursorPos)

                    const popUpStyles = `
                                        .pop-up-container {
                                            top: ${
                                              window.scrollY > 250
                                                ? 0
                                                : top - 60
                                            }px;
                                            left: ${left - 28}px;
                                        }
                                    `

                    const $popUp = buildElement(
                      'div',
                      'pop-up-container',
                      null,
                      popUpStyles,
                    )
                    const $timeDisplay = buildElement(
                      'div',
                      'pop-up-time-display animate',
                      null,
                      null,
                      time,
                    )
                    const $pointer = buildElement(
                      'div',
                      'pop-up-pointer animate',
                    )

                    if ($popUp) {
                      $popUp.appendChild($timeDisplay)

                      window.scrollY <= 250 && $popUp.appendChild($pointer)

                      $playlistContainer.insertBefore($popUp, $playlist)

                      popUpInDisplay = true

                      updateEditorState()

                      adjustLeft()
                    }
                  }
                }
              }

              /* TEMPORARILY REMOVED */
              const removeTimePopUp = () => {
                const $playlistContainer = document.getElementById(
                  'waveform-playlist-container',
                )

                if ($playlistContainer) {
                  const $popUp = document.getElementsByClassName(
                    'pop-up-container',
                  )[0]

                  if ($popUp) {
                    $playlistContainer.removeChild($popUp)

                    popUpInDisplay = false

                    updateEditorState()
                  }
                }
              }

              // let WINDOW_SCROLL_TIMER = null;
              window.addEventListener('scroll', e => {
                e.preventDefault()

                // popUpInDisplay && removeTimePopUp();

                // clearTimeout(WINDOW_SCROLL_TIMER);

                // WINDOW_SCROLL_TIMER = setTimeout(() => {
                //     if (popUpInDisplay) {
                //         removeTimePopUp();
                //         showTimePopUp();
                //     }
                // }, 200);
              })

              let ANNOTATIONS_SCROLL_TIMER = null

              const showPercentagePopUp = $e => {
                const containerScroll = $e.scrollTop
                const containerFullHeight = $e.scrollHeight
                const containerClientHeight = $e.clientHeight

                const percentage = Math.round(
                  ((containerScroll + containerClientHeight) * 100) /
                    containerFullHeight,
                )

                const $popUp = document.createElement('div')
                $popUp.id = 'percentage-popup'
                $popUp.textContent = `- ${percentage}%`

                const { right, top } = $e.getBoundingClientRect()
                const offset = (percentage * containerClientHeight) / 100

                $popUp.style.cssText = `
                                position: absolute;
                                width: 80px;
                                height: 25px;
                                border-radius: 10px;
                                text-align: center;
                                padding-top: 5px;
                                font-size: 13px;
                                font-family: 'Open Sans';
                                letter-spacing: 1.5px;
                                z-index: 1000;
                                top: ${top + offset - 30}px;
                                left: ${right}px;
                                background-color: transparent;
                                color: #000;
                                font-weight: normal;
                            `

                document.body.appendChild($popUp)
                percentagePopUp = true
              }

              const removePercentagePopUp = () => {
                const $popUp = document.getElementById('percentage-popup')

                document.body.removeChild($popUp)
                percentagePopUp = false
              }

              $annotationsTextBoxContainer.addEventListener('scroll', e => {
                const $e = e.target
                clearTimeout(ANNOTATIONS_SCROLL_TIMER)

                percentagePopUp && removePercentagePopUp()

                ANNOTATIONS_SCROLL_TIMER = setTimeout(() => {
                  showPercentagePopUp($e)
                }, 200)
              })

              autoSave = setInterval(() => {
                const $currentHighlighted = getCurrentHighlightedElement()
                const autoSaveMode = localStorage.getItem('autoSave')

                if (!inSaveMode && autoSaveMode === 'true') {
                  save($currentHighlighted)
                    .then(resp => {
                      if (resp !== null) {
                        setTimeout(() => dispatch(toggleSaveMode(false)), 1000)
                      }
                    })
                    .catch(err => {
                      if (err.response && 'message' in err.response.data) {
                        dispatch(
                          releaseToast({
                            content:
                              err.response.data.message +
                              ' Try, refreshing your page!',
                            appearance: 'error',
                            autoDismissTimeout: 3000,
                          }),
                        )
                      } else {
                        dispatch(
                          releaseToast({
                            content:
                              "Couldn't save changes, please refresh your page and try again!",
                            appearance: 'error',
                            autoDismissTimeout: 3000,
                          }),
                        )
                      }
                    })
                }
              }, 1000)

              const scrollOnCursorLimit = cursorPos => {
                const relativeFirstTick = parseInt($timeTicks[0].style.left)
                const relativeFirstTickTime = timeStringToFloat(
                  '00:' + $timeTicks[0].innerText,
                )

                const cursorPosFromStart =
                  relativeFirstTick +
                  (cursorPos - relativeFirstTickTime) * secondsToPixels(1)

                if (cursorPosFromStart >= cursorLimit - 30) {
                  $waveform.scrollTo({
                    left: prevScroll + cursorLimit,
                    top: 0,
                    behavior: 'smooth',
                  })
                }
              }

              cursorUpdate = setInterval(() => {
                let globalNextPlayMode = null
                const cursorPos = getTimeAtCursorPosition()

                if (localStorage.getItem('globalNextPlayMode')) {
                  globalNextPlayMode = localStorage.getItem(
                    'globalNextPlayMode',
                  )
                  nextPlayMode = globalNextPlayMode
                }
                if (nextPlayMode === 'pause') {
                  // currently playing
                  scrollOnCursorLimit(cursorPos)

                  const { $currSentence, sentenceId } =
                    cursorPos && findSentence(cursorPos)

                  if (sentenceId && !editMode) {
                    currentHighlightedSentence = Math.max(
                      currentHighlightedSentence,
                      sentenceId - 1,
                    )

                    const list = $annotationsTextBoxContainer.getBoundingClientRect()
                    const row = $currSentence.getBoundingClientRect()
                    const diff = row.top - list.top

                    $annotationsTextBoxContainer.scrollTo({
                      behviour: 'smooth',
                      left: 0,
                      top: $annotationsTextBoxContainer.scrollTop + diff,
                    })
                  }

                  // if (popUpInDisplay) {
                  //     removeTimePopUp();
                  // }
                } else {
                  // currently paused
                  // if (!popUpInDisplay && cursorPos !== 0) {
                  //     showTimePopUp();
                  // }
                }

                localStorage.setItem('cursorPos', getTimeAtCursorPosition())
              }, 500)

              const updateEditorState = () => {
                const $currentHighlighted = getCurrentHighlightedElement()
                let sentenceId = null

                if ($currentHighlighted) {
                  sentenceId = getSentenceInfo($currentHighlighted).sentenceId
                }

                const currEditorState = {
                  waveFormScroll: $waveform.scrollLeft,
                  annotationsContainerScroll:
                    $annotationsTextBoxContainer.scrollTop,
                  cursorPos: $cursor.style.left,
                  currentHighlightedSentenceId: sentenceId,
                  inEditMode: editMode,
                  zoomLevel: zoomLevels[currZoomLevel],
                  popUpInDisplay,
                }
                localStorage.setItem(
                  'editorState',
                  JSON.stringify(currEditorState),
                )
              }

              const loadEditorState = () => {
                const prevState = JSON.parse(
                  localStorage.getItem('editorState'),
                )

                if (prevState) {
                  $waveform.scrollTo({ left: prevState.waveFormScroll, top: 0 })
                  $annotationsTextBoxContainer.scrollTo({
                    left: 0,
                    top: prevState.annotationsContainerScroll,
                    behavior: 'smooth',
                  })
                  $cursor.style.left = prevState.cursorPos

                  const sentenceId = prevState.currentHighlightedSentenceId

                  sentenceId &&
                    addSentenceHighlight($annotations[sentenceId - 1])
                  editMode = prevState.inEditMode

                  const prevZoomLevel = prevState.zoomLevel
                  currZoomLevel = zoomLevels.indexOf(prevZoomLevel)

                  popUpInDisplay = prevState.popUpInDisplay

                  if (editMode && $annotations[sentenceId - 1]) {
                    const $currentAnnotationText = $annotations[
                      sentenceId - 1
                    ].getElementsByClassName('annotation-lines')[0]

                    setTimeout(() => $currentAnnotationText.focus(), 0)
                    addSectionHighlight($sentenceSectionBoxes[sentenceId - 1])
                  }

                  localStorage.setItem('loadSavedState', 'false')
                }
              }

              const getEnclosingAnnotationElement = e => {
                const $element = e.target

                const path = e.path || e.composedPath()

                for (const $e of path) {
                  if (Array.from($e.classList).includes('annotation')) {
                    return $e
                  }
                }

                return $element
              }

              const updateSentence = args => {
                const { $sentence, text } = args

                const $textarea = $sentence.getElementsByClassName(
                  'annotation-lines',
                )[0]

                $textarea.innerHTML = text
              }

              const updateCursorOnZoom = prevTime => {
                setTimeout(() => {
                  updateEditorState()
                  setCursorByTime(prevTime)
                }, 50)
              }

              const selectionIsForward = (
                position,
                anchorOffset,
                focusOffset,
              ) => {
                let forward = true
                // position == 0 if nodes are the same
                if (
                  (!position && anchorOffset > focusOffset) ||
                  position === Node.DOCUMENT_POSITION_PRECEDING
                ) {
                  forward = false
                }
                return forward
              }

              const getSelectionBoundry = (
                overlappingNodes,
                segmentWidthsCumm,
                selection,
              ) => {
                const {
                  anchorOffset,
                  focusOffset,
                  anchorNode,
                  focusNode,
                } = selection
                let start = null
                let end = null
                const totalSegments = overlappingNodes.length

                const segment1 = overlappingNodes[0]
                const segmentLast = overlappingNodes[totalSegments - 1]

                const position = anchorNode.compareDocumentPosition(focusNode)

                if (selectionIsForward(position, anchorOffset, focusOffset)) {
                  /*
                                        Selection if from LEFT -> RIGHT
                                    */
                  start = segmentWidthsCumm[segment1] + anchorOffset
                  end = segmentWidthsCumm[segmentLast] + focusOffset
                } else {
                  /*
                                        Selection if from RIGHT -> LEFT
                                    */
                  start = segmentWidthsCumm[segment1] + focusOffset
                  end = segmentWidthsCumm[segmentLast] + anchorOffset
                }

                return { start, end }
              }

              const extractTextFromHTML = html => {
                const $span = document.createElement('span')
                $span.innerHTML = html
                return $span.textContent || $span.innerText
              }

              const highlight = data => {
                const { selection, html, sentenceId, sentanceChannel } = data

                const $annotation = document.getElementById(
                  `annotation-${sentenceId}-${sentanceChannel}`,
                )
                const $annotationTextBox = $annotation.getElementsByClassName(
                  'annotation-lines',
                )[0]
                const segmentWidths = []
                const overlappingNodes = []
                const childNodes = Array.from($annotationTextBox.childNodes)
                const highlights = []

                for (const idx in childNodes) {
                  /*
                                        Will either be of type #text or MARK
                                    */
                  if (childNodes[idx].nodeName === '#text') {
                    segmentWidths.push(childNodes[idx].length)
                  } else {
                    segmentWidths.push(childNodes[idx].textContent.length)
                  }

                  /*
                                        Check childNodes fall under the selection
                                    */
                  if (selection.containsNode(childNodes[idx], true)) {
                    overlappingNodes.push(parseInt(idx))
                  }
                }

                const segmentWidthsCumm = [0]

                for (let i = 0; i < childNodes.length; i++) {
                  segmentWidthsCumm.push(
                    segmentWidthsCumm[i] + segmentWidths[i],
                  )
                }

                /*
                                    Store the start and end points of existing highlights
                                */
                for (let idx = 0; idx < childNodes.length; idx++) {
                  if (childNodes[idx].nodeName === 'MARK') {
                    highlights.push({
                      start: segmentWidthsCumm[idx],
                      end: segmentWidthsCumm[idx + 1],
                    })
                  }
                }

                let { start, end } = getSelectionBoundry(
                  overlappingNodes,
                  segmentWidthsCumm,
                  selection,
                )

                const MARKER_HTML_FULL =
                  '<mark class="selection-highlight"></mark>'
                const MARKER_HTML_OPEN = '<mark class="selection-highlight">'
                const MARKER_HTML_CLOSE = '</mark>'

                let markersBeforeStart = 0
                let markersBeforeEnd = 0
                let partialStart = null
                let partialEnd = null
                const markersOverlap = []
                const insideHighlight = []

                for (const highlight of highlights) {
                  if (start <= highlight.start && end >= highlight.end) {
                    markersOverlap.push(highlight)
                  }
                  if (start >= highlight.end) {
                    markersBeforeStart++
                  }
                  if (end >= highlight.end) {
                    markersBeforeEnd++
                  }
                  if (
                    start > highlight.start &&
                    start < highlight.end &&
                    end > highlight.end
                  ) {
                    // start is partially in a marked node
                    partialStart = highlight.start
                  }
                  if (
                    end > highlight.start &&
                    end < highlight.end &&
                    start < highlight.start
                  ) {
                    // end is partially in a marked node
                    partialEnd = highlight.end
                  }
                  if (start >= highlight.start && end <= highlight.end) {
                    insideHighlight.push(highlight)
                  }
                }

                /*
                                    Need to find the start and end indexes in the html string
                                    in order to add the highlighted the currently selected portion
                                    accordingly.

                                    We shall use :
                                        OFFSET_START = markersBeforeStart * MARKER_HTML_FULL.length
                                        OFFSET_END = markersBeforeEnd * MARKER_HTML_FULL.length

                                        as MARKER_HTML.length is the extra characters in HTML string.
                                */

                const OFFSET_START =
                  markersBeforeStart * MARKER_HTML_FULL.length
                let OFFSET_END = markersBeforeEnd * MARKER_HTML_FULL.length

                if (partialStart) {
                  start = partialStart
                }
                if (partialEnd) {
                  end = partialEnd
                  OFFSET_END += MARKER_HTML_FULL.length
                }

                start += OFFSET_START
                end += OFFSET_END

                if (insideHighlight.length > 0) {
                  /*
                                        If the selected portion is inside a already highlighted
                                        portion if shall remove it.
                                    */
                  let markerStart = insideHighlight[0].start
                  let markerEnd = insideHighlight[0].end

                  markerStart += OFFSET_START
                  markerEnd += OFFSET_END + MARKER_HTML_FULL.length

                  start += MARKER_HTML_OPEN.length
                  end += MARKER_HTML_OPEN.length

                  const left = html.slice(0, markerStart)
                  const right = html.slice(markerEnd)

                  let leftMarker =
                    html.slice(markerStart, start) + MARKER_HTML_CLOSE

                  let rightMarker =
                    MARKER_HTML_OPEN + html.slice(end, markerEnd)

                  if (leftMarker.length <= MARKER_HTML_FULL.length)
                    leftMarker = ''
                  if (rightMarker.length <= MARKER_HTML_FULL.length)
                    rightMarker = ''

                  const plainText = html.slice(start, end)

                  $annotationTextBox.innerHTML = `${left}${leftMarker}${plainText}${rightMarker}${right}`
                } else {
                  const plainText = extractTextFromHTML(html.slice(start, end))
                  const left = html.slice(0, start)
                  const right = html.slice(end)

                  $annotationTextBox.innerHTML = `${left}<mark class="selection-highlight">${plainText}</mark>${right}`
                }
              }

              const adjustPlayBackToRate = () => {
                ee.emit('pause')

                const STORED_SECTION_TIMER = parseInt(
                  localStorage.getItem('SECTION_TIMER_ID'),
                )
                clearTimeout(STORED_SECTION_TIMER)
                localStorage.removeItem('SECTION_TIMER_ID')

                const cursorPos = getTimeAtCursorPosition()
                const rate = parseFloat(localStorage.getItem('playbackRate'))
                const $currentHighlighted = getCurrentHighlightedElement()
                let { startTime, endTime } = getSentenceInfo(
                  $currentHighlighted,
                )

                startTime = Math.max(startTime, cursorPos)

                resetCursorAfterPlayback($currentHighlighted, startTime)

                ee.emit('play', startTime, endTime, rate)
                nextPlayMode = 'pause'
              }

              /*
                                Playlist initialization method calls
                                and calculations done here
                            */
              constructAnnotationsContainer()
              buildAnnotationHeights()
              updateMaxSpeakerWidth()
              calcSentenceScrollEndPoints() // init scroll points
              localStorage.getItem('loadSavedState') === 'true' &&
                loadEditorState() // load prev state from localStorage

              /*
                                Events
                            */
              $zoomIn.addEventListener('click', e => {
                ee.emit('zoomin')
                if (currZoomLevel === zoomLevels.length - 1) {
                  dispatch(
                    releaseToast({
                      content: 'Maximum zoom level reached!',
                      appearance: 'error',
                      autoDismissTimeout: 3000,
                    }),
                  )
                } else {
                  currZoomLevel = Math.min(
                    zoomLevels.length - 1,
                    currZoomLevel + 1,
                  )
                  const prevTime = getTimeAtCursorPosition()

                  SAMPLES_PER_PIXEL = 1800 - zoomLevels[currZoomLevel]

                  updateCursorOnZoom(prevTime)
                }
              })

              $zoomOut.addEventListener('click', e => {
                ee.emit('zoomout')
                if (currZoomLevel === 0) {
                  dispatch(
                    releaseToast({
                      content: 'Minimum zoom level reached!',
                      appearance: 'error',
                      autoDismissTimeout: 3000,
                    }),
                  )
                } else {
                  currZoomLevel = Math.max(0, currZoomLevel - 1)
                  const prevTime = getTimeAtCursorPosition()

                  SAMPLES_PER_PIXEL = 1800 - zoomLevels[currZoomLevel]

                  updateCursorOnZoom(prevTime)
                }
              })

              for (const $annotationTextBox of $annotationsTextBoxes) {
                /*
                                    Play audio when focused into edit mode
                                    on a sentence

                                    CTRL + p
                                */
                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.ctrlKey && e.keyCode === 80) {
                    e.preventDefault()

                    cueTrack()

                    updateEditorState()
                  }
                })

                /*
                                    Restart audio play when focused into edit mode
                                    on a sentence

                                    CTRL + b
                                */
                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.keyCode === 9) {
                    e.preventDefault()

                    restart()

                    updateEditorState()
                  }
                })

                /*
                                    Plus 0.1s to track

                                    CTRL + plus
                                */
                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.ctrlKey && e.keyCode === 187) {
                    e.preventDefault()

                    moveCursor(0.1)

                    updateEditorState()
                  }
                })

                /*
                                    Minus 0.1s to track

                                    CTRL + minus
                                */
                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.ctrlKey && e.keyCode === 189) {
                    e.preventDefault()

                    moveCursor(-0.1)

                    updateEditorState()
                  }
                })

                /*
                                    Prevent page refresh on ctrl+r and command+r
                                */
                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.ctrlKey && e.keyCode === 82) {
                    // ctrl + r
                    e.preventDefault()
                  }
                })

                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.metaKey && e.keyCode === 82) {
                    // command + r
                    e.preventDefault()
                  }
                })

                /*
                                    Press ENTER to move out of focus
                                    after editing sentence
                                */
                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.keyCode === 13) {
                    e.preventDefault()

                    const $currentHighlighted = getCurrentHighlightedElement()
                    const $currentAnnotationText = $currentHighlighted.getElementsByClassName(
                      'annotation-lines',
                    )[0]

                    $currentHighlighted.classList.remove('current-editing')

                    const { sentenceId } = getSentenceInfo($currentHighlighted)

                    editMode = false

                    if (nextPlayMode === 'pause') {
                      /*
                                                If users exits editMode when track is playing
                                            */
                      const stopTime = getTimeAtCursorPosition()
                      const rate = parseFloat(
                        localStorage.getItem('playbackRate'),
                      )

                      const SECTION_TIMER_ID = localStorage.getItem(
                        'SECTION_TIMER_ID',
                      )

                      if (SECTION_TIMER_ID) {
                        clearTimeout(SECTION_TIMER_ID)
                      }

                      ee.emit('pause')
                      ee.emit('play', stopTime, Infinity, rate)
                    }

                    removeAllSectionHighlights()

                    $currentAnnotationText.blur()
                    addSentenceHighlight($currentHighlighted)

                    const LEN = $sentenceSectionBoxes.length
                    const cursorLeft = parseInt($cursor.style.left)
                    const startPoint =
                      parseInt(
                        $sentenceSectionBoxes[sentenceId - 1].style.left,
                      ) + $waveform.scrollLeft

                    const endPoint =
                      parseInt(sentenceId) === LEN
                        ? startPoint +
                          parseInt(
                            $sentenceSectionBoxes[sentenceId - 1].style.width,
                          )
                        : parseInt(
                            $sentenceSectionBoxes[sentenceId].style.left,
                          ) + $waveform.scrollLeft

                    setTimeout(() => {
                      if (cursorLeft > startPoint && cursorLeft < endPoint) {
                        setCursorByLeft(cursorLeft)
                      } else {
                        setCursorByLeft(startPoint)
                      }
                      updateEditorState()
                    }, 20)
                  }
                })

                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.ctrlKey && e.key === '.') {
                    e.preventDefault()
                    /*
                                            `ctrl + >` for speed increase of 0.1
                                        */
                    props.callbacks.changeTrackMode(
                      'changePlaybackRate',
                      { diff: PLAY_BACK_RATE_OFFSET },
                      ee,
                    )

                    if (nextPlayMode === 'pause') {
                      /*
                                                User adjusts speed when track is playing
                                            */
                      adjustPlayBackToRate()
                    }
                  }
                })

                $annotationTextBox.addEventListener('keydown', e => {
                  if (e.ctrlKey && e.key === ',') {
                    e.preventDefault()
                    /*
                                            `ctrl + <` for speed decrease of 0.1
                                        */
                    props.callbacks.changeTrackMode(
                      'changePlaybackRate',
                      { diff: -PLAY_BACK_RATE_OFFSET },
                      ee,
                    )

                    if (nextPlayMode === 'pause') {
                      /*
                                                User adjusts speed when track is playing
                                            */
                      adjustPlayBackToRate()
                    }
                  }
                })

                $annotationTextBox.addEventListener('keydown', e => {
                  /*
                                        Handle selection and highlighting
                                    */
                  if (e.ctrlKey && e.key === 'm') {
                    e.preventDefault()

                    const selection = document.getSelection()

                    if (!selection.isCollapse) {
                      // not an empty selection
                      const html = e.target.innerHTML
                      const path = e.path || e.composedPath()
                      const [_, sentenceId, sentanceChannel] = path[1].id.split(
                        '-',
                      )

                      const data = {
                        selection,
                        html,
                        sentenceId,
                        sentanceChannel,
                      }

                      highlight(data)
                    }
                  }
                })

                /*
                                    Click to select sentence and scroll to
                                    corresponding section on the waveform
                                */
                $annotationTextBox.addEventListener('click', e => {
                  const $currentClickedSentence = getEnclosingAnnotationElement(
                    e,
                  )

                  if (
                    !Array.from($currentClickedSentence.classList).includes(
                      'current',
                    )
                  ) {
                    ee.emit('stop')

                    props.callbacks.changeTrackMode('pause', null, ee)

                    nextPlayMode = 'play'
                    editMode = true

                    removeAllHighlights()

                    const $lockIcon = $currentClickedSentence.getElementsByClassName(
                      'fa-lock',
                    )[0]

                    if ($lockIcon.style.display === 'none') {
                      const { sentenceId } = getSentenceInfo(
                        $currentClickedSentence,
                      )

                      $currentClickedSentence.classList.add('current-editing')
                      $currentClickedSentence.classList.remove('current-hover')

                      currentHighlightedSentence = sentenceId - 1

                      const LEN = $sentenceSectionBoxes.length
                      const cursorLeft = parseInt($cursor.style.left)
                      const startPoint =
                        parseInt(
                          $sentenceSectionBoxes[sentenceId - 1].style.left,
                        ) + $waveform.scrollLeft

                      const endPoint =
                        parseInt(sentenceId) === LEN
                          ? startPoint +
                            parseInt(
                              $sentenceSectionBoxes[sentenceId - 1].style.width,
                            )
                          : parseInt(
                              $sentenceSectionBoxes[sentenceId].style.left,
                            ) + $waveform.scrollLeft

                      scrollToSection(sentenceId)

                      setTimeout(() => {
                        if (cursorLeft > startPoint && cursorLeft < endPoint) {
                          setCursorByLeft(cursorLeft)
                        } else {
                          setCursorByLeft(startPoint)
                        }
                        updateEditorState()
                      }, 20)
                    } else {
                      $annotationTextBox.blur()
                      dispatch(
                        releaseToast({
                          content:
                            'Sentence in respeak, unlock sentence first, edits maybe overwritten by respeak!',
                          appearance: 'warning',
                          autoDismissTimeout: 6000,
                        }),
                      )
                    }
                  }
                })

                $annotationTextBox.addEventListener('blur', e => {
                  editMode = false

                  if (nextPlayMode === 'pause') {
                    /*
                                            If users exits editMode when track is playing
                                        */
                    const stopTime = getTimeAtCursorPosition()
                    const rate = parseFloat(
                      localStorage.getItem('playbackRate'),
                    )

                    const SECTION_TIMER_ID = localStorage.getItem(
                      'SECTION_TIMER_ID',
                    )

                    if (SECTION_TIMER_ID) {
                      clearTimeout(SECTION_TIMER_ID)
                    }

                    ee.emit('pause')
                    ee.emit('play', stopTime, Infinity, rate)
                  }

                  removeAllSectionHighlights()
                  updateAnnotations()
                  calcSentenceScrollEndPoints()
                })

                $annotationTextBox.addEventListener('keyup', e => {
                  resizeAnnotation($annotationTextBox)
                })
              }

              for (const $annotation of $annotations) {
                const $lockIcon = $annotation.getElementsByClassName(
                  'fa-lock',
                )[0]
                $annotation.addEventListener('mouseover', e => {
                  const $element = getEnclosingAnnotationElement(e)

                  if ($lockIcon.style.display === 'none') {
                    if (
                      !Array.from($element.classList).includes(
                        'current-selected',
                      )
                    ) {
                      $element.classList.add('current-hover')
                    }

                    const $deleteIcon = $element.getElementsByClassName(
                      'fa-times',
                    )[0]
                    $deleteIcon.style.display = 'block'

                    const $revertIcon = $element.getElementsByClassName(
                      'fa-history',
                    )[0]
                    $revertIcon.style.display = 'block'
                  }
                })

                $annotation.addEventListener('mouseout', e => {
                  const $element = getEnclosingAnnotationElement(e)

                  $element.classList.remove('current-hover')

                  const $deleteIcon = $element.getElementsByClassName(
                    'fa-times',
                  )[0]
                  $deleteIcon.style.display = 'none'

                  const $revertIcon = $element.getElementsByClassName(
                    'fa-history',
                  )[0]
                  $revertIcon.style.display = 'none'
                })
              }

              /*
                                Events handling interactions with
                                the section box
                            */
              for (const $sectionBox of $sentenceSectionBoxes) {
                $sectionBox.addEventListener('click', e => {
                  e.preventDefault()

                  nextPlayMode = 'pause'
                  sentenceSectionMode = true

                  removeAllHighlights()
                  const sentenceId = parseInt(e.srcElement.innerText)

                  const $currentElement = $annotations[sentenceId - 1]

                  currentHighlightedSentence = sentenceId - 1

                  if ($currentElement) {
                    const { startTime, endTime } = getSentenceInfo(
                      $currentElement,
                    )
                    const startPoint =
                      parseInt(
                        $sentenceSectionBoxes[sentenceId - 1].style.left,
                      ) + $waveform.scrollLeft
                    const rate = parseFloat(
                      localStorage.getItem('playbackRate'),
                    )

                    const sectionData = {
                      startPoint,
                      sentenceIdx: sentenceId - 1,
                      startTime,
                      endTime,
                    }

                    localStorage.setItem(
                      'section-playing-editor',
                      JSON.stringify(sectionData),
                    )

                    scrollToSentence(sentenceId)
                    scrollToSection(sentenceId)

                    SECTION_TIMER = setTimeout(() => {
                      localStorage.removeItem('section-playing-editor')
                      localStorage.removeItem('SECTION_TIMER_ID')
                      setCursorByLeft(startPoint)
                      addSentenceHighlight($currentElement)
                      removeSectionHighlight(
                        $sentenceSectionBoxes[sentenceId - 1],
                      )
                      props.callbacks.changeTrackMode('pause', null, ee) // change to play button on editor controls
                      nextPlayMode = 'play'
                    }, ((endTime - startTime + 0.1) * 1000) / rate)

                    localStorage.setItem('SECTION_TIMER_ID', SECTION_TIMER)

                    props.callbacks.changeTrackMode('play', null, ee) // change to pause button on editor controls
                  }

                  updateEditorState()
                })

                /*
                                    When user only changes section times without ever
                                    going to any sentence
                                */
                $sectionBox.addEventListener('dragend', e => {
                  let $currentHighlighted = getCurrentHighlightedElement()

                  if ($currentHighlighted === null) {
                    const path = e.path || e.composedPath()
                    const sentenceId = parseInt(path[1].getAttribute('data-id'))
                    $currentHighlighted = $annotations[sentenceId - 1]

                    save($currentHighlighted)
                      .then(res => {
                        setTimeout(() => dispatch(toggleSaveMode(false)), 1000)
                      })
                      .catch(err => {
                        if (err.response && 'message' in err.response.data) {
                          dispatch(
                            releaseToast({
                              content:
                                err.response.data.message +
                                ' Try, refreshing your page!',
                              appearance: 'error',
                              autoDismissTimeout: 3000,
                            }),
                          )
                        } else {
                          dispatch(
                            releaseToast({
                              content:
                                "Couldn't save segment times, please refresh page and try again!",
                              appearance: 'error',
                              autoDismissTimeout: 3000,
                            }),
                          )
                        }
                      })
                  }
                })
              }

              /*
                                Handling sentence Revert backs to
                                previous version
                            */
              for (const $eachRevertIcon of $setenceRevertIcons) {
                $eachRevertIcon.addEventListener('click', e => {
                  const path = e.path || e.composedPath()
                  const $sentence = path[2]
                  const { sentenceId } = getSentenceInfo($sentence)

                  if (
                    !Array.from($eachRevertIcon.classList).includes('disable')
                  ) {
                    const sentence_id = props.notes.filter(
                      each => each.id === sentenceId,
                    )[0].sentenceId

                    dataProvider.speech.transcripts
                      .create('revert', {
                        id: props._id,
                        options: {
                          data: {
                            sentenceId: sentence_id,
                          },
                        },
                      })
                      .then(res => {
                        /*
                                                1. Update sentence text on UI
                                                2. add class that disables click on revert icon
                                                3. add .flash class for highlight on successful revert
                                            */

                        updateSentence({
                          $sentence,
                          text: res.data.sentence.text,
                        })

                        $eachRevertIcon.classList.add('disable')
                        $sentence.classList.add('flash')

                        setTimeout(() => {
                          $sentence.classList.remove('flash')
                        }, 1500)
                      })
                      .catch(err => {
                        if (err.response && 'message' in err.response.data) {
                          dispatch(
                            releaseToast({
                              content:
                                err.response.data.message +
                                ' Try, refreshing your page!',
                              appearance: 'error',
                              autoDismissTimeout: 3000,
                            }),
                          )
                        } else {
                          dispatch(
                            releaseToast({
                              content:
                                'Revert back failed, please refresh page and try again!',
                              appearance: 'error',
                              autoDismissTimeout: 3000,
                            }),
                          )
                        }
                      })
                  } else {
                    dispatch(
                      releaseToast({
                        id: sentenceId,
                        content: 'No previously found edits to revert back to!',
                        appearance: 'warning',
                        autoDismissTimeout: 3000,
                      }),
                    )
                  }
                })
              }

              /*
                                Handling unlocking
                            */
              for (const $lockIcon of $lockIcons) {
                $lockIcon.addEventListener('click', e => {
                  const path = e.path || e.composedPath()
                  const $sentence = path[2]

                  // maybe first display a pop-up ?
                  $lockIcon.style.display = 'none'
                  $sentence.style.cursor = 'pointer'

                  const $textarea = $sentence.querySelector('.annotation-lines')
                  $textarea.style.cursor = 'auto'

                  const $unLockIcon = $sentence.getElementsByClassName(
                    'fa-unlock',
                  )[0]
                  $unLockIcon.style.display = 'block'
                })
              }

              /*
                                Handling locking
                            */
              for (const $unLockIcon of $unLockIcons) {
                $unLockIcon.addEventListener('click', e => {
                  const path = e.path || e.composedPath()
                  const $sentence = path[2]

                  // maybe first display a pop-up
                  $unLockIcon.style.display = 'none'
                  $sentence.style.cursor = 'not-allowed'

                  const $textarea = $sentence.querySelector('.annotation-lines')
                  $textarea.style.cursor = 'not-allowed'

                  const $lockIcon = $sentence.getElementsByClassName(
                    'fa-lock',
                  )[0]
                  $lockIcon.style.display = 'block'
                })
              }

              /*
                                Handling Speaker name change
                            */

              const sentencesForTagging = new Set()

              const updateSpeakerName = (_id, name) => {
                const $speakerBox = document.getElementById(
                  `speaker-name-${_id}`,
                )
                $speakerBox.textContent = `${name}`
              }

              const updateSpeakerMap = (
                oldSpeakerName,
                newSpeakerName,
                sentences,
                all = false,
              ) => {
                let oldSpeakerSentences = speakerMap.get(oldSpeakerName)
                let newSpeakerSentences = speakerMap.get(newSpeakerName)

                if (all) {
                  /*
                                        Add those _id's in `oldSpeakerSentences` to `newSpeakerSentences`
                                    */
                  if (newSpeakerSentences) {
                    newSpeakerSentences = [
                      ...newSpeakerSentences,
                      ...oldSpeakerSentences,
                    ]
                  } else {
                    newSpeakerSentences = oldSpeakerSentences
                  }

                  newSpeakerSentences.sort(
                    (a, b) => parseInt(a.sentenceIdx) - parseInt(b.sentenceIdx),
                  )

                  speakerMap.delete(oldSpeakerName)
                  speakerMap.set(newSpeakerName, newSpeakerSentences)
                } else {
                  sentences = sentences.map(({ _id }) => _id)

                  /*
                                        Remove _id's from `oldSpeakerSentences` belonging in `sentences`
                                    */
                  oldSpeakerSentences = oldSpeakerSentences.filter(sentence => {
                    return !sentences.includes(sentence._id)
                  })

                  oldSpeakerSentences.sort(
                    (a, b) => parseInt(a.sentenceIdx) - parseInt(b.sentenceIdx),
                  )

                  if (oldSpeakerSentences.length > 0) {
                    speakerMap.set(oldSpeakerName, oldSpeakerSentences)
                  } else {
                    speakerMap.delete(oldSpeakerName)
                  }

                  /*
                                        Add those _id's in `sentences` to `newSpeakerSentences`
                                    */

                  // eslint-disable-next-line
                  sentences = sentences.map(_id => {
                    if (sentenceMap.has(_id)) {
                      return {
                        _id,
                        sentenceIdx: sentenceMap.get(_id),
                      }
                    }
                  })

                  if (newSpeakerSentences) {
                    newSpeakerSentences = [...newSpeakerSentences, ...sentences]
                  } else {
                    newSpeakerSentences = sentences
                  }

                  newSpeakerSentences.sort(
                    (a, b) => parseInt(a.sentenceIdx) - parseInt(b.sentenceIdx),
                  )

                  speakerMap.set(newSpeakerName, newSpeakerSentences)
                }
              }

              const removeTaggingOptions = () => {
                const $speakerContainer = document.getElementsByClassName(
                  'speaker-container',
                )[0]
                document.body.removeChild($speakerContainer)

                popUpOpenForSentenceId = -1
                speakerPopUpInDisplay = false

                sentencesForTagging.clear()
              }

              const displayTaggingOptions = (x, y, speaker, currSentenceId) => {
                x = parseFloat(x)
                y = parseFloat(y)

                /*
                                    HTML GENERATED BELOW FOR SPEAKER POP-UP :

                                    <div className="speaker-container">
                                        <div className="sentence-list-container">
                                            <ul className="sentence-list">
                                                <li className="sentence-list-item"></li>
                                                ...
                                            </ul>
                                        </div>
                                        <div className="tagging-container">
                                            <div className="tag-input-container">
                                                <input className="tag-input" value={speaker} />
                                            </div>
                                            <div className="tag-btn-container">
                                                <button className="tag-btn">Tag</button>
                                            </div>
                                            <div className="tag-all-btn-container">
                                                <button className="tag-all-btn">Tag All</button>
                                            </div>
                                        </div>
                                    </div>
                                */
                const $speakerContainer = buildElement(
                  'div',
                  'speaker-container',
                )

                // 250 -> height of speaker-container
                $speakerContainer.style.top = y - 250 - 10 + 'px'
                $speakerContainer.style.left = x + 5 + 'px'

                const $sentenceListContainer = buildElement(
                  'div',
                  'sentence-list-container',
                )
                const $sentenceList = buildElement('ul', 'sentence-list')

                const $listFragment = document.createDocumentFragment()

                const listOfSentences = speakerMap.get(speaker)

                for (const sentence of listOfSentences) {
                  const $sentenceListItem = buildElement(
                    'li',
                    'sentence-list-item',
                    sentence._id,
                  )
                  $sentenceListItem.textContent = `Sentence ${sentence.sentenceIdx}`
                  $sentenceListItem.setAttribute('title', 'click to select')

                  $sentenceListItem.onclick = e => {
                    const $e = e.target

                    if (sentencesForTagging.has($e.id)) {
                      sentencesForTagging.delete($e.id)
                      $e.classList.remove('tag-selected')

                      $e.setAttribute('title', 'click to select')
                    } else {
                      sentencesForTagging.add($e.id)
                      $e.classList.add('tag-selected')

                      $e.setAttribute('title', 'click to unselect')
                    }
                  }

                  $listFragment.appendChild($sentenceListItem)
                }

                $sentenceList.appendChild($listFragment)
                $sentenceListContainer.appendChild($sentenceList)

                const $taggingContainer = buildElement(
                  'div',
                  'tagging-container',
                )

                const $tagInputContainer = buildElement(
                  'div',
                  'tag-input-container',
                )
                const $tagInput = buildElement('input', 'tag-input')
                $tagInput.value = `${speaker}`

                $tagInputContainer.appendChild($tagInput)

                const $tagBtnContainer = buildElement(
                  'div',
                  'tag-btn-container',
                )
                const $tagBtn = buildElement('button', 'tag-btn')
                $tagBtn.textContent = 'Tag'

                $tagBtn.onclick = e => {
                  const sentencesToTag = []
                  if (sentencesForTagging.size === 0) {
                    // tag current sentence only
                    sentencesToTag.push(popUpOpenForSentenceId)
                  } else {
                    // tag all sentences in the set `sentencesForTagging`
                    for (const _id of sentencesForTagging) {
                      sentencesToTag.push(_id)
                    }
                  }

                  const newSpeakerName = document.getElementsByClassName(
                    'tag-input',
                  )[0].value

                  // POST req to server
                  const sentenceData = sentencesToTag.map(_id => {
                    return {
                      _id,
                      newSpeaker: newSpeakerName,
                    }
                  })

                  dataProvider.speech.transcripts
                    .create('tag-speaker', {
                      id: props._id, // speech_id
                      options: {
                        data: {
                          sentences: sentenceData,
                        },
                      },
                    })
                    .then(res => {
                      const { success, failed } = res.data
                      if (failed.length === 0 && success.length > 0) {
                        const newSpeakerName = success[0].newSpeaker
                        const oldSpeakerName = speaker

                        for (const { _id, newSpeaker } of success) {
                          updateSpeakerName(_id, newSpeaker)
                        }

                        updateMaxSpeakerWidth()

                        // modify values in speakerMap
                        updateSpeakerMap(
                          oldSpeakerName,
                          newSpeakerName,
                          success,
                        )

                        removeTaggingOptions()
                      } else {
                        dispatch(
                          releaseToast({
                            content:
                              'Certain Sentences failed to change speaker name!',
                            appearance: 'error',
                            autoDismissTimeout: 5000,
                          }),
                        )
                      }
                    })
                    .catch(err => {
                      if (err.response && 'message' in err.response.data) {
                        dispatch(
                          releaseToast({
                            content:
                              err.response.data.message +
                              ' Try, refreshing your page!',
                            appearance: 'error',
                            autoDismissTimeout: 3000,
                          }),
                        )
                      } else {
                        dispatch(
                          releaseToast({
                            content:
                              "Couldn't update speaker tag, please refresh your page and try again!",
                            appearance: 'error',
                            autoDismissTimeout: 3000,
                          }),
                        )
                      }
                    })
                }

                $tagBtnContainer.appendChild($tagBtn)

                const $tagAllBtnContainer = buildElement(
                  'div',
                  'tag-all-btn-container',
                )
                const $tagAllBtn = buildElement('button', 'tag-all-btn')
                $tagAllBtn.textContent = 'Tag All'

                $tagAllBtn.onclick = e => {
                  const sentencesToTag = []
                  const listOfSentences = speakerMap.get(speaker)

                  for (const sentence of listOfSentences) {
                    sentencesToTag.push(sentence._id)
                  }

                  const newSpeakerName = document.getElementsByClassName(
                    'tag-input',
                  )[0].value

                  // POST req to server

                  dataProvider.speech.transcripts
                    .create('tag-speaker', {
                      id: props._id, // speech_id
                      options: {
                        data: {
                          sentences: [
                            {
                              oldSpeaker: speaker,
                              newSpeaker: newSpeakerName,
                            },
                          ],
                        },
                      },
                    })
                    .then(res => {
                      const { success, failed } = res.data
                      if (failed.length === 0 && success.length > 0) {
                        const newSpeakerName = success[0].newSpeaker
                        const oldSpeakerName = success[0].oldSpeaker

                        // modify speaker names on UI
                        for (const sentence of listOfSentences) {
                          updateSpeakerName(sentence._id, newSpeakerName)
                        }

                        updateMaxSpeakerWidth()

                        // modify values in speakerMap
                        updateSpeakerMap(
                          oldSpeakerName,
                          newSpeakerName,
                          success,
                          true,
                        )

                        removeTaggingOptions()
                      } else {
                        dispatch(
                          releaseToast({
                            content:
                              'Certain Sentences failed to change speaker name!',
                            appearance: 'error',
                            autoDismissTimeout: 5000,
                          }),
                        )
                      }
                    })
                    .catch(err => {
                      if (err.response && 'message' in err.response.data) {
                        dispatch(
                          releaseToast({
                            content:
                              err.response.data.message +
                              ' Try, refreshing your page!',
                            appearance: 'error',
                            autoDismissTimeout: 3000,
                          }),
                        )
                      } else {
                        dispatch(
                          releaseToast({
                            content:
                              'Tag all failed to execute, please refresh your page and try again!',
                            appearance: 'error',
                            autoDismissTimeout: 3000,
                          }),
                        )
                      }
                    })
                }

                $tagAllBtnContainer.appendChild($tagAllBtn)

                $taggingContainer.appendChild($tagInputContainer)
                $taggingContainer.appendChild($tagBtnContainer)
                $taggingContainer.appendChild($tagAllBtnContainer)

                $speakerContainer.appendChild($sentenceListContainer)
                $speakerContainer.appendChild($taggingContainer)

                document.body.appendChild($speakerContainer)

                popUpOpenForSentenceId = currSentenceId
                speakerPopUpInDisplay = true
              }

              for (const $speakerBox of $annotationsSpeaker) {
                $speakerBox.addEventListener('click', e => {
                  const { x, y } = $speakerBox.getBoundingClientRect()
                  const speaker = $speakerBox.textContent
                  const currSentenceId = $speakerBox.id.split('-')[2] // speaker-name-<currSentenceId>

                  if (popUpOpenForSentenceId === -1) {
                    !speakerPopUpInDisplay &&
                      displayTaggingOptions(x, y, speaker, currSentenceId)
                  } else {
                    if (popUpOpenForSentenceId === currSentenceId) {
                      removeTaggingOptions()
                    } else {
                      removeTaggingOptions()
                      !speakerPopUpInDisplay &&
                        displayTaggingOptions(x, y, speaker, currSentenceId)
                    }
                  }
                })
              }

              /*
                                Handling delete sentence
                            */
              const undoQueue = []
              const undoSet = new Set()

              for (const $sentenceDeleteCross of $sentenceDeleteCrosses) {
                $sentenceDeleteCross.addEventListener('click', e => {
                  const path = e.path || e.composedPath()
                  const $sentence = path[2]
                  const UNDO_TIME = 5000
                  const { sentenceId } = getSentenceInfo($sentence)
                  const sentence_id = props.notes.filter(
                    each => each.id === sentenceId,
                  )[0].sentenceId
                  const speaker = document.getElementById(
                    `speaker-name-${sentence_id}`,
                  ).textContent

                  /*
                                        delete() and add toast saying ctrl + z to undo
                                    */

                  const $sentencesContainer = path[3]

                  const $sentenceSectionBox = $annotationsBoxesDiv.querySelector(
                    `div[data-id='${sentenceId}']`,
                  )

                  removeSentenceHighlight($sentence)

                  /*
                                        As sentence got deleted, if the current sentence is below
                                        current deleted index reduces by 1
                                    */
                  if (currentHighlightedSentence >= sentenceId - 1) {
                    currentHighlightedSentence -= 1
                  }

                  $sentencesContainer.removeChild($sentence)
                  $sentenceSectionBox.style.display = 'none'

                  updateAnnotations()
                  calcSentenceScrollEndPoints()

                  dispatch(
                    releaseToast({
                      id: sentenceId,
                      content: 'Press CTRL + Z to undo delete',
                      appearance: 'info',
                      autoDismissTimeout: UNDO_TIME,
                    }),
                  )

                  const undoTimeout = setTimeout(() => {
                    dataProvider.speech.transcripts
                      .create('delete', {
                        id: props._id,
                        options: {
                          data: {
                            sentences: [sentence_id],
                          },
                        },
                      })
                      .then(res => {
                        if (res.data.success) {
                          if (undoQueue.length > 0) {
                            const { $sentenceSectionBox } = undoQueue.shift()
                            undoSet.delete(sentenceId)

                            $sentenceSectionBox.classList.add('deleted-segment')

                            /*
                                                        Update SentenceMap and SpeakerMap
                                                        accordingly when sentences deleted
                                                        permanently
                                                    */

                            sentenceMap.delete(sentence_id)

                            let listOfSentences = speakerMap.get(speaker)

                            listOfSentences = listOfSentences.filter(
                              ({ _id }) => sentence_id !== _id,
                            )

                            if (listOfSentences.length === 0) {
                              speakerMap.delete(speaker)
                            } else {
                              speakerMap.set(speaker, listOfSentences)
                            }
                          }
                        }
                      })
                      .catch(err => {
                        if (err.response && 'message' in err.response.data) {
                          dispatch(
                            releaseToast({
                              content:
                                err.response.data.message +
                                ' Try, refreshing your page!',
                              appearance: 'error',
                              autoDismissTimeout: 3000,
                            }),
                          )
                        } else {
                          dispatch(
                            releaseToast({
                              content:
                                "Couldn't delete sentence, please refresh your page and try again!",
                              appearance: 'error',
                              autoDismissTimeout: 3000,
                            }),
                          )
                        }
                      })
                  }, UNDO_TIME)

                  undoQueue.push({
                    sentenceId, // just for a quick lookup
                    $sentence,
                    $parent: $sentencesContainer,
                    timer: undoTimeout,
                    $sentenceSectionBox,
                  })

                  undoSet.add(sentenceId)
                })
              }

              // let WAVEFORM_SCROLL_TIMER = null;
              $waveform.addEventListener('scroll', e => {
                e.preventDefault()

                prevScroll = $waveform.scrollLeft

                // popUpInDisplay && removeTimePopUp();

                // clearTimeout(WAVEFORM_SCROLL_TIMER);

                // WAVEFORM_SCROLL_TIMER = setTimeout(() => {
                //     if (popUpInDisplay) {
                //         removeTimePopUp();
                //         showTimePopUp();
                //     }
                // }, 200);
              })

              /*
                                Set point on track to start
                                playing from clicked point on track
                            */
              // $waveformTrack.addEventListener('click', () => {
              //     setTimeout(() => {
              //         $cursor.style.left = $selectionPoint.style.left;

              //         // popUpInDisplay && removeTimePopUp();
              //         // !popUpInDisplay && showTimePopUp();
              //     }, 10);

              //     updateEditorState();
              // });

              /*
                                Set point on track to start
                                playing from clicked point on track
                            */
              $waveformTrack.addEventListener('click', () => {
                setTimeout(() => {
                  $cursor.style.left = $selectionPoint.style.left

                  setTimeout(() => {
                    const inSectionPlayMod = JSON.parse(
                      localStorage.getItem('section-playing-editor'),
                    )

                    if (inSectionPlayMod) {
                      let startTime = 0
                      const sentenceIdx = parseInt(inSectionPlayMod.sentenceIdx)

                      if (localStorage.getItem('cursorPos')) {
                        startTime = parseFloat(
                          localStorage.getItem('cursorPos'),
                        )

                        if (
                          startTime <= inSectionPlayMod.endTime &&
                          startTime > inSectionPlayMod.startTime
                        ) {
                          const OLD_SECTION_TIMER = parseInt(
                            localStorage.getItem('SECTION_TIMER_ID'),
                          )
                          const rate = parseFloat(
                            localStorage.getItem('playbackRate'),
                          )

                          if (OLD_SECTION_TIMER) {
                            clearTimeout(OLD_SECTION_TIMER)
                          }

                          const NEW_SECTION_TIMER = setTimeout(() => {
                            localStorage.removeItem('section-playing-editor')
                            localStorage.removeItem('SECTION_TIMER_ID')
                            props.callbacks.changeTrackMode('pause', null, ee)
                            removeSectionHighlight(
                              $sentenceSectionBoxes[sentenceIdx],
                            )
                            setCursorByLeft(inSectionPlayMod.startPoint)
                          }, ((inSectionPlayMod.endTime - startTime) * 1000 - 500) / rate) // as cursorUpdate took 500ms

                          localStorage.setItem(
                            'SECTION_TIMER_ID',
                            NEW_SECTION_TIMER,
                          )
                        } else {
                          /*
                                                        User placed cursor on some other point
                                                        not in the currently playing segemnt
                                                    */
                          const OLD_SECTION_TIMER = parseInt(
                            localStorage.getItem('SECTION_TIMER_ID'),
                          )

                          if (OLD_SECTION_TIMER) {
                            clearTimeout(OLD_SECTION_TIMER)
                            localStorage.removeItem('SECTION_TIMER_ID')
                          }
                          removeSectionHighlight(
                            $sentenceSectionBoxes[sentenceIdx],
                          )
                        }
                      }
                    }
                  }, 500) // as cursorPos update is every 500ms

                  // popUpInDisplay && removeTimePopUp();
                  // !popUpInDisplay && showTimePopUp();
                }, 10)

                updateEditorState()
              })

              $annotationsTextBoxContainer.addEventListener('scroll', () => {
                calcSentenceScrollEndPoints()

                updateEditorState()
              })

              const $stopBtn = document.getElementsByClassName('btn-stop')[0]
              $stopBtn.addEventListener('click', _ => {
                // removeTimePopUp();

                $waveform.scrollTo({
                  left: 0,
                  top: 0,
                })

                $annotationsTextBoxContainer.scrollTo({
                  left: 0,
                  top: 0,
                  behavior: 'smooth',
                })
              })

              /*
                            Define keyboard shortcuts
                        */
              hotkeys('ctrl+z', (e, _) => {
                e.preventDefault()

                if (undoQueue.length > 0) {
                  const {
                    sentenceId,
                    $sentence,
                    $parent,
                    timer,
                    $sentenceSectionBox,
                  } = undoQueue.shift()
                  undoSet.delete(sentenceId)

                  if (timer !== null) {
                    clearTimeout(timer)

                    const { endTime, sentenceId } = getSentenceInfo($sentence)

                    let flag = true

                    $sentence.classList.add('flash') // add flash higlight on undo

                    if (currentHighlightedSentence >= sentenceId - 1) {
                      currentHighlightedSentence += 1
                    }

                    for (const idx in $annotations) {
                      const id = parseInt(idx)
                      if (!isNaN(id)) {
                        const info = getSentenceInfo($annotations[id])

                        if (info.startTime >= endTime) {
                          $parent.insertBefore($sentence, $parent.children[id])
                          flag = false
                          break
                        }
                      }
                    }
                    if (flag) $parent.appendChild($sentence) // last element was deleted

                    $sentenceSectionBox.style.display = 'block'
                    $sentenceSectionBox.classList.add('flash')

                    setTimeout(() => {
                      $sentence.classList.remove('flash')
                      $sentenceSectionBox.classList.remove('flash')
                    }, 1500)

                    removeToast(sentenceId)
                    updateAnnotations()
                    calcSentenceScrollEndPoints()
                  }
                }
              })

              hotkeys('down', (e, _) => {
                e.preventDefault()
                editMode = false

                const { $prevSentenceNode } = moveDown()

                /*
                                    Call function to save edit here
                                */
                save($prevSentenceNode)
                  .then(resp => {
                    setTimeout(() => dispatch(toggleSaveMode(false)), 1000)
                  })
                  .catch(err => {
                    if (err.response && 'message' in err.response.data) {
                      dispatch(
                        releaseToast({
                          content:
                            err.response.data.message +
                            ' Try, refreshing your page!',
                          appearance: 'error',
                          autoDismissTimeout: 3000,
                        }),
                      )
                    } else {
                      dispatch(
                        releaseToast({
                          content:
                            "Couldn't save changes, please refresh your page and try again!",
                          appearance: 'error',
                          autoDismissTimeout: 3000,
                        }),
                      )
                    }
                  })

                nextPlayMode = 'play'

                updateEditorState()
              })

              hotkeys('up', (e, _) => {
                e.preventDefault()
                editMode = false

                const { $prevSentenceNode } = moveUp()

                /*
                                    Call function to save edit here
                                */
                save($prevSentenceNode)
                  .then(resp => {
                    setTimeout(() => dispatch(toggleSaveMode(false)), 1000)
                  })
                  .catch(err => {
                    if (err.response && 'message' in err.response.data) {
                      dispatch(
                        releaseToast({
                          content:
                            err.response.data.message +
                            ' Try, refreshing your page!',
                          appearance: 'error',
                          autoDismissTimeout: 3000,
                        }),
                      )
                    } else {
                      dispatch(
                        releaseToast({
                          content:
                            "Couldn't save changes, please refresh your page and try again!",
                          appearance: 'error',
                          autoDismissTimeout: 3000,
                        }),
                      )
                    }
                  })

                nextPlayMode = 'play'

                updateEditorState()
              })

              hotkeys('enter', (e, _) => {
                e.preventDefault()

                let $currentHighlighted = getCurrentHighlightedElement()

                if (!$currentHighlighted)
                  $currentHighlighted = $annotations[sentenceIdOnCursor]

                if ($currentHighlighted) {
                  const { sentenceId, startTime } = getSentenceInfo(
                    $currentHighlighted,
                  )
                  const cursorPosTime = getTimeAtCursorPosition()

                  currentHighlightedSentence = sentenceId - 1

                  const $lockIcon = $currentHighlighted.getElementsByClassName(
                    'fa-lock',
                  )[0]

                  if ($lockIcon.style.display === 'none') {
                    editMode = true

                    if (nextPlayMode === 'pause') {
                      if (sentenceSectionMode) {
                        sentenceSectionMode = false
                        localStorage.removeItem('section-playing-editor')
                      }
                      adjustPlayBackToRate()
                    }

                    const $currentAnnotationText = $currentHighlighted.getElementsByClassName(
                      'annotation-lines',
                    )[0]

                    $currentHighlighted.classList.remove('current-selected')
                    $currentHighlighted.classList.add('current-editing')

                    if (
                      !(
                        nextPlayMode === 'pause' &&
                        cursorPosTime - startTime > 0.1
                      )
                    ) {
                      ee.emit('stop')

                      props.callbacks.changeTrackMode('pause', null, ee)

                      nextPlayMode = 'play'

                      const LEN = $sentenceSectionBoxes.length
                      const cursorLeft = parseInt($cursor.style.left)
                      const startPoint =
                        parseInt(
                          $sentenceSectionBoxes[sentenceId - 1].style.left,
                        ) + $waveform.scrollLeft

                      const endPoint =
                        parseInt(sentenceId) === LEN
                          ? startPoint +
                            parseInt(
                              $sentenceSectionBoxes[sentenceId - 1].style.width,
                            )
                          : parseInt(
                              $sentenceSectionBoxes[sentenceId].style.left,
                            ) + $waveform.scrollLeft

                      setTimeout(() => {
                        if (cursorLeft > startPoint && cursorLeft < endPoint) {
                          setCursorByLeft(cursorLeft)
                        } else {
                          setCursorByLeft(startPoint)
                        }
                      }, 20)
                    }

                    scrollToSection(sentenceId)

                    /* Reason for timeout: https://stackoverflow.com/questions/15859113/focus-not-working */
                    setTimeout(() => $currentAnnotationText.focus(), 0)
                  } else {
                    dispatch(
                      releaseToast({
                        content:
                          'Sentence in respeak, unlock sentence first, edits maybe overwritten by respeak!',
                        appearance: 'warning',
                        autoDismissTimeout: 6000,
                      }),
                    )
                  }
                }

                updateEditorState()
              })

              hotkeys('ctrl+p', (e, _) => {
                e.preventDefault()

                cueTrack()

                updateEditorState()
              })

              hotkeys('tab', (e, _) => {
                e.preventDefault()
              })

              /*
                                Block refresh commands of the browser
                            */
              hotkeys('command+r', (e, _) => {
                e.preventDefault()
                dispatch(
                  releaseToast({
                    content:
                      'Refresh is disabled, use your browser button to refresh!',
                    appearance: 'warning',
                    autoDismissTimeout: 5000,
                  }),
                )
              })

              hotkeys('ctrl+r', (e, _) => {
                e.preventDefault()
                dispatch(
                  releaseToast({
                    content:
                      'Refresh is disabled, use your browser button to refresh!',
                    appearance: 'warning',
                    autoDismissTimeout: 5000,
                  }),
                )
              })

              hotkeys('ctrl+.', (e, _) => {
                /*
                                    `>` for speed increase of 0.25
                                */
                e.preventDefault()
                props.callbacks.changeTrackMode(
                  'changePlaybackRate',
                  { diff: PLAY_BACK_RATE_OFFSET },
                  ee,
                )

                if (nextPlayMode === 'pause' && sentenceSectionMode) {
                  /*
                                        User adjusts speed when track is playing
                                    */
                  adjustPlayBackToRate()
                }
              })

              hotkeys('ctrl+,', (e, _) => {
                /*
                                    `<` for speed decrease of 0.25
                                */
                e.preventDefault()
                props.callbacks.changeTrackMode(
                  'changePlaybackRate',
                  { diff: -PLAY_BACK_RATE_OFFSET },
                  ee,
                )

                if (nextPlayMode === 'pause' && sentenceSectionMode) {
                  /*
                                        User adjusts speed when track is playing
                                    */
                  adjustPlayBackToRate()
                }
              })
            }
          })
      }, 100)

      return () => {
        cleanUp()
      }
    }
  }, [audioSource])

  if (!playlistLoaded) {
    return <EditorLoader />
  }

  return <></>
}

export default Playlist
