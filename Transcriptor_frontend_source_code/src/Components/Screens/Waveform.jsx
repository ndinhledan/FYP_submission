import React, { useEffect, useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'
import WaveSurfer from 'wavesurfer.js'
import { Block } from './Block'
// import { loadAudioSource } from '../../actions';
import { filter, map } from 'lodash'
import {
  getSectionAudioBuffer,
  getTimeDurationFromSeconds,
} from '../Utils/utils'
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline'
import RegionPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions'

let currentRegion

function timeInterval(pxPerSec) {
  var retval = 1;
  if (pxPerSec >= 90) {
    retval = 1
  } else if (pxPerSec >= 70) {
    retval = 2
  } else if (pxPerSec >= 45) {
    retval = 4
  } else if (pxPerSec >= 20) {
    retval = 5
  } else {
    retval = 10
  }
  return retval
}

function primaryLabelInterval(pxPerSec) {
  // console.log(pxPerSec)
  var retval = 1
  // if (pxPerSec >= 90) {
  //     retval = 1;
  // } else if (pxPerSec >= 0) {
  //     retval = 2;
  // }
  return retval
}

export const Waveform = ({
  updateNote,
  onSeek,
  seekTo,
  currentSection,
  sectionLength,
  onRegionChanged,
  isLocked
}) => {
  // const [audioSource, setAudioSource] = useState(null)

  // start and end of section
  const [startSection, setStartSection] = useState(0)
  const [endSection, setEndSection] = useState(0)

  const [currentTranscripts, setCurrentTranscripts] = useState([])
  const [initTimeline, setInitTimeline] = useState(false)

  useEffect(() => {
    const _start = currentSection * sectionLength
    const _end = (currentSection + 1) * sectionLength

    setStartSection(_start)
    setEndSection(_end)
  }, [currentSection, sectionLength])

  const {
    // transcriptionId: _id,
    transcripts: notes,
    // fileData: fileInfo,
    wavesurfer,
    audioBuffer,
    audioContext,
    isDecodingBuffer,
  } = useSelector(state => ({ ...state.TRANSCRIPTION }))

  let dispatch = useDispatch()

  // loading audio source
  // useEffect(() => {
  //     if (_id && fileInfo && fileInfo.cloudLink) {
  //         dispatch(loadAudioSource(_id, fileInfo));
  //     }
  // }, [_id, fileInfo, dispatch]);

  // initialize wavesurfer
  useEffect(() => {
    const _wavesurfer = WaveSurfer.create({
      container: '#waveform',
      waveColor: '#484848',
      progressColor: '#B0B0B0',
      fillParent: true,
      barWidth: 2,
      barGap: 2,
      barHeight: 2,
      backgroundColor: '#1A1A1B',
      cursorColor: '#DC143C',
      plugins: [
        RegionPlugin.create()
      ]
    });

    _wavesurfer.on('ready', () => {
      console.log('ready')
      _wavesurfer.enableDragSelection({ color: 'rgba(147, 111, 223, 0.5)' })
    })

    dispatch({
      type: 'SET_WAVESURFER',
      payload: _wavesurfer,
    })
  }, [dispatch])

  // load audio
  useEffect(() => {
    if (
      audioBuffer &&
      startSection >= 0 &&
      endSection &&
      audioContext &&
      !isDecodingBuffer
    ) {
      const currentAudioBufferSection = getSectionAudioBuffer(
        audioContext,
        audioBuffer,
        startSection,
        endSection,
      )
      wavesurfer.loadDecodedBuffer(currentAudioBufferSection)
    } else if (audioBuffer && isDecodingBuffer) {
      wavesurfer.empty()
    }
  }, [
    audioBuffer,
    wavesurfer,
    startSection,
    endSection,
    audioContext,
    isDecodingBuffer,
  ])

  // register on click event for waveform
  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.drawer.on('click', (e, progress) => {
        if (progress >= 0) {
          onSeek(progress)
        }
      })

      return () => wavesurfer.drawer.un('click')
    }
  }, [wavesurfer, onSeek])

  useEffect(() => {
    if (wavesurfer) {
      wavesurfer.on('region-update-end', region => {
        if (
          (currentRegion && currentRegion.id !== region.id) ||
          !currentRegion
        ) {
          if (currentRegion && currentRegion.id !== region.id) {
            try {
              currentRegion.remove()
            } catch (e) {
              console.log('Current region already removed')
            }
          }

          currentRegion = region
        }

        region.on('click', e => {
          e.stopPropagation()
        })

        region.on('remove', () => {
          region.un('click')
        })

        onRegionChanged(region)
      })

      return () => wavesurfer.un('region-update-end')
    }
  }, [wavesurfer, onRegionChanged])

  // updating the transcripts array
  useEffect(() => {
    const currentNotes = filter(
      map(notes, (d, index) => ({ ...d, rowIndex: index })),
      ({ begin, end }) =>
        (begin >= startSection && begin <= endSection) || // begin time between section
        (end >= startSection && end <= endSection) || // end time between section
        (begin < startSection && end > endSection), // the whole transcript contain the section
    )

    setCurrentTranscripts(currentNotes)
  }, [notes, endSection, startSection])

  //updating the timeline
  useEffect(() => {
    if (wavesurfer) {
      if (initTimeline) {
        try {
          wavesurfer.destroyPlugin('timeline')
        } catch (err) {
          console.log('No timeline to destroy')
        }
      } else {
        setInitTimeline(true)
      }
      if (!isDecodingBuffer) {
        wavesurfer
          .addPlugin(
            TimelinePlugin.create({
              container: '#timeline',
              formatTimeCallback: secs =>
                getTimeDurationFromSeconds(secs + startSection),
              primaryLabelInterval: primaryLabelInterval,
              timeInterval: timeInterval,
              primaryColor: '#fff',
              primaryFontColor: '#fff',
              secondaryColor: '#fff',
              secondaryFontColor: '#fff',
            }),
          )
          .initPlugin('timeline')
      }
    }
  }, [startSection, wavesurfer, initTimeline, sectionLength, isDecodingBuffer])

  return (
    <div className="waveform-container">
      <div id="waveform">
        <div id="timeline" />
        <Block
          seekTo={seekTo}
          notes={currentTranscripts}
          updateNote={updateNote}
          sectionLength={sectionLength}
          startSection={startSection}
          endSection={endSection}
          isLocked={isLocked}
        />
      </div>
    </div>
  )
}
