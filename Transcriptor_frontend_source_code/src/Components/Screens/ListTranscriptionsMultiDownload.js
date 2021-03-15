import React, { useState, useEffect } from 'react'
import { Menu, Card, Input, Checkbox, Button } from 'semantic-ui-react'
import Skeleton from 'react-loading-skeleton' // (https://github.com/dvtng/react-loading-skeleton#readme)
import CustomCard from '../Utils/CustomCard'
import dataProvider from '../dataProvider'
import { useToasts } from 'react-toast-notifications'

import {
  setTranscriptionId,
  handleError,
} from '../../actions/TranscriptionActions'

import { saveAs } from 'file-saver'

const moment = require('moment')
const JSZip = require('jszip')

const ListTranscriptions = () => {
  const [subPage, setSubPage] = useState('Created')
  const [transcriptionList, setTranscriptionList] = useState([])
  const [cardsLoaded, setCardLoaded] = useState(false)
  const [filteredList, setFilteredList] = useState(null)
  const { addToast, removeToast } = useToasts()

  /* 
        Transcription related operations
    */
  const { _id, content: status } = useSelector(state => ({
    ...state.SOCKET.statusData,
  }))
  const { transcriptionId } = useSelector(state => ({ ...state.TRANSCRIPTION }))
  const [statusCache, setStatusCache] = useState(null)

  let dispatch = useDispatch()

  const handleSubTabClick = (e, { name }) => setSubPage(name)

  useEffect(() => {
    if (transcriptionId != null) {
      dataProvider.speech
        .delete('', {
          id: transcriptionId,
        })
        .then(res => {
          addToast('Transcription deleted sucessfully!', {
            autoDismiss: true,
            appearance: 'success',
            autoDismissTimeout: 3000,
          })
        })
        .catch(err => {
          // addToast(err.response.data.message, {
          //     autoDismiss: true,
          //     appearance: 'error',
          //     autoDismissTimeout: 3000,
          // });
          dispatch(handleError(err.response.data.message))
        })

      dispatch(setTranscriptionId(null))
    }

    dataProvider.speech
      .getList('transcriptions', {})
      .then(res => {
        const list = res.data.speeches
        for (let each of list) each.checked = false
        setTranscriptionList(list)
        setCardLoaded(true)
      })
      .catch(err => {
        if (err.response && 'message' in err.response.data) {
          // addToast(err.response.data.message + ' Try, refreshing your page!', {
          //     autoDismiss: true,
          //     appearance: 'error',
          //     autoDismissTimeout: 3000,
          // });
          const errMsg =
            err.response.data.message + ' Try, refreshing your page!'
          dispatch(handleError(errMsg))
        } else {
          // addToast('Error occured fetching transcriptions, please refresh your page and try again!', {
          //     autoDismiss: true,
          //     appearance: 'error',
          //     autoDismissTimeout: 3000,
          // });
          const errMsg =
            'Error occured fetching transcriptions, please refresh your page and try again!'
          dispatch(handleError(errMsg))
        }
      })
  }, [transcriptionId])

  useEffect(() => {
    let cache = []
    for (let each of transcriptionList) {
      if (each.status === 'processing') {
        if (each._id === _id) {
          cache[each._id] = status
        } else {
          if (each._id in statusCache) {
            cache[each._id] = statusCache[each._id]
          } else {
            // check last element in logs array
            let lenLogs = each.logs.length
            if (lenLogs === 0) {
              cache[each._id] = 'processing..'
            } else {
              let lastLog = each.logs[lenLogs - 1]
              cache[each._id] = lastLog.content
            }
          }
        }
      } else {
        cache[each._id] = each.status
      }
    }

    setStatusCache(cache)
  }, [_id, status, transcriptionList])

  const Message = props => (
    <h3 style={{ marginLeft: '2%', color: 'rgba(0,0,0,0.7)', marginTop: '2%' }}>
      {props.message}
    </h3>
  )

  const TranscriptionList = props => {
    return props.list.map((each, key) => {
      const data = {
        _id: each._id,
        path: each.uploadedFile.path,
        uploadedFileId: each.uploadedFile._id,
        filename: each.uploadedFile.originalname,
        createdAt: each.createdAt,
        language: each.language,
        mimeType: each.uploadedFile.mimetype,
        status: statusCache[each._id],
        duration: each.duration,
      }

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: 10,
          }}
        >
          <Checkbox
            // disabled = {each.status === 'processing'}
            checked={each.checked}
            onChange={(event, { checked }) => handleCheckChange(checked, key)}
          />
          <CustomCard key={key} {...data} />
        </div>
      )
    })
  }

  const GhostLoader = () => {
    let elems = []
    for (let i = 0; i < 6; i++) {
      const data = null // denoting it is a loader
      elems.push(<CustomCard key={i} data={data} />)
    }
    return elems
  }

  const searchBarHandler = e => {
    let searchVal = e.target.value.toLowerCase()
    let searchResults = []

    if (searchVal !== '') {
      for (let file of transcriptionList) {
        // Search by filename
        let filename = file.uploadedFile.originalname.toLowerCase()

        if (String(filename).match(String(searchVal))) {
          searchResults.push(file)
        }
      }
    } else {
      searchResults = transcriptionList
    }

    setFilteredList(searchResults)
  }

  const handleCheckChange = (checked, index) => {
    if (filteredList) {
      setFilteredList(
        filteredList.map((t, i) => {
          if (i === index) t.checked = checked
          return t
        }),
      )
    } else {
      setTranscriptionList(
        transcriptionList.map((t, i) => {
          if (i === index) t.checked = checked
          return t
        }),
      )
    }
  }

  const handleSelectAll = (event, { checked }) => {
    if (filteredList) {
      setFilteredList(
        filteredList.map(t => {
          t.checked = checked
          return t
        }),
      )
    } else {
      setTranscriptionList(
        transcriptionList.map(t => {
          t.checked = checked
          return t
        }),
      )
    }
  }

  const downloadSelected = async () => {
    const list = filteredList ? filteredList : transcriptionList

    if (!list.reduce((t, v) => t || v.checked, false)) return

    let downloadZip = new JSZip()

    const folderName = `transcriptor_${new Date().toISOString()}`
    // const downloadFolder = downloadZip.folder(folderName);

    addToast('Preparing files for export, please wait...', {
      autoDismiss: false,
      appearance: 'success',
      id: 2, // random ID
    })

    const downloadPromises = []
    const downloadFilenames = []

    for (let each of list) {
      if (!each.checked) continue

      downloadPromises.push(
        dataProvider.speech.get('export', {
          id: each._id,
          options: {
            responseType: 'blob',
          },
        }),
      )

      let filename = each.uploadedFile.originalname
      let date = moment(each.createdAt).format('LL')
      let time = moment(each.createdAt).format('LT')
      let type = 'zip'

      downloadFilenames.push(`${filename}_${date}_${time}.${type}`)
    }

    try {
      const resArr = await Promise.all(downloadPromises)
      removeToast(2)
      resArr.forEach((res, index) => {
        downloadZip = downloadZip.file(downloadFilenames[index], res.data, {
          binary: true,
        })
      })
      downloadZip.generateAsync({ type: 'blob' }).then(function(blob) {
        saveAs(blob, folderName + '.zip')
      })
    } catch (err) {
      if (err.response && 'message' in err.response.data) {
        // addToast(err.response.data.message, {
        //     autoDismiss: true,
        //     appearance: 'error',
        //     autoDismissTimeout: 3000,
        // });
        dispatch(handleError(err.response.data.message))
      } else {
        // addToast('Network error, please try again!', {
        //     autoDismiss: true,
        //     appearance: 'error',
        //     autoDismissTimeout: 3000,
        // });
        const errMsg = 'Network error, please try again!'
        dispatch(handleError(errMsg))
      }
    }
  }

  return (
    <React.Fragment>
      <Menu tabular style={{ marginLeft: '4%' }}>
        <Menu.Item
          name="Created"
          active={subPage === 'Created'}
          onClick={handleSubTabClick}
        />
        <Menu.Item
          name="Assigned"
          active={subPage === 'Assigned'}
          onClick={handleSubTabClick}
        />
        <Menu.Menu position="right" style={{ width: '500px' }}>
          <Menu.Item style={{ width: '40%' }}>
            {cardsLoaded && (
              <span className="search-results">
                {filteredList
                  ? filteredList.length > 1
                    ? `(${filteredList.length} records found)`
                    : `(${filteredList.length} record found)`
                  : transcriptionList.length > 1
                  ? `(${transcriptionList.length} records found)`
                  : `(${transcriptionList.length} record found)`}
              </span>
            )}
          </Menu.Item>
          <Menu.Item style={{ width: '60%' }}>
            {cardsLoaded ? (
              <Input
                transparent
                icon={{ name: 'search', link: true }}
                placeholder="Search records..."
                onChange={searchBarHandler}
              />
            ) : (
              <Skeleton width={250} height={30} />
            )}
          </Menu.Item>
        </Menu.Menu>
      </Menu>

      {!cardsLoaded && (
        <Card.Group style={{ marginLeft: '4%' }}>
          <GhostLoader />
        </Card.Group>
      )}
      {cardsLoaded &&
        subPage === 'Created' &&
        transcriptionList.length === 0 && (
          <Message
            message={`You haven't uploaded any files for transcriptions!`}
          />
        )}
      {cardsLoaded && subPage === 'Created' && (
        <React.Fragment>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Checkbox label="Select All" onChange={handleSelectAll} />
            <Button
              style={{ marginLeft: 20 }}
              content="Download Selected"
              onClick={downloadSelected}
            />
          </div>
          <Card.Group style={{ marginLeft: '4%' }}>
            {filteredList ? (
              filteredList.length > 0 ? (
                <TranscriptionList list={filteredList} />
              ) : (
                <Message message={`No transcriptions found!`} />
              )
            ) : (
              <TranscriptionList list={transcriptionList} />
            )}
          </Card.Group>
        </React.Fragment>
      )}
      <br />
    </React.Fragment>
  )
}

export default ListTranscriptions
