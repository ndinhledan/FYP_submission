/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from 'react'
// import InfoModal from '../Utils/InfoModal';
// import Playlist from './Playlist';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
// import { Checkbox, Dropdown } from 'semantic-ui-react';
// import $ from 'jquery';
import '../styles.css'
import Button from '@material-ui/core/Button'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'

import { Row, Col } from 'reactstrap'

import dataProvider from '../dataProvider'

import Loader from 'react-loader-spinner'
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css'
// import { Label } from 'semantic-ui-react';
import styled from 'styled-components'

import { useDispatch, useSelector, shallowEqual } from 'react-redux'
import {
  disableEditMode,
  setTranscriptionIdForEdit,
  // changeChannel,
  // setTranscript,
  updateTranscripts,
  changeChannel,
  setGetSourceError
} from '../../actions/TranscriptionActions'
import { useToasts } from 'react-toast-notifications'
import { Annotations } from './Annotations'
import { Waveform } from './Waveform'
import {
  getNewObjectId,
  getTimeDurationFromSeconds,
  MAX_SECTION_LENGTH,
  MIN_SECTION_LENGTH,
  playBackRateOptions,
} from '../Utils/utils'
import { clamp, get, map, throttle } from 'lodash'
import Typography from '@material-ui/core/Typography'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconButton, Menu, MenuItem, Slider, Tooltip } from '@material-ui/core'
import { loadAudioSource } from '../../actions'
import { SkeletonLoader } from '../Utils/Loader'
import { FlexBox } from '../Utils/FlexBox'
import { CircularProgressWithLabel } from '../Utils/CircularProgressWithLabel'

const moment = require('moment')

const Empty = () => (
  <h3 style={{ marginLeft: '4%', color: 'rgba(0,0,0,0.7)' }}>
    No file selected into Editor, go to 'My Transcriptions' to select a file!
  </h3>
)

const SeekBarContainer = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
`

const VolumeBarContainer = styled.div`
  width: 50%;
  max-width: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  align-self: center;
`

const SeekBarValue = styled.div`
  padding: 0 10px;
`

const ControlButtonGroup = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
`

const WaveformActionPanel = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  height: 30px;
`

const Editor = props => {
  // const [transcriptionId, setTranscriptionId] = useState(null);
  // const [transcript, setTranscript] = useState(null);
  // const [fileInfo, setFileInfo] = useState(null);
  // const [channels, setChannels] = useState(null);
  const { addToast, removeToast } = useToasts()

  // const [isLoading, setIsLoading] = useState(true)

  useEffect(() => localStorage.setItem('playbackRate', '1.0'), []) // set initial speed
  const dispatch = useDispatch()

  if (localStorage.getItem('autoSave') === null) {
    localStorage.setItem('autoSave', 'true')
  }

  const {
    inSaveMode,
    editId,
    transcriptionId,
    transcripts: transcript,
    isLoading,
    getSourceError,
    // channels,
    fileData: fileInfo,
    wavesurfer,
    currentTranscriptIndex,
    isSavingTranscripts,
    isDecodingBuffer,
    channelCount,
    currentChannel,
    estimatedDecodingTime,
  } = useSelector(state => ({ ...state.TRANSCRIPTION }))
  const { audioPlayer } = useSelector(
    state => ({ ...state.TRANSCRIPTION }),
    shallowEqual,
  )

  const tableColRef = useRef(null)

  // audio player data
  const [isPaused, setIsPaused] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [seekBarValue, setSeekBarValue] = useState(0)
  const [volumeValue, setVolumeValue] = useState(100)
  const [playBackRate, setPlaybackRate] = useState(1)
  const [playbackRateMenuAnchor, setPlaybackRateMenuAnchor] = useState(null)

  const [decodingProgress, setDecodingProgress] = useState(0)

  const [channelMenuAnchor, setChannelMenuAnchor] = useState(null)

  const [isBlockLocked, setIsBlockLocked] = useState(true)

  // waveform section states
  const [currentSection, setCurrentSection] = useState(0)

  const [sectionLength, setSectionLength] = useState(15) // in seconds
  const [sectionLengthSliderValue, setSectionLengthSliderValue] = useState(15)

  const onChangeSectionLength = useCallback((e, value) => {
    setSectionLengthSliderValue(value)
    setSectionLength(value)
  }, [])

  const [currentRegion, setCurrentRegion] = useState(null)

  const playCurrentRegion = useCallback(
    region => {
      const { start: _start } = region

      const start = +(_start + currentSection * sectionLength).toFixed(3)
      const percentage = (_start + currentSection * sectionLength) / duration

      audioPlayer.currentTime = start
      setSeekBarValue(parseInt(start / duration))
      setCurrentTime(start)
      wavesurfer.seekTo(percentage)

      setIsPaused(false)
      audioPlayer.play()
    },
    [audioPlayer, wavesurfer, duration, currentSection, sectionLength],
  )

  const onRegionChanged = useCallback(
    region => {
      setCurrentRegion(region)
      playCurrentRegion(region)
    },
    [playCurrentRegion],
  )

  const removeCurrentRegion = useCallback(() => {
    if (!currentRegion) return

    currentRegion.remove()
    setCurrentRegion(null)
  }, [currentRegion])

  // useEffect(() => {
  //   if (transcriptionId !== null) {
  //     dispatch(getTranscriptionData(transcriptionId))
  //   }
  // }, [transcriptionId])

  // useEffect(() => {
  //   // get transcription id from first open up dashboard
  //   if (!editId) {
  //     dispatch(getTranscriptionId(editId))
  //     if (transcriptionId && fileInfo && fileInfo.cloudLink) {
  //       dispatch(loadAudioSource(transcriptionId, fileInfo))
  //     }
  //   }
  //   else if (editId !== transcriptionId && fileInfo && fileInfo.cloudLink) {
  //     dispatch({
  //       type: 'SET_TRANSCRIPTION_ID',
  //       payload: editId,
  //     })
  //     dispatch(loadAudioSource(editId, fileInfo))
  //   }
  // }, [editId, transcriptionId, fileInfo, dispatch])

  useEffect(() => {
    // if initial or edit id has changed - we don't want to fetch and process everything again
    if ((!editId && !transcriptionId) || (editId && editId !== transcriptionId)) {
      dispatch(loadAudioSource(editId, fileInfo))
    }
  }, [dispatch, editId, transcriptionId])

  audioPlayer.onloadedmetadata = function () {
    setDuration(audioPlayer.duration)
    audioPlayer.volume = volumeValue / 100 // useful to remember the state
    audioPlayer.playbackRate = playBackRate // useful to remember the state
  }

  useEffect(() => {
    if (audioPlayer && audioPlayer.readyState >= 1) { // loaded metadata - not a duplicate to the above since when set the audio player for the first time metadata wont be ready yet - this is used when the tab is switched
      setDuration(audioPlayer.duration)
      audioPlayer.volume = volumeValue / 100 // useful to remember the state
      audioPlayer.playbackRate = playBackRate // useful to remember the state
      setIsPaused(audioPlayer.paused)
      setCurrentTime(audioPlayer.currentTime)
    }
  }, [audioPlayer])

  useEffect(() => {
    const setPaused = () => {
      setIsPaused(true)
    }

    audioPlayer.addEventListener('ended', setPaused)

    return () => audioPlayer.removeEventListener('ended', setPaused)
  }, [audioPlayer])

  const handleOpenPlaybackRateMenu = useCallback(e => {
    setPlaybackRateMenuAnchor(e.currentTarget)
  }, [])

  const closePlaybackRateMenu = useCallback(() => {
    setPlaybackRateMenuAnchor(null)
  }, [])

  const changePlaybackRate = useCallback(
    val => {
      setPlaybackRate(val)
      audioPlayer.playbackRate = val
    },
    [audioPlayer],
  )

  // when using seek bar
  const calculateAndSetCurrentTime = useCallback(
    (e, val) => {
      const percentage = parseFloat(val) / 100
      const timeToGoTo = parseFloat((duration * percentage).toFixed(3))

      const sectionToGoTo = Math.floor(timeToGoTo / sectionLength)

      const waveSurferPercentage =
        (timeToGoTo - sectionToGoTo * sectionLength) / sectionLength

      setSeekBarValue(val)
      setCurrentTime(timeToGoTo)

      audioPlayer.currentTime = timeToGoTo
      wavesurfer.seekTo(waveSurferPercentage)
    },
    [duration, wavesurfer, sectionLength],
  )

  // when using waveform
  const onSeekWavefrom = useCallback(
    float => {
      // debugger
      const _currentTime = parseFloat(
        ((float + currentSection) * sectionLength).toFixed(3),
      )
      audioPlayer.currentTime = _currentTime

      setSeekBarValue(parseInt(_currentTime / duration))
      setCurrentTime(_currentTime)
      wavesurfer.seekTo(float)
    },
    [duration, audioPlayer, currentSection, sectionLength, wavesurfer],
  )

  const onClickJump = useCallback(
    jump => {
      const currentTime = audioPlayer.currentTime
      const jumpTime = clamp(currentTime + jump, 0, duration)

      audioPlayer.currentTime = jumpTime

      const percentage = parseInt((jumpTime / duration) * 100)

      setSeekBarValue(percentage)
      setCurrentTime(jumpTime)

      const sectionToGoTo = Math.floor(jumpTime / sectionLength)

      const waveSurferPercentage =
        (jumpTime - sectionToGoTo * sectionLength) / sectionLength

      wavesurfer.seekTo(waveSurferPercentage)
    },
    [audioPlayer, duration, sectionLength],
  )

  const goToNextSection = useCallback(() => {
    setCurrentSection(currentSection + 1)
    onClickJump(sectionLength)
  }, [onClickJump, sectionLength, sectionLength])

  const goToPreviousSection = useCallback(() => {
    setCurrentSection(currentSection - 1)
    onClickJump(-sectionLength)
  }, [onClickJump, sectionLength, sectionLength])

  // when audio is playing
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        const _currentTime = audioPlayer.currentTime

        const percentage = parseInt((_currentTime / duration) * 100)

        setSeekBarValue(percentage)
        setCurrentTime(_currentTime)

        const sectionToGoTo = Math.floor(_currentTime / sectionLength)

        const waveSurferPercentage =
          (_currentTime - sectionToGoTo * sectionLength) / sectionLength

        wavesurfer.seekTo(waveSurferPercentage)

        if (currentRegion) {
          const { end: _end } = currentRegion

          const end = _end + currentSection * sectionLength

          console.log(end)

          if (_currentTime >= end) {
            const percentage =
              (end - sectionToGoTo * sectionLength) / sectionLength
            audioPlayer.currentTime = end
            setSeekBarValue(parseInt(end / duration))
            setCurrentTime(end)
            wavesurfer.seekTo(percentage)

            audioPlayer.pause()
            setIsPaused(true)
          }
        }
      }, 20)

      return () => clearInterval(interval)
    }
  }, [
    duration,
    isPaused,
    audioPlayer,
    wavesurfer,
    sectionLength,
    currentSection,
    currentRegion,
  ])

  // update the chosen transcript with audio time transcription
  // update section with currentTime
  useEffect(() => {
    const section = Math.floor(currentTime / sectionLength)
    if (section !== currentSection) {
      setCurrentSection(section)
    }

    if (transcript && currentTime) {
      const currentTranscripts = map(
        transcript.filter(({ begin, end }) => {
          return begin <= currentTime && end >= currentTime
        }),
        'sentenceId',
      )

      if (
        currentTranscripts.length &&
        !currentTranscripts.includes(currentTranscriptIndex)
      ) {
        dispatch({
          type: 'CHANGE_TRANSCRIPT_INDEX',
          payload: currentTranscripts[0],
        })
      }
    }
  }, [currentTime, transcript, currentSection, sectionLength])

  // useEffect(() => {
  //   const defaultSentenceId = get(transcript, '0.sentenceId', '')

  //   dispatch({
  //     type: 'CHANGE_TRANSCRIPT_INDEX',
  //     payload: defaultSentenceId,
  //     from: 'default_transcript_id',
  //   })
  // }, [transcript, dispatch])

  useEffect(() => {
    if (isDecodingBuffer && estimatedDecodingTime) {
      // time it takes for one percent of decoding time
      const intervalForOneTick = (estimatedDecodingTime / 99)
      console.log(estimatedDecodingTime, intervalForOneTick)

      const interval = setInterval(() => {
        // 10ms is the most reliable time for setinterval, we don't want tick to be smaller than that
        const percentagePerTick = intervalForOneTick > 10 ? 1 : Math.floor(10 / intervalForOneTick)
        console.log(percentagePerTick)

        // since it's only an estimation we want it to be at 99 if the estimation is off
        setDecodingProgress(progress => progress >= 99 ? 99 : (progress + percentagePerTick))
      }, Math.max(10, intervalForOneTick))

      return () => clearInterval(interval)
    }
  }, [isDecodingBuffer, estimatedDecodingTime])

  const seekToSeconds = useCallback(
    _seconds => {
      const secs = parseFloat(_seconds)

      setCurrentTime(secs)
      audioPlayer.currentTime = secs

      setSeekBarValue(parseInt((secs / duration) * 100))
      const sectionToGoTo = Math.floor(secs / sectionLength)

      const waveSurferPercentage =
        (secs - sectionToGoTo * sectionLength) / sectionLength
      wavesurfer.seekTo(waveSurferPercentage)
    },
    [audioPlayer, wavesurfer, duration],
  )

  const updateVolume = throttle(
    useCallback(
      (e, value) => {
        setVolumeValue(value)
        const floatValue = value / 100
        audioPlayer.volume = floatValue
      },
      [audioPlayer],
    ),
    20,
  )

  const updateTranscript = useCallback((newTranscript, type, data) => {
    dispatch(updateTranscripts(newTranscript, transcriptionId, type, data))
  }, [dispatch, transcriptionId])

  const openChannelMenu = useCallback(e => {
    setChannelMenuAnchor(e.currentTarget)
  }, [])

  const handleChannelChange = useCallback(
    val => {
      dispatch(changeChannel(val))
    },
    [dispatch],
  )

  const handleCloseChannelMenu = useCallback(() => {
    setChannelMenuAnchor(null)
  }, [])

  const closeEditor = e => {
    /*
            Close all editor related modes
            and remove items from localStorage
        */
    toggleTrackModes('stop')

    localStorage.removeItem('editorConfig')
    localStorage.removeItem('editorState')
    localStorage.removeItem('autoSave')
    localStorage.removeItem('cursorPos')
    localStorage.removeItem('globalNextPlayMode')
    localStorage.removeItem('loadSavedState')
    localStorage.removeItem('section-playing-editor')
    localStorage.removeItem('SECTION_TIMER_ID')
    localStorage.removeItem('playBackRate')

    dispatch(disableEditMode())
    dispatch(setTranscriptionIdForEdit(null))
    dispatch({
      type: 'SET_TRANSCRIPTION_ID',
      payload: null,
    })

    /* Transition back to 'My Transcriptions' page */
    props.subPageCallback('My Transcriptions')
    localStorage.setItem('subpage', 'My Transcriptions')
  }

  useEffect(() => {
    if (getSourceError) {
      closeEditor()
      dispatch(setGetSourceError(false))
    }
  }, [getSourceError])

  const createLinkForDownload = (url, type) => {
    const time = moment(fileInfo.createdAt).format('LT')
    const date = moment(fileInfo.createdAt).format('LL')

    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `${fileInfo.originalname}_${date}_${time}.${type}`,
    ) // or any other extension
    document.body.appendChild(link)
    link.click()
  }

  const downloadTranscriptAndAudio = fileInfo => {
    /*
            Downloading transcripts and audio
        */
    addToast('Preparing files for export, please wait...', {
      autoDismiss: false,
      appearance: 'success',
      id: 2, // random ID
    })

    dataProvider.speech
      .post('export', {
        id: transcriptionId,
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
          addToast('Network error, please refresh your page and try again!', {
            autoDismiss: true,
            appearance: 'error',
            autoDismissTimeout: 3000,
          })
        }
      })
  }

  // const getChannels = () => {
  //     if (channels) {
  //         const channelDropdownOptions = [];
  //         let idx = 1;
  //         for (const ch of channels) {
  //             if (ch && ch !== 'undefined') {
  //                 channelDropdownOptions.push({
  //                     key: idx,
  //                     text: ch,
  //                     value: ch,
  //                 });
  //             }
  //             idx++;
  //         }

  //         if (channelDropdownOptions.length === 0) {
  //             channelDropdownOptions.push({ key: 1, text: 'channel1', value: 'channel1' });
  //         }
  //         return channelDropdownOptions;
  //     }
  //     return [];
  // };

  const toggleTrackModes = (mode, args = null, e = null) => {
    switch (mode) {
      case 'play':
        if (!currentRegion) {
          audioPlayer.play()
          setIsPaused(false)
        } else {
          playCurrentRegion(currentRegion)
        }

        break
      case 'pause':
        audioPlayer.pause()
        setIsPaused(true)
        break
      default:
    }
  }

  // const channelOptions = getChannels();

  // const handleChannelChange = (e, { value }) => {
  //     setSelectedChannel(value);
  //     dispatch(changeChannel(value));
  // };

  const addAnnotation = useCallback(
    id => {
      const index = transcript.findIndex(({ sentenceId }) => sentenceId === id)
      const _currentEnd = get(transcript, [index, 'end'], '0')

      const tempSentenceId = getNewObjectId()

      const newTranscript = [
        ...transcript.slice(0, index + 1),
        {
          begin: _currentEnd,
          end: parseInt(_currentEnd) + 5 + '',
          lines: '[New transcript]',
          speaker: get(transcript, [index, 'speaker'], '0'),
          channel: get(transcript, [index, 'channel'], '0'),
          sentenceId: tempSentenceId,
          isTemporary: true,
        },
        ...transcript.slice(index + 1),
      ]

      updateTranscript(newTranscript, 'create', {
        begin: _currentEnd,
        end: parseInt(_currentEnd) + 5 + '',
        lines: '[New transcript]',
        speaker: get(transcript, [index, 'speaker'], '0'),
        sentenceId: tempSentenceId,
        channel: get(transcript, [index, 'channel'], '0'),
        speechId: editId || transcriptionId,
      })
    },
    [transcript, updateTranscript, editId, transcriptionId],
  )

  const removeAnnotation = useCallback(
    id => {
      const index = transcript.findIndex(({ sentenceId }) => sentenceId === id)
      const newTranscript = transcript.filter((t, i) => i !== index)

      updateTranscript(newTranscript, 'delete', get(transcript, index))
    },
    [transcript, updateTranscript],
  )

  const updateAnnotation = useCallback(
    (id, updateValue) => {
      const index = transcript.findIndex(({ sentenceId }) => sentenceId === id)
      const updated = {
        ...transcript[index],
        ...updateValue,
      }
      updateTranscript(
        [
          ...transcript.slice(0, index),
          updated,
          ...transcript.slice(index + 1),
        ],
        'update',
        updated,
      )
    },
    [transcript, updateTranscript],
  )

  return (
    <React.Fragment>
      {transcriptionId === null ? (
        <Empty />
      ) : (
        <React.Fragment>
          {fileInfo !== null ? (
            <div id="playlist-info">
              <Typography variant="h5">{fileInfo.originalname}</Typography>
              <div className="save-status"></div>
              {isSavingTranscripts ? (
                <div>
                  <FontAwesomeIcon icon="spinner" spin /> Saving...
                </div>
              ) : (
                <div>
                  <FontAwesomeIcon icon="check" /> All changes saved.
                </div>
              )}
            </div>
          ) : (
            <SkeletonLoader
              height={30}
              width="50%"
              style={{ marginBottom: 30 }}
            />
          )}
          {isLoading || !audioPlayer ? null : (
            <>
              <span className="close-editor" onClick={closeEditor}>
                {!inSaveMode ? (
                  <i className="fas fa-times back"></i>
                ) : (
                  <Loader type="TailSpin" color="gray" height={20} width={20} />
                )}
              </span>
              {
                isDecodingBuffer ? <div style={{ width: '100vw', height: 'calc(100vh - 170px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <CircularProgressWithLabel value={decodingProgress} style={{ height: 60, width: 60 }} />
                </div>
                  : <>
                    <Row className="annotation-body">
                      <Col lg={3} md={3} sm={12} xs={12}>
                        <div id="top-bar" className="playlist-top-bar">
                          {isDecodingBuffer ? (
                            <SkeletonTheme
                              color="rgba(0, 0, 0, 0.4)"
                              highlightColor="rgba(0, 0, 0, 0.5)"
                            >
                              <Skeleton
                                style={{ marginTop: 10 }}
                                width="100%"
                                height={70}
                              />
                              <Skeleton
                                style={{ marginTop: 10 }}
                                width="100%"
                                height={50}
                              />
                              <Skeleton
                                style={{ marginTop: 10 }}
                                width="100%"
                                height={30}
                              />
                            </SkeletonTheme>
                          ) : (
                            <>
                              <div className="playlist-toolbar">
                                <ControlButtonGroup>
                                  <Tooltip title="Jump back 5s">
                                    <IconButton onClick={() => onClickJump(-5)}>
                                -5s
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Jump back 1s">
                                    <IconButton onClick={() => onClickJump(-1)}>
                                -1s
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={isPaused ? 'Play' : 'Pause'}>
                                    <IconButton
                                      onClick={() =>
                                        toggleTrackModes(isPaused ? 'play' : 'pause')
                                      }
                                    >
                                      <FontAwesomeIcon
                                        icon={isPaused ? 'play' : 'pause'}
                                      />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Jump forward 1s">
                                    <IconButton onClick={() => onClickJump(1)}>
                                +1s
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Jump forward 5s">
                                    <IconButton onClick={() => onClickJump(5)}>
                                +5s
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Playback Rate">
                                    <IconButton onClick={handleOpenPlaybackRateMenu}>
                                      {playBackRate}x
                                    </IconButton>
                                  </Tooltip>

                                  <Menu
                                    id="playback-rate-menu"
                                    anchorEl={playbackRateMenuAnchor}
                                    keepMounted
                                    open={Boolean(playbackRateMenuAnchor)}
                                    onClose={closePlaybackRateMenu}
                                  >
                                    {playBackRateOptions.map(value => (
                                      <MenuItem
                                        key={value}
                                        onClick={() => {
                                          changePlaybackRate(value)
                                          closePlaybackRateMenu()
                                        }}
                                      >
                                        {playBackRate === value ? (
                                          <FontAwesomeIcon
                                            style={{ marginRight: 10 }}
                                            icon="check"
                                          />
                                        ) : (
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              width: 24,
                                            }}
                                          />
                                        )}{' '}
                                        {value}x
                                      </MenuItem>
                                    ))}
                                  </Menu>
                                  <span style={{ flex: 1 }} />
                                  <Tooltip title="Save transcript">
                                    <IconButton
                                      onClick={() =>
                                        downloadTranscriptAndAudio(fileInfo)
                                      }
                                    >
                                      <FontAwesomeIcon icon="save" />
                                    </IconButton>
                                  </Tooltip>
                                </ControlButtonGroup>
                              </div>
                              <SeekBarContainer>
                                <SeekBarValue>
                                  {' '}
                                  {getTimeDurationFromSeconds(currentTime)}{' '}
                                </SeekBarValue>
                                <Slider
                                  value={seekBarValue}
                                  onChange={calculateAndSetCurrentTime}
                                  aria-labelledby="track-slider"
                                />
                                <SeekBarValue>
                                  {getTimeDurationFromSeconds(duration)}
                                </SeekBarValue>
                              </SeekBarContainer>
                              <VolumeBarContainer>
                                <SeekBarValue>
                                  <FontAwesomeIcon icon="volume-off" />
                                </SeekBarValue>
                                <Slider
                                  value={volumeValue}
                                  onChange={updateVolume}
                                  aria-labelledby="track-slider"
                                />
                                <SeekBarValue>
                                  <FontAwesomeIcon icon="volume-up" />
                                </SeekBarValue>
                              </VolumeBarContainer>
                            </>
                          )}
                        </div>
                      </Col>
                      {/* using this so we can use ref */}
                      <div
                        className="col-12 col-sm-12 col-md-9 col-lg=9"
                        ref={tableColRef}
                      >
                        <Annotations
                          seekTo={seekToSeconds}
                          colRef={tableColRef}
                          add={addAnnotation}
                          remove={removeAnnotation}
                          update={updateAnnotation}
                          currentTime={currentTime}
                        />
                      </div>
                    </Row>
                    {isDecodingBuffer ? (
                      <SkeletonTheme
                        color="rgba(0, 0, 0, 0.4)"
                        highlightColor="rgba(0, 0, 0, 0.5)"
                      >
                        <Skeleton
                          style={{ margin: '30px 20px 0 20px' }}
                          width="calc(100% - 40px)"
                          height={150}
                        />
                      </SkeletonTheme>
                    ) : (
                      <>
                        <WaveformActionPanel>
                          <FlexBox justifyContent="flex-start">
                            <div style={{ marginRight: 10, marginLeft: 5 }}>
                        Channel:
                            </div>
                            <div>
                              <Button onClick={openChannelMenu}>
                                {currentChannel === 'all'
                                  ? 'All'
                                  : currentChannel + 1}{' '}
                          &nbsp; <FontAwesomeIcon icon="chevron-down" />{' '}
                              </Button>
                              <Menu
                                id="channel-menu"
                                anchorEl={channelMenuAnchor}
                                keepMounted
                                open={Boolean(channelMenuAnchor)}
                                onClose={handleCloseChannelMenu}
                              >
                                <MenuItem
                                  onClick={() => {
                                    handleChannelChange('all')
                                    handleCloseChannelMenu()
                                  }}
                                >
                            All
                                </MenuItem>
                                {[...Array(channelCount).keys()].map(val => (
                                  <MenuItem
                                    key={val}
                                    onClick={() => {
                                      handleChannelChange(val)
                                      handleCloseChannelMenu()
                                    }}
                                  >
                                    {val + 1}
                                  </MenuItem>
                                ))}
                              </Menu>
                            </div>
                          </FlexBox>
                          <FlexBox>
                            <Tooltip title="Previous section">
                              <span>
                                <IconButton
                                  disabled={currentSection === 0}
                                  onClick={goToPreviousSection}
                                >
                                  <FontAwesomeIcon icon="angle-left" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Next section">
                              <span>
                                <IconButton
                                  onClick={goToNextSection}
                                  disabled={
                                    Math.floor(duration / sectionLength) ===
                              currentSection
                                  }
                                >
                                  <FontAwesomeIcon icon="angle-right" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </FlexBox>
                          <FlexBox
                            justifyContent="flex-start"
                            style={{ width: 300, marginLeft: 15 }}
                          >
                            <div style={{ marginRight: 10, marginLeft: 5 }}>
                        Duration:
                            </div>
                            <Slider
                              value={sectionLengthSliderValue}
                              onChange={onChangeSectionLength}
                              aria-labelledby="section-slider"
                              step={5}
                              marks
                              min={MIN_SECTION_LENGTH}
                              max={MAX_SECTION_LENGTH}
                            />
                          </FlexBox>
                          <FormControlLabel
                            control={<Switch checked={isBlockLocked} onChange={e => setIsBlockLocked(e.target.checked)} color="primary" />}
                            label="Lock sentences"
                          />
                          <Button
                            disabled={!currentRegion}
                            onClick={removeCurrentRegion}
                          >
                      Remove playback portion
                          </Button>
                        </WaveformActionPanel>
                        <Row>
                          <Col>
                            <Waveform
                              currentSection={currentSection}
                              sectionLength={sectionLength}
                              seekTo={seekToSeconds}
                              onSeek={onSeekWavefrom}
                              updateNote={updateAnnotation}
                              onRegionChanged={onRegionChanged}
                              isLocked={isBlockLocked}
                            />
                          </Col>
                        </Row>
                      </>
                    )}
                  </>
              }
              
            </>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  )
}

export default Editor
