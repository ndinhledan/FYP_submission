/* eslint-disable react-hooks/exhaustive-deps */
/* eslint no-loop-func: "off" */
import React, { useEffect, useState } from 'react'
import EventEmitter from 'event-emitter'
import Recorder from '../Utils/Recorder'
import { ReSpeakLoader } from '../Utils/Loader'
import { timeFormat } from '../timeFormat'
import dataProvider from '../dataProvider'
import LRU from '../LRU'
import $ from 'jquery'
import '../styles.css'

import { useDispatch, useSelector } from 'react-redux'
import { useToasts } from 'react-toast-notifications'
import {
  saveEventEmitter,
  addSectionForReSpeak,
  releaseToast,
} from '../../actions/TranscriptionActions'

const WaveformPlaylist = require('waveform-playlist-transcriptor')

const ReSpeak = props => {
  const [trackLoaded, setTrackLoaded] = useState(false)
  const [audioSource, setAudioSource] = useState(null)

  const dispatch = useDispatch()
  const { addToast } = useToasts()
  const { toast } = useSelector(state => ({ ...state.TRANSCRIPTION }))

  useEffect(() => {
    if (toast != null) {
      const { content, ...toastProps } = toast
      addToast(content, { autoDismiss: true, ...toastProps })

      dispatch(releaseToast(null))
    }
  }, [toast])

  const cachedSamplesPerPixel =
    1800 -
    (JSON.parse(localStorage.getItem('reSpeakEditorState'))
      ? JSON.parse(localStorage.getItem('reSpeakEditorState')).zoomLevel
      : 500)

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
    const loadAudioSource = async () => {
      try {
        const blob = await getAudioSource()
        const duration = props.fileInfo.duration
        setAudioSource({ blob, duration })
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
      const playlist = WaveformPlaylist.init(
        {
          container: document.getElementById(
            'waveform-playlist-container-respeak',
          ),
          timescale: true,
          state: 'cursor',
          colors: {
            waveOutlineColor: 'white',
            timeColor: 'grey',
            fadeColor: 'black',
          },
          annotationList: {
            annotations: props.notes,
            controls: [],
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

      let cursorUpdate = null

      setTimeout(() => {
        const start = new Date().getTime()
        playlist
          .load([
            {
              src: audioSource.blob,
              muted: false,
            },
          ])
          .then(function() {
            const end = new Date().getTime()

            $('.playlist-toolbar').fadeIn(0)
            $('#waveform-playlist-container-respeak').fadeIn(0)

            console.log('EXEC : ', end - start)

            const $annotationContainer = document.getElementsByClassName(
              'annotations',
            )[0]
            const $annotationsTextContainer = document.getElementsByClassName(
              'annotations-text',
            )[0]

            $annotationContainer.removeChild($annotationsTextContainer)
            $annotationContainer.style.height = '40px'
            $annotationContainer.style.padding = '0px'

            setTrackLoaded(true)

            const ee = playlist.getEventEmitter()
            dispatch(saveEventEmitter(ee))

            clearInterval(cursorUpdate)

            const $waveform = $('.playlist-tracks')[0]
            const $cursor = document.getElementsByClassName('cursor')[0]
            const $timeTicks = Array.from(
              document.getElementsByClassName('time'),
            )
            const $annotationsBoxesDiv = document.getElementsByClassName(
              'annotations-boxes',
            )[0]
            const $sentenceSectionBoxes = document.getElementsByClassName(
              'annotation-box',
            )
            const $waveformTrack = document.getElementsByClassName(
              'waveform',
            )[0]
            const $selectionPoint = document.getElementsByClassName('point')[0]
            const $stopBtn = document.getElementsByClassName('btn-stop')[0]
            const $zoomOut = document.getElementsByClassName('btn-zoom-out')[0]
            const $zoomIn = document.getElementsByClassName('btn-zoom-in')[0]

            const cursorLimit =
              $annotationsBoxesDiv && $annotationsBoxesDiv.offsetWidth
            let nextPlayMode = 'play'
            let prevScroll = 0
            let popUpInDisplay = false
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
              localStorage.getItem('reSpeakEditorState'),
            )
              ? JSON.parse(localStorage.getItem('reSpeakEditorState')).zoomLevel
              : 500
            let currZoomLevel = zoomLevels.indexOf(cachedZoomLevel)
            const SAMPLE_RATE = 44100
            let SAMPLES_PER_PIXEL = 1800 - zoomLevels[currZoomLevel]

            const timeStringToFloat = time => {
              const [hours, minutes, seconds] = time
                .split(':')
                .map(unit => parseFloat(unit))

              const totalSeconds = hours * 3600 + minutes * 60 + seconds

              return totalSeconds
            }

            const secondsToPixels = seconds => {
              return Math.ceil(
                (parseFloat(seconds) * SAMPLE_RATE) / SAMPLES_PER_PIXEL,
              )
            }

            const pixelsToSeconds = pixels => {
              return (pixels * SAMPLES_PER_PIXEL) / SAMPLE_RATE
            }

            const setCursorByLeft = left => {
              $cursor.style.left = left.toString() + 'px'
            }

            const setCursorByTime = time => {
              const offset = secondsToPixels(time)

              $cursor.style.left = offset.toString() + 'px'
            }

            const updateEditorState = (args = null) => {
              let currEditorState = {
                waveFormScroll: $waveform.scrollLeft,
                cursorPos: $cursor.style.left,
                popUpInDisplay,
                zoomLevel: zoomLevels[currZoomLevel],
              }

              if (args) currEditorState = { ...currEditorState, ...args }
              else {
                const prevState = JSON.parse(
                  localStorage.getItem('reSpeakEditorState'),
                )
                if (prevState && 'activeSentence' in prevState) {
                  currEditorState = {
                    ...currEditorState,
                    activeSentence: prevState.activeSentence,
                  }
                }
              }

              localStorage.setItem(
                'reSpeakEditorState',
                JSON.stringify(currEditorState),
              )
            }

            const loadEditorState = () => {
              const prevState = JSON.parse(
                localStorage.getItem('reSpeakEditorState'),
              )

              if (prevState) {
                $waveform.scrollTo({ left: prevState.waveFormScroll, top: 0 })

                dispatch(addSectionForReSpeak(prevState.activeSentence))

                $cursor.style.left = prevState.cursorPos

                popUpInDisplay = prevState.popUpInDisplay

                const prevZoomLevel = prevState.zoomLevel
                currZoomLevel = zoomLevels.indexOf(prevZoomLevel)
              }

              localStorage.setItem('loadSavedState_ReSpeak', 'false')
            }

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

            const getTimeAtCursorPosition = () => {
              const cursorPos = parseInt($cursor.style.left)
              const stopTime = pixelsToSeconds(cursorPos)

              return stopTime
            }

            const addSectionHighlight = $element => {
              $element.classList.add('section-highlight')
            }

            const removeSectionHighlight = $element => {
              $element.classList.remove('section-highlight')
            }

            const removeAllSectionHighlights = () => {
              Array.from($sentenceSectionBoxes).map($e =>
                removeSectionHighlight($e),
              )
            }

            const scrollToSection = sentenceId => {
              addSectionHighlight($sentenceSectionBoxes[sentenceId - 1])

              const scrollVal =
                parseInt($sentenceSectionBoxes[sentenceId - 1].style.left) - 20

              $waveform.scrollTo({
                left: prevScroll + scrollVal,
                top: 0,
                behavior: 'smooth',
              })

              prevScroll += scrollVal
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

            const showTimePopUp = () => {
              const cursorPos = getTimeAtCursorPosition()
              const { left, top } = $cursor.getBoundingClientRect()
              const $playlistContainer = document.getElementById(
                'waveform-playlist-container-respeak',
              )

              if ($playlistContainer) {
                const cursorLeft = parseInt($cursor.style.left)
                if (
                  cursorLeft >= prevScroll &&
                  cursorLeft <= prevScroll + cursorLimit
                ) {
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
                  const $pointer = buildElement('div', 'pop-up-pointer animate')

                  if ($popUp) {
                    $popUp.appendChild($timeDisplay)

                    window.scrollY <= 250 && $popUp.appendChild($pointer)

                    $playlistContainer.insertBefore($popUp, $playlist)

                    popUpInDisplay = true

                    localStorage.setItem('popUpInDisplay', popUpInDisplay)

                    adjustLeft()

                    updateEditorState()
                  }
                }
              }
            }

            const removeTimePopUp = () => {
              const $playlistContainer = document.getElementById(
                'waveform-playlist-container-respeak',
              )

              if ($playlistContainer) {
                const $popUp = document.getElementsByClassName(
                  'pop-up-container',
                )[0]

                if ($popUp) {
                  $playlistContainer.removeChild($popUp)

                  popUpInDisplay = false

                  localStorage.setItem('popUpInDisplay', popUpInDisplay)

                  updateEditorState()
                }
              }
            }

            const updateCursorOnZoom = prevTime => {
              setTimeout(() => {
                updateEditorState()
                setCursorByTime(prevTime)
              }, 50)
            }

            /*
                            Event Listeners
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

            window.addEventListener('unload', _ => {
              popUpInDisplay = localStorage.getItem('popUpInDisplay') === 'true'
            })

            let WAVEFORM_SCROLL_TIMER = null
            $waveform.addEventListener('scroll', e => {
              e.preventDefault()

              prevScroll = $waveform.scrollLeft

              popUpInDisplay && removeTimePopUp()

              clearTimeout(WAVEFORM_SCROLL_TIMER)

              updateEditorState()

              WAVEFORM_SCROLL_TIMER = setTimeout(() => {
                if (popUpInDisplay) {
                  removeTimePopUp()
                  showTimePopUp()
                }
              }, 200)
            })

            let WINDOW_SCROLL_TIMER = null
            window.addEventListener('scroll', e => {
              e.preventDefault()

              popUpInDisplay && removeTimePopUp()

              clearTimeout(WINDOW_SCROLL_TIMER)

              WINDOW_SCROLL_TIMER = setTimeout(() => {
                if (popUpInDisplay) {
                  removeTimePopUp()
                  showTimePopUp()
                }
              }, 200)
            })

            cursorUpdate = setInterval(() => {
              let globalNextPlayMode_respeak = null
              const cursorPos = getTimeAtCursorPosition()
              if (localStorage.getItem('globalNextPlayMode_respeak')) {
                globalNextPlayMode_respeak = localStorage.getItem(
                  'globalNextPlayMode_respeak',
                )
                nextPlayMode = globalNextPlayMode_respeak
              }
              if (nextPlayMode === 'pause') {
                // currently playing
                scrollOnCursorLimit(cursorPos)

                if (popUpInDisplay) {
                  removeTimePopUp()
                }
              } else {
                // currently paused
                !popUpInDisplay && cursorPos !== 0 && showTimePopUp()
              }

              localStorage.setItem('cursorPos', getTimeAtCursorPosition())
            }, 500)

            /*
                            Set point on track to start
                            playing from clicked point on track
                        */
            $waveformTrack.addEventListener('click', () => {
              setTimeout(() => {
                $cursor.style.left = $selectionPoint.style.left

                setTimeout(() => {
                  const inSectionPlayMod = JSON.parse(
                    localStorage.getItem('section-playing-respeak'),
                  )

                  if (inSectionPlayMod) {
                    let startTime = 0
                    const sentenceIdx = parseInt(inSectionPlayMod.sentenceIdx)

                    if (localStorage.getItem('cursorPos')) {
                      startTime = parseFloat(localStorage.getItem('cursorPos'))
                    }

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
                        localStorage.removeItem('SECTION_TIMER_ID')
                      }

                      const NEW_SECTION_TIMER = setTimeout(() => {
                        localStorage.removeItem('section-playing-respeak')
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
                      removeSectionHighlight($sentenceSectionBoxes[sentenceIdx])
                    }
                  }
                }, 500) // as cursorPos update is every 500ms

                popUpInDisplay && removeTimePopUp()
                !popUpInDisplay && showTimePopUp()
              }, 10)
            })

            let SECTION_TIMER = null

            for (const $sectionBox of $sentenceSectionBoxes) {
              $sectionBox.addEventListener('click', e => {
                e.preventDefault()

                nextPlayMode = 'pause'

                removeAllSectionHighlights()
                const sentenceId = parseInt(e.srcElement.innerText)
                scrollToSection(sentenceId)

                const { begin: startTime, end: endTime } = props.notes[
                  sentenceId - 1
                ]
                const startPoint =
                  parseInt($sentenceSectionBoxes[sentenceId - 1].style.left) +
                  $waveform.scrollLeft
                const sectionData = {
                  startPoint,
                  sentenceIdx: sentenceId - 1,
                  startTime,
                  endTime,
                }

                const rate = parseFloat(localStorage.getItem('playbackRate'))

                localStorage.setItem(
                  'section-playing-respeak',
                  JSON.stringify(sectionData),
                )

                dispatch(addSectionForReSpeak(sentenceId - 1)) // scrolls to sentence

                updateEditorState({ activeSentence: sentenceId - 1 })

                props.callbacks.changeTrackMode(
                  'play',
                  { startTime, endTime },
                  ee,
                )

                const OLD_SECTION_TIMER = parseInt(
                  localStorage.getItem('SECTION_TIMER_ID'),
                )

                if (OLD_SECTION_TIMER) {
                  clearTimeout(OLD_SECTION_TIMER)
                  localStorage.removeItem('SECTION_TIMER_ID')
                }

                SECTION_TIMER = setTimeout(() => {
                  localStorage.removeItem('section-playing-respeak')
                  localStorage.removeItem('SECTION_TIMER_ID')
                  props.callbacks.changeTrackMode('pause', null, ee)
                  removeSectionHighlight($sentenceSectionBoxes[sentenceId - 1])
                  setCursorByLeft(startPoint)
                  nextPlayMode = 'play'
                }, ((endTime - startTime + 0.1) * 1000) / rate)

                localStorage.setItem('SECTION_TIMER_ID', SECTION_TIMER)
              })
            }

            $stopBtn.addEventListener('click', _ => {
              removeTimePopUp()
              removeAllSectionHighlights()

              $waveform.scrollTo({
                left: 0,
                top: 0,
              })

              dispatch(addSectionForReSpeak(0))

              updateEditorState({ activeSentence: 0 })
            })

            // load prev state from localStorage
            localStorage.getItem('loadSavedState_ReSpeak') === 'true' &&
              loadEditorState()
          })
      }, 100)

      return () => {
        clearInterval(cursorUpdate)

        localStorage.removeItem('cursorPos')
      }
    }
  }, [audioSource])

  if (!trackLoaded) {
    return <ReSpeakLoader />
  } else {
    return <Recorder data={props} />
  }
}

export default ReSpeak
