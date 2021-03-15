/* eslint-disable react/display-name */
import React, { useCallback, useState, useRef, useEffect } from 'react'
import { isEqual } from 'lodash'

import { useSelector, useDispatch } from 'react-redux'
import styled from 'styled-components'

const BlockContainer = styled.div`
  position: absolute;
  z-index: 9;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  .sub-item {
    position: absolute;
    top: 0;
    left: 0;
    height: 50px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    color: #fff;
    font-size: 13px;
    cursor: ${props => props.isLocked ? 'initial' : 'move'};
    user-select: none;
    pointer-events: all;
    color: white;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
    background-color: rgba(255, 255, 255, 0.15);
    border-left: 1px solid rgba(255, 255, 255, 0.07);
    border-right: 1px solid rgba(255, 255, 255, 0.07);

    &:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }
    &.sub-highlight {
        background-color: rgb(106, 27, 154, 0.5);
        border-left: 1px solid rgb(106, 27, 154);
        border-right: 1px solid rgb(106, 27, 154);
        z-index: 1;
    }
    &.sub-illegal {
        background-color: rgba(199, 81, 35, 0.5);
    }
    .sub-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        height: 100%;
        cursor: ${props => props.isLocked ? 'initial' : 'col-resize'};
        user-select: none;
        ${props => props.isLocked ? '' : `&:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }`
        };
    }
    .sub-text {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        word-break: break-all;
        width: 100%;
        height: 100%;
        padding: 0 20px;
        p {
            margin: 5px 0;
            line-height: 1;
        }
    }
  }
`

let lastTarget = null
let lastSub = null
let lastType = ''
let lastX = 0
let lastIndex = -1
let lastWidth = 0
let lastDiffX = 0
let isDragging = false

// function to connect 2 connected subs
function magnetically(time, closeTime) {
  if (!closeTime) return roundTime(time)
  if (time > closeTime - 0.1 && closeTime + 0.1 > time) {
    return roundTime(closeTime)
  }
  return roundTime(time)
}

const roundTime = time => +time.toFixed(2)

export const Block = React.memo(
  ({ notes, updateNote, seekTo, sectionLength, startSection, endSection, isLocked }) => {
    const { currentTranscriptIndex: currentIndex } = useSelector(state => ({
      ...state.TRANSCRIPTION,
    }))

    const dispatch = useDispatch()

    const handleOnclick = useCallback(
      index => {
        const { begin, sentenceId } = notes[index]

        seekTo(Math.max(startSection, begin))

        dispatch({
          type: 'CHANGE_TRANSCRIPT_INDEX',
          payload: sentenceId,
        })
      },
      [dispatch, notes, seekTo, startSection],
    )

    const [multiplier, setMultiplier] = useState(0)

    const $subsRef = useRef(null)

    const measuredMultiplier = useCallback(
      el => {
        setMultiplier(el && sectionLength ? el.clientWidth / sectionLength : 0)
      },
      [sectionLength],
    )

    const onMouseDown = useCallback(
      (key, event, type) => {
        isDragging = true
        lastSub = notes[key]
        lastType = type
        lastX = event.pageX
        lastIndex = key
        lastTarget = $subsRef.current.children[lastIndex]
        lastWidth = parseFloat(lastTarget.style.width)
      },
      [notes],
    )

    const onDocumentMouseMove = useCallback(
      event => {
        if (isDragging && lastTarget && lastSub) {
          lastDiffX = event.pageX - lastX
          if (lastType === 'left') {
            lastTarget.style.width = `${lastWidth - lastDiffX}px`
            lastTarget.style.transform = `translate(${lastDiffX}px)`
          } else if (lastType === 'right') {
            lastTarget.style.width = `${lastWidth + lastDiffX}px`
          } else {
            const fullWidth =
              (parseFloat(lastSub.end) - parseFloat(lastSub.begin)) * multiplier

            lastTarget.style.transform = `translate(${lastDiffX}px)`
            lastTarget.style.width = `${fullWidth}px`
          }
        }
      },
      [multiplier],
    )

    // need to implement this to connect back to the notes
    const onDocumentMouseUp = useCallback(() => {
      if (isDragging && lastTarget && lastDiffX) {
        const timeDiff = lastDiffX / multiplier
        // const index = hasSubtitle(lastSub);
        const previous = notes[lastIndex - 1]
        const next = notes[lastIndex + 1]
        const startTime = magnetically(
          parseFloat(lastSub.begin) + timeDiff,
          previous ? parseFloat(previous.end) : 0,
        )
        const endTime = magnetically(
          parseFloat(lastSub.end) + timeDiff,
          next ? parseFloat(next.begin) : 0,
        )
        const width =
          (Math.min(endSection, endTime) - Math.max(startSection, startTime)) *
          multiplier

        if (lastType === 'left') {
          if (startTime >= 0 && startTime < lastSub.end) {
            updateNote(notes[lastIndex].sentenceId, { begin: startTime })
            // player.seek = startTime;
            // seekTo(startTime)
          } else {
            lastTarget.style.width = `${width}px`
            // notify(t('parameter-error'), 'error');
          }
        } else if (lastType === 'right') {
          if (endTime >= 0 && endTime > lastSub.begin) {
            updateNote(notes[lastIndex].sentenceId, { end: endTime })
            // player.seek = startTime;
            // seekTo(startTime)
          } else {
            lastTarget.style.width = `${width}px`
            // notify(t('parameter-error'), 'error');
          }
        } else {
          if (startTime > 0 && endTime > 0 && endTime > startTime) {
            lastTarget.style.width = `${width}px`

            updateNote(notes[lastIndex].sentenceId, {
              begin: startTime,
              end: endTime,
            })

            // seekTo(startTime)
          } else {
            lastTarget.style.width = `${width}px`
            // notify(t('parameter-error'), 'error');
          }
        }

        lastTarget.style.transform = 'translate(0)'
      }

      lastTarget = null
      lastType = ''
      lastX = 0
      lastWidth = 0
      lastDiffX = 0
      isDragging = false
      lastSub = null
    }, [multiplier, notes, updateNote, endSection, startSection])

    useEffect(() => {
      document.addEventListener('mousemove', onDocumentMouseMove)
      document.addEventListener('mouseup', onDocumentMouseUp)

      return () => {
        document.removeEventListener('mousemove', onDocumentMouseMove)
        document.removeEventListener('mouseup', onDocumentMouseUp)
      }
    }, [onDocumentMouseMove, onDocumentMouseUp])

    return (
      <BlockContainer ref={measuredMultiplier} isLocked={isLocked}>
        <div ref={$subsRef}>
          {notes.map((note, key) => {
            return (
              <div
                className={[
                  'sub-item',
                  note.sentenceId === currentIndex ? 'sub-highlight' : '',
                ]
                  .join(' ')
                  .trim()}
                key={key}
                style={{
                  left:
                    multiplier *
                    Math.max(0, parseFloat(note.begin) - startSection),
                  width:
                    (Math.min(parseFloat(note.end), endSection) -
                      Math.max(parseFloat(note.begin), startSection)) *
                    multiplier,
                }}
                onClick={() => handleOnclick(key)}
              >
                {parseFloat(note.begin) < startSection ? null : (
                  <div
                    className="sub-handle"
                    style={{
                      left: 0,
                      width: (multiplier * 2) / 10,
                    }}
                    onMouseDown={event => !isLocked && onMouseDown(key, event, 'left')}
                  ></div>
                )}

                <div
                  className="sub-text clamp-7"
                  onMouseDown={event => !isLocked && onMouseDown(key, event)}
                >
                  {/* {note.lines} */} {note.rowIndex + 1}
                </div>
                {parseFloat(note.end) > endSection ? null : (
                  <div
                    className="sub-handle"
                    style={{
                      right: 0,
                      width: (multiplier * 2) / 10,
                    }}
                    onMouseDown={event => !isLocked && onMouseDown(key, event, 'right')}
                  ></div>
                )}
              </div>
            )
          })}
        </div>
      </BlockContainer>
    )
  },
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.notes, nextProps.notes) &&
      isEqual(prevProps.seekTo, nextProps.seekTo) &&
      isEqual(prevProps.updateNote, nextProps.updateNote) &&
      isEqual(prevProps.sectionLength, nextProps.sectionLength) &&
      isEqual(prevProps.startSection, nextProps.startSection) &&
      isEqual(prevProps.endSection, nextProps.endSection) &&
      isEqual(prevProps.isLocked, nextProps.isLocked)
    )
  },
)
