import React, { useState, useEffect } from 'react'
import { Redirect } from 'react-router-dom'
import { Dropdown, Menu, Segment, Container } from 'semantic-ui-react'
import ListTranscriptions from './ListTranscriptions'
import Upload from './Upload'
import Editor from './Editor'
import ReSpeakEditor from './ReSpeakEditor'
import logo from '../../images/ntu-logo.png'
import PropTypes from 'prop-types'
import '../styles.css'

/* Redux imports */
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'

/* import actions */
import {
  enableEditMode,
  enableReSpeakMode,
} from '../../actions/TranscriptionActions'
import { signUserOut } from '../../actions/UserActions'

const Dashboard = props => {
  const [page, setPage] = useState(
    localStorage.getItem('subpage') === null
      ? 'Upload'
      : localStorage.getItem('subpage'),
  )

  const { editId, editMode, respeakId, reSpeakMode } = useSelector(state => ({
    ...state.TRANSCRIPTION,
  }))

  const dispatch = useDispatch()

  const { user } = useSelector(state => ({ ...state.USER }))
  const { name: displayName } = user

  useEffect(() => {
    if (respeakId !== null && !reSpeakMode && !editId) {
      dispatch(enableReSpeakMode())

      localStorage.setItem('subpage', 'Re-speak')
      localStorage.setItem(
        'reSpeakConfig',
        JSON.stringify({ _id: respeakId, active: true }),
      )
      setPage('Re-speak')
    }

    if (editId !== null && !editMode && !respeakId) {
      dispatch(enableEditMode())

      /*
                  LocalStorage use here is not redundant and serves to
                  save the state of the application when refreshed
              */
      localStorage.setItem('subpage', 'Editor')
      localStorage.setItem('loadSavedState', 'false')
      localStorage.setItem(
        'editorConfig',
        JSON.stringify({ _id: editId, active: true }),
      )

      setPage('Editor')
    }
  }, [dispatch, editMode, editId, reSpeakMode, respeakId])

  const handleTabClick = (_, { name }) => {
    console.log(name)
    if (name === 'logout') {
      dispatch(signUserOut())
    } else {
      if (!localStorage.getItem('upload_in_progress')) {
        if (name === 'Editor') {
          if (localStorage.getItem('editorConfig')) {
            const inEditMode = JSON.parse(localStorage.getItem('editorConfig'))
            if (inEditMode.active) {
              localStorage.setItem('loadSavedState', 'true')
            }
          }
        } else if (name === 'Re-speak') {
          if (localStorage.getItem('reSpeakConfig')) {
            const inReSpeakMode = JSON.parse(
              localStorage.getItem('reSpeakConfig'),
            )
            if (inReSpeakMode.active) {
              localStorage.setItem('loadSavedState_ReSpeak', 'true')
            }
          }
        }
        localStorage.setItem('subpage', name)
        setPage(name)
      }
    }
  }

  const getSubPage = type => {
    switch (type) {
      case 'Upload':
        return <Upload />
      case 'My Transcriptions':
        return <ListTranscriptions />
      case 'Editor':
        return <Editor _id={editId} subPageCallback={page => setPage(page)} />
      case 'Re-speak':
        return (
          <ReSpeakEditor
            _id={respeakId}
            subPageCallback={page => setPage(page)}
          />
        )
      default:
        return null
    }
  }

  return (
    <React.Fragment>
      {!localStorage.getItem('token') && (
        <Redirect
          to={{
            pathname: '/login',
            state: 'token-not-matching',
          }}
        />
      )}

      <Segment style={{ height: 100 }} className="elevated-4">
        <Menu stackable secondary>
          <Menu.Item>
            <img src={logo} alt="ntu-logo" style={{ width: '123px' }} />
          </Menu.Item>
          <Menu.Item
            name="Upload"
            active={page === 'Upload'}
            onClick={handleTabClick}
            style={{ marginLeft: '2em' }}
          >
            Upload
          </Menu.Item>

          <Menu.Item
            name="My Transcriptions"
            active={page === 'My Transcriptions'}
            onClick={handleTabClick}
          >
            My Transcriptions
          </Menu.Item>

          <Menu.Item
            name="Re-speak"
            active={page === 'Re-speak'}
            onClick={handleTabClick}
          >
            Re-speak
            {localStorage.getItem('reSpeakConfig') !== null &&
              JSON.parse(localStorage.getItem('reSpeakConfig')).active && (
              <sup>
                <span className="dot"></span>
              </sup>
            )}
          </Menu.Item>

          <Menu.Item
            name="Editor"
            active={page === 'Editor'}
            onClick={handleTabClick}
          >
            Editor
            {localStorage.getItem('editorConfig') !== null &&
              JSON.parse(localStorage.getItem('editorConfig')).active && (
              <sup>
                <span className="dot"></span>
              </sup>
            )}
          </Menu.Item>
          <Menu.Item
            name="Feedback"
            // TODO: handle properly
            onClick={() => { window.open('https://forms.gle/qaDLi5Xp9NrE289U7', '_blank') }}
          >
            {/* <a href="https://forms.gle/qaDLi5Xp9NrE289U7" rel="noreferrer" referrerPolicy="no-referrer" target="_blank"> Feedback </a> */}
          </Menu.Item>

          <Menu.Menu position="right">
            <Dropdown
              text={displayName}
              className="link item"
              style={{ marginRight: '2.5vw' }}
            >
              <Dropdown.Menu>
                <Dropdown.Item name="logout" onClick={handleTabClick}>
                  LOG OUT
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Menu.Menu>
        </Menu>
      </Segment>

      <Container fluid id="main-container">
        {getSubPage(page)}
      </Container>
    </React.Fragment>
  )
}

/*
  Define Dashboard PropTypes
*/
Dashboard.propTypes = {
  location: PropTypes.object,
}

export default Dashboard
