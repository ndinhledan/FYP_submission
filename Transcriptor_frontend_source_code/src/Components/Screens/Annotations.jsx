import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { Col, Row, Input } from 'reactstrap'

import { useSelector, useDispatch } from 'react-redux'

import { Table } from 'react-virtualized'
import { debounce, get } from 'lodash'
import { filterFunction, getTimeDurationFromSeconds } from '../Utils/utils'
import { SkeletonLoader } from '../Utils/Loader'
import { EditSpeakerNameModal } from '../Utils/EditSpeakerNameModal'
import { Button, Tooltip } from '@material-ui/core'
import styled from "styled-components"

const SpeakerColor = styled.div`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => props.color};
  margin-right: 10px;
`


const TranscriptRow = ({ data, add, remove, update, className, style, seekTo, index, currentTime, _key, onClickSpeakerName }) => {
  const { begin, end, lines, speaker, sentenceId, isTemporary, id, prevText } = data

  // we use local state then use debounce to set the global state to reduce lag
  const [noteValue, setNoteValue] = useState(lines)
  // const [speakerValue, setSpeakerValue] = useState(speaker)

  const { currentTranscriptIndex, isDecodingBuffer, transcriptColor } = useSelector(state => ({ ...state.TRANSCRIPTION }))

  const dispatch = useDispatch()

  const handleOnclick = useCallback(() => {
    if (currentTranscriptIndex !== sentenceId) {
      dispatch({
        type: 'CHANGE_TRANSCRIPT_INDEX',
        payload: sentenceId,
      })
    
      seekTo(begin)
    }
  }, [sentenceId, dispatch, seekTo, begin, currentTranscriptIndex])

  const handleClickSpeakerName = useCallback(() => {
    onClickSpeakerName(data)
  }, [onClickSpeakerName, data])

  const updateSentence = debounce(
    useCallback(
      (type, value) => {
        switch (type) {
          case 'start':
            return update(sentenceId, { begin: value })
          case 'end':
            return update(sentenceId, { end: value })
          case 'note':
            return update(sentenceId, { lines: value })
          case 'speaker':
            return update(sentenceId, { speaker: value })
          default:
        }
      },
      [sentenceId, update],
    ),
    100,
  )

  const handleChangeNote = useCallback(
    e => {
      setNoteValue(e.target.value)
      updateSentence('note', e.target.value)
    },
    [updateSentence],
  )

  const revertNote = useCallback(
    () => {
      setNoteValue(prevText)
      updateSentence('note', prevText)
    },
    [updateSentence, prevText],
  )

  // const handleChangeSpeaker = useCallback(
  //   e => {
  //     setSpeakerValue(e.target.value)
  //     updateSentence('speaker', e.target.value)
  //   },
  //   [updateSentence],
  // )

  const onClickJumpStart = useCallback((e) => {
    e.stopPropagation()
    seekTo(begin)
  }, [begin, seekTo])

  const onClickJumpEnd = useCallback((e) => {
    e.stopPropagation()
    seekTo(end)
  }, [end, seekTo])

  const onClickSetStart = useCallback((e) => {
    e.stopPropagation()
    updateSentence('start', +currentTime.toFixed(3))
  }, [updateSentence, currentTime])

  const onClickSetEnd = useCallback((e) => {
    e.stopPropagation()
    updateSentence('end', +currentTime.toFixed(3))
  }, [updateSentence, currentTime])

  return isDecodingBuffer ? (
    <Row
      className={[
        // 'annotation-row',
        className,
        // index % 2 === 1 ? 'row-odd' : '',
      ].join(' ')}
      style={style}
      key={_key}
    >
      <Col lg={1} md={1} sm={1} xs={1}></Col>
      <Col lg={3} md={3} sm={3} xs={3}>
        <SkeletonLoader height={34} width="100%" style={{ marginBottom: 10 }} />
        <SkeletonLoader height={34} width="100%" />
      </Col>
      <Col lg={1} md={1} sm={1} xs={1}></Col>
      <Col lg={7} md={7} sm={7} xs={7}>
        <SkeletonLoader height={70} width="100%" />
      </Col>
    </Row>
  ) : (
    <Row
      onClick={handleOnclick}
      className={[
        'annotation-row',
        className,
        index % 2 === 1 ? 'row-odd' : '',
        currentTranscriptIndex === sentenceId ? 'highlight' : '',
      ].join(' ')}
      style={style}
      key={_key}
    >
      <Col className="annotation-actions-col" lg={1} md={1} sm={1} xs={1}>
        <i onClick={() => remove(sentenceId)} className="fa fa-trash fa-sm annotation-action"></i>
        <i onClick={() => add(sentenceId)} className="fa fa-plus fa-sm annotation-action"></i>
        <i onClick={revertNote} className="fa fa-history fa-sm annotation-action"></i>
      </Col>
      <Col lg={5} md={5} sm={5} xs={5}>
        <Row style={{ display: 'flex', alignItems: 'center' }}>
          <Col lg={9} md={9} sm={9} xs={9}>
            <Input
              style={{ marginBottom: 10 }}
              value={getTimeDurationFromSeconds(begin, true)}
              disabled
              onChange={e => updateSentence('start', e.target.value)}
            />
          </Col>
          <Col lg={3} md={3} sm={3} xs={3} style={{ fontSize: 10 }}>
            <Row style={{ display: 'flex', alignItems: 'center' }}>
              <Col lg={4} md={4} sm={4} xs={4}>
                <Tooltip title="Jump to timestamp">
                  <Button onClick={onClickJumpStart} style={{ fontSize: 10, minWidth: 'unset' }} size="small">Jump</Button>
                </Tooltip>
              </Col>
              <Col lg={8} md={8} sm={8} xs={8}>
                <Tooltip title="Set time to current time">
                  <Button onClick={onClickSetStart} style={{ fontSize: 10, minWidth: 'unset' }} size="small">Set</Button>
                </Tooltip>
              </Col>
            </Row>
          </Col>
        </Row>
        <Row style={{ display: 'flex', alignItems: 'center' }}>
          <Col lg={9} md={9} sm={9} xs={9}>
            <Input
              value={getTimeDurationFromSeconds(end, true)}
              onChange={e => updateSentence('end', e.target.value)}
              disabled
            />
          </Col>
          <Col lg={3} md={3} sm={3} xs={3} style={{ fontSize: 10 }}>
            <Row>
              <Col lg={4} md={4} sm={4} xs={4}>
                <Tooltip title="Jump to timestamp">
                  <Button onClick={onClickJumpEnd} style={{ fontSize: 10, minWidth: 'unset' }} size="small">Jump</Button>
                </Tooltip>
              </Col>
              <Col lg={8} md={8} sm={8} xs={8}>
                <Tooltip title="Set time to current time">
                  <Button onClick={onClickSetEnd} style={{ fontSize: 10, minWidth: 'unset' }} size="small">Set</Button>
                </Tooltip>
              </Col>
            </Row>
          </Col>
        </Row>
      </Col>
      <Col lg={1} md={1} sm={1} xs={1}>
        {id}
      </Col>
      <Col lg={2} md={2} sm={2} xs={2}>
        <Button onClick={handleClickSpeakerName} style={{ fontSize: 10, minWidth: 'unset' }} size="small"> <SpeakerColor color={get(transcriptColor, speaker, '#794bd7')}/> {speaker}</Button>
        {/* <Input type="textarea" value={speakerValue} onChange={handleChangeSpeaker} disabled={isTemporary} /> */}
      </Col>
      <Col lg={5} md={5} sm={5} xs={5}>
        <Input type="textarea" value={noteValue} onChange={handleChangeNote} disabled={isTemporary} />
      </Col>
    </Row>
  )
}

const debounceFilterChange = debounce((type, value, cb) => {
  cb(type, value)
}, 500)

const HeaderRowRenderer = ({ className, style, filters, onChange }) => {
  const { isDecodingBuffer } = useSelector(state => ({ ...state.TRANSCRIPTION }))

  const [notesFilter, setNotesFilter] = useState(filters.lines)

  const handleChangeNote = useCallback(e => {
    setNotesFilter(e.target.value)
    debounceFilterChange('lines', e.target.value, onChange)
  }, [onChange])

  return <Row
    className={className}
    style={style}

  >
    {/* <Col lg={7} md={7} sm={7} xs={7}>
    </Col>
    <Col lg={5} md={5} sm={5} xs={5}>
      <Input value={notesFilter} onChange={handleChangeNote} disabled={isDecodingBuffer} placeholder="Filter transcripts..." />
    </Col> */}
    <Col style={{ padding: '0 15px' }}>
      {
        isDecodingBuffer ? <SkeletonLoader height={34} width="100%" /> : <Input value={notesFilter} onChange={handleChangeNote} disabled={isDecodingBuffer} placeholder="Filter transcripts..." />
      }
    </Col>
  </Row>
}

// const debouncedFilter = debounce((filters, data, setData) => {
//   const filteredData = filterFunction(filters, data)

//   setData(filteredData)
// }, 500)

export const Annotations = ({ add, remove, update, colRef, seekTo, currentTime }) => {
  const [height, setHeight] = useState(100)
  const [width, setWidth] = useState(100)

  const { currentTranscriptIndex, transcripts: notes } = useSelector(state => ({ ...state.TRANSCRIPTION }))
  const [filters, setFilters] = useState({ lines: '' })
  const [filteredNotes, setFilteredNotes] = useState([])

  const [editSpeakerNameModalOpen, setEditSpeakerNameModalOpen] = useState(false)
  const [editSpeakerNameProps, setEditSpeakerNameProps] = useState({})

  const handleOpenSpeakerNameModal = useCallback((props) => {
    setEditSpeakerNameProps(props)
    setEditSpeakerNameModalOpen(true)
  }, [])

  const handleCloseSpeakerNameModal = useCallback(() => {
    setEditSpeakerNameModalOpen(false)
  }, [])

  const resize = useCallback(() => {
    setHeight(document.body.clientHeight - 380)
    if (colRef.current) {
      setWidth(colRef.current.clientWidth - 20) // compensate for scroll bar
    }
  }, [colRef])

  useEffect(() => {
    resize()
    if (!resize.init) {
      resize.init = true
      const debouncedResize = debounce(resize, 500)
      window.addEventListener('resize', debouncedResize)

      return () => window.removeEventListener('resize', debouncedResize)
    }
  }, [resize])

  const rowGetter = ({ index }) => filteredNotes[index]

  const currentIndex = useMemo(() => {
    return filteredNotes.findIndex(({ sentenceId }) => sentenceId === currentTranscriptIndex)
  }, [currentTranscriptIndex, filteredNotes])

  const handleFilterChange = useCallback((type, value) => {
    setFilters(f => ({
      ...f,
      [type]: value,
    }))
  }, [setFilters])

  useEffect(() => {
    const filteredData = filterFunction(filters, notes)

    setFilteredNotes(filteredData)
  }, [filters, notes])

  return (
    <div className="MuiPaper-elevation2">
      <Table
        headerHeight={50}
        headerRowRenderer={({ className, style }) => (
          <HeaderRowRenderer
            className={className}
            style={style}
            filters={filters}
            onChange={handleFilterChange}
          />
        )}
        width={width}
        height={height}
        rowHeight={100}
        scrollToIndex={currentIndex}
        rowCount={filteredNotes.length}
        rowGetter={rowGetter}
        data={filteredNotes}

        rowRenderer={({ className, rowData, style, key, index }) => (
          <TranscriptRow
            className={className}
            style={style}
            add={add}
            remove={remove}
            _key={key}
            key={rowData.sentenceId}
            data={rowData}
            update={update}
            seekTo={seekTo}
            index={index}
            currentTime={currentTime}
            onClickSpeakerName={handleOpenSpeakerNameModal}
          />
        )}
      />
      <EditSpeakerNameModal key={`edit-speaker-name${get(editSpeakerNameProps, "sentenceId", "-")}`} isOpen={editSpeakerNameModalOpen} handleClose={handleCloseSpeakerNameModal} {...editSpeakerNameProps} />
    </div>
  )
}
