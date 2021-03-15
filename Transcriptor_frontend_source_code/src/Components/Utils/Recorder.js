/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react'
import { Grid, Menu } from 'semantic-ui-react'
import SideSegment from './SideSegment'
import localforage from 'localforage'
import $ from 'jquery'
import '../styles.css'

import { useSelector } from 'react-redux'

// for storing audio segments before submit in re-speak editor
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'respeak-audio-segments',
})

const Recorder = props => {
  const { notes } = props.data
  const [activeSentence, setActiveSentence] = useState(0)
  const [prevScroll, setPrevScroll] = useState(0)
  const [sentenceDone, setSentenceDone] = useState(new Set())
  const [sentenceInEdit, setSentenceInEdit] = useState(new Set())
  const [allFiles, setAllFiles] = useState(null)

  const { sentenceIdForReSpeak } = useSelector(state => ({
    ...state.TRANSCRIPTION,
  }))

  useEffect(() => {
    localforage.getItem('allFiles', (err, res) => {
      if (!res) {
        const init = notes.map(_ => ({ status: null, files: [] }))
        setAllFiles(init)
        localforage.setItem('allFiles', init)
      } else {
        localforage.getItem('allFiles', (err, res) => {
          setAllFiles(res)
        })
      }
    })

    /*
            Detecting page refresh, so once re-freshed
            `once-loaded` needs to removed from localStorage
        */
    window.addEventListener('unload', _ => {
      localStorage.removeItem('once-loaded')
    })
  }, [])

  useEffect(() => {
    setActiveSentence(sentenceIdForReSpeak)
    if (document.readyState === 'complete') {
      const $e = document.getElementById(`menu-item-${sentenceIdForReSpeak}`)
      $e && $e.scrollIntoView()
    }
  }, [sentenceIdForReSpeak])

  useEffect(() => {
    /*
            Sync storage when switching between sentences.
        */
    localforage.getItem('allFiles', (err, res) => {
      if (res) {
        setAllFiles(res)
      }
    })
  }, [activeSentence])

  const $waveform = $('.playlist-tracks')[0]
  const $sentenceSectionBoxes = document.getElementsByClassName(
    'annotation-box',
  )

  const addSectionHighlight = $element => {
    $element.classList.add('section-highlight')
  }

  const removeSectionHighlight = $element => {
    $element.classList.remove('section-highlight')
  }

  const removeAllSectionHighlights = () => {
    Array.from($sentenceSectionBoxes).map($e => removeSectionHighlight($e))
  }

  $waveform.addEventListener('scroll', e => {
    e.preventDefault()

    setPrevScroll($waveform.scrollLeft)
  })

  const scrollToSection = sentenceId => {
    addSectionHighlight($sentenceSectionBoxes[sentenceId - 1])

    // minus 20 for a little margin from the left
    const scrollVal =
      parseInt($sentenceSectionBoxes[sentenceId - 1].style.left) - 20

    $waveform.scrollTo({
      left: prevScroll + scrollVal,
      top: 0,
      behavior: 'smooth',
    })

    setPrevScroll(prevScroll => prevScroll + scrollVal)
  }

  const addSentenceToDone = id => {
    setSentenceDone(sentenceDone => new Set(sentenceDone).add(id))
  }

  const removeSentenceFromDone = id => {
    if (sentenceDone.has(id)) {
      const copySet = new Set(sentenceDone)
      copySet.delete(id)

      setSentenceDone(copySet)
    }
  }

  const addSentenceToEdit = id => {
    removeSentenceFromDone(id)
    setSentenceInEdit(sentenceInEdit => new Set(sentenceInEdit).add(id))
  }

  const removeSentenceFromEdit = id => {
    if (sentenceInEdit.has(id)) {
      const copySet = new Set(sentenceInEdit)
      copySet.delete(id)

      setSentenceInEdit(copySet)
    }
  }

  const handleSentenceClick = (_, { name }) => {
    removeAllSectionHighlights()

    const sentenceId = parseInt(name.split(' ')[1]) - 1
    setActiveSentence(sentenceId)

    scrollToSection(sentenceId + 1)
  }

  const getStatus = id => {
    if (!localStorage.getItem('once-loaded')) {
      /*
                after reload or when page is opened for the first time
                use indexedDB for cached status
            */
      if (allFiles) {
        if (allFiles[id].status === 'saved') return 'done'
        else if (allFiles[id].status === 'in-edit') return 'in-edit'

        if (id === allFiles.length - 1) {
          // update cached statuses to state

          const doneList = []
          const editList = []

          for (const idx in allFiles) {
            if (allFiles[idx].status === 'saved') {
              doneList.push(parseInt(idx))
            } else if (allFiles[idx].status === 'in-edit') {
              editList.push(parseInt(idx))
            }
          }

          doneList.length > 0 && setSentenceDone(new Set(doneList))
          editList.length > 0 && setSentenceInEdit(new Set(editList))

          localStorage.setItem('once-loaded', 'true')
        }
      }
    } else {
      if (sentenceDone.has(id)) return 'done'
      else if (sentenceInEdit.has(id)) return 'in-edit'
    }

    if (notes[id].reSpeak.status === 1) {
      return 'respeak-in-progress'
    } else if (notes[id].reSpeak.status === 2) {
      return 'respeak-done'
    } else if (notes[id].reSpeak.status === 3) {
      return 'respeak-failed'
    }
    return '' // never done respeak before
  }

  const SideSentenceMenu = allFiles ? (
    notes.map(sentence => {
      const sentenceId = parseInt(sentence.id)
      const sentenceIndex = sentenceId - 1
      const status = getStatus(sentenceIndex)
      return (
        <Menu.Item
          key={sentenceIndex}
          name={`Sentence ${sentenceId}`}
          active={activeSentence === sentenceIndex}
          onClick={handleSentenceClick}
          id={`menu-item-${sentenceIndex}`}
          className={status}
          title={status}
        />
      )
    })
  ) : (
    <></>
  )

  const sentenceSaved = id => {
    // remove from edit set and push into saved set
    removeSentenceFromEdit(id)
    addSentenceToDone(id)
  }

  const nullifySentence = id => {
    removeSentenceFromDone(id)
    removeSentenceFromEdit(id)
  }

  const callbacks = {
    sentenceSaved,
    addSentenceToEdit,
    nullifySentence,
  }

  return (
    <Grid>
      <Grid.Column width={3}>
        <Menu fluid vertical tabular>
          {SideSentenceMenu}
        </Menu>
      </Grid.Column>

      <Grid.Column stretched width={13}>
        {allFiles && (
          <SideSegment
            activeSentence={activeSentence}
            sentenceInfo={notes[activeSentence]}
            sentenceFiles={allFiles[activeSentence].files}
            sentenceStatus={allFiles[activeSentence].status}
            callbacks={callbacks}
          />
        )}
      </Grid.Column>
    </Grid>
  )
}

export default Recorder
