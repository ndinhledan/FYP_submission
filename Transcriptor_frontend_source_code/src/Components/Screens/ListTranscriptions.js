/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Menu, Input, Dropdown, Checkbox, Button as SUIButton } from 'semantic-ui-react'
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton' // (https://github.com/dvtng/react-loading-skeleton#readme)
import { useToasts } from 'react-toast-notifications'

/* import react-redux hook for getting state */
import { useSelector, useDispatch } from 'react-redux'

import { CustomTranscriptCard } from '../Utils/CustomTranscriptCard'
import { debounce, values, filter } from 'lodash'
import styled from 'styled-components'
import { IconButton } from '@material-ui/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  changeTranscriptListLimit,
  changeTranscriptListPage,
  getTranscriptionList,
  getAssignedTranscriptionList,
  handleError,
} from '../../actions/TranscriptionActions'
import MaterialMenu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import Button from '@material-ui/core/Button'
import { getTranscriptionStatus } from '../Utils/utils'
import dataProvider from '../dataProvider'

import { saveAs } from 'file-saver'
const moment = require('moment')
const JSZip = require('jszip')

const TranscriptionListWrapper = styled.div`
  height: calc(100vh - 280px);
  display: flex;
  flex-direction: column;
  overflow: auto;

  .MuiCard-root:not(:last-child) {
    margin-bottom: 10px;
  }
`
const TranscriptionListActionWrapper = styled.div`
  height: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  border-top: 1px solid rgba(81, 81, 81, 1);
  padding-right: 5%;
`

const debouncedSearch = debounce((searchString, list, action) => {
  if (searchString !== '') {
    action(
      filter(list, file => {
        const filename = file.uploadedFile.originalname.toLowerCase()
        return String(filename).match(String(searchString.toLowerCase()))
      }),
    )
  } else {
    action(values(list))
  }
}, 300)

const TranscriptPaginationActions = ({
  count,
  page,
  rowsPerPage,
  onChangePage,
  onChangePageLimit,
  limitOptions = [],
}) => {
  const [limitMenuAnchorEl, setLimitMenuAnchorEl] = useState(null)

  const handleClose = useCallback(() => {
    setLimitMenuAnchorEl(null)
  }, [])

  const handleFirstPageClick = e => {
    onChangePage(e, 1)
  }

  const handlePreviousPageClick = e => {
    onChangePage(e, page - 1)
  }

  const handleNextPageClick = e => {
    onChangePage(e, page + 1)
  }

  const lastPage = Math.ceil(count / rowsPerPage)

  const handleLastPageClick = e => {
    onChangePage(e, lastPage)
  }

  return (
    <TranscriptionListActionWrapper>
      <div>Rows per page: </div>
      <Button
        style={{ margin: '0 20px' }}
        onClick={e => setLimitMenuAnchorEl(e.currentTarget)}
      >
        {rowsPerPage} &nbsp; <FontAwesomeIcon icon="chevron-down" />{' '}
      </Button>
      <MaterialMenu
        id="simple-menu"
        anchorEl={limitMenuAnchorEl}
        keepMounted
        open={Boolean(limitMenuAnchorEl)}
        onClose={handleClose}
      >
        {limitOptions.map(val => (
          <MenuItem
            key={val}
            onClick={() => {
              onChangePageLimit(val)
              handleClose()
            }}
          >
            {val}
          </MenuItem>
        ))}
      </MaterialMenu>
      <div style={{ marginRight: 10 }}>
        <div>{`${(page - 1) * rowsPerPage + 1}-${Math.min(
          count,
          page * rowsPerPage,
        )} of ${count}`}</div>
      </div>

      <IconButton onClick={handleFirstPageClick} disabled={page === 1}>
        <FontAwesomeIcon icon="angle-double-left" />
      </IconButton>
      <IconButton onClick={handlePreviousPageClick} disabled={page === 1}>
        {' '}
        <FontAwesomeIcon icon="angle-left" />{' '}
      </IconButton>
      <IconButton onClick={handleNextPageClick} disabled={page >= lastPage}>
        {' '}
        <FontAwesomeIcon icon="angle-right" />{' '}
      </IconButton>
      <IconButton onClick={handleLastPageClick} disabled={page >= lastPage}>
        {' '}
        <FontAwesomeIcon icon="angle-double-right" />{' '}
      </IconButton>
    </TranscriptionListActionWrapper>
  )
}

const ListTranscriptions = () => {
  const [subPage, setSubPage] = useState('Created')
  const {
    transcriptionList,
    assignedTranscriptionList,
    isLoadingList,
    currentTranscriptListPage,
    transcriptListLimit,
    totalTranscriptionCount,
    totalAssignedTranscriptionCount
  } = useSelector(state => ({ ...state.TRANSCRIPTION }))
  const user = useSelector(state => state.USER.user)

  const [filteredList, setFilteredList] = useState(values(transcriptionList))
  const [filterString, setFilterString] = useState('')
  
  const { addToast, removeToast } = useToasts()

  const handleSubTabClick = (e, { name }) => {
    setFilterString('')
    setSubPage(name)
    dispatch(changeTranscriptListPage(1, transcriptListLimit))
    if (name === 'Created') {
      setFilteredList(values(transcriptionList))
    } else if (name === 'Assigned') {
      setFilteredList(values(assignedTranscriptionList))
    }
  }
  const dispatch = useDispatch()

  useEffect(() => {
    if (subPage.toLowerCase() === 'created') {
      dispatch(
        getTranscriptionList(currentTranscriptListPage, transcriptListLimit),
      )
    } else if (subPage.toLowerCase() === 'assigned') {
      dispatch(
        getAssignedTranscriptionList(
          currentTranscriptListPage,
          transcriptListLimit,
          false,
        ),
      )
    }
  }, [dispatch, currentTranscriptListPage, transcriptListLimit, subPage])

  const [complete, setComplete] = useState(false)
  const [assignedRole, setAssignedRole] = useState('')

  const handleCheckChange = (checked, index) => {
    setFilteredList(
      filteredList.map((t, i) => {
        if (i === index) t.checked = checked
        return t
      }),
    )
  }

  const handleSelectAll = (event, { checked }) => {
    setFilteredList(
      filteredList.map(t => {
        t.checked = checked
        return t
      }),
    )
  }

  const isAnyChecked = useMemo(() => filteredList.reduce((t, v) => t || v.checked, false), [filteredList])

  const downloadSelected = async () => {
    const list = filteredList

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

    for (const each of list) {
      if (!each.checked) continue

      downloadPromises.push(
        dataProvider.speech.post('export', {
          id: each._id,
          options: {
            responseType: 'blob',
          },
        }),
      )

      const filename = each.uploadedFile.originalname
      const date = moment(each.createdAt).format('LL')
      const time = moment(each.createdAt).format('LT')
      const type = 'zip'

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
        status: getTranscriptionStatus(each),
        duration: each.duration,
        isLoading: false,
        subPage: subPage,
        assignedRole: subPage === 'Assigned' ? each.assignedRole : '',
        assignmentComplete:
          subPage === 'Assigned' ? each.assignmentComplete : '',
        transcriptionCorrect:
          subPage === 'Assigned' ? each.transcriptionCorrect : '',
      }

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: 10,
          }}
          key={key}
        >
          <Checkbox
            checked={each.checked}
            onChange={(event, { checked }) => handleCheckChange(checked, key)}
            style={{margin: 10}}
          />
          <CustomTranscriptCard key={key} {...data} />
        </div>
      )
      // <CustomCard key={key} {...data} />;
    })
  }

  const GhostLoader = () => {
    const elems = []
    for (let i = 0; i < 6; i++) {
      elems.push(<CustomTranscriptCard key={i} isLoading={true} />)
    }
    return elems
  }

  useEffect(() => {
    if (subPage === 'Created') {
      debouncedSearch(filterString, transcriptionList, setFilteredList)
    } else if (subPage === 'Assigned') {
      debouncedSearch(filterString, assignedTranscriptionList, setFilteredList)
    }
  }, [filterString, transcriptionList, assignedTranscriptionList, subPage])

  const searchBarHandler = e => {
    const searchVal = e.target.value.toLowerCase()
    setFilterString(searchVal)
  }

  const getSubPage = (subpage, list) => {
    if (subpage === 'Created') {
      if (!list.length) {
        return <h3 style={{ textAlign: 'center' }}>No transcriptions found!</h3>
      } else {
        return <TranscriptionList list={list} />
      }
    }

    if (subpage === 'Assigned') {
      if (!list.length) {
        return <h3 style={{ textAlign: 'center' }}>No transcriptions found!</h3>
      } else {
        return <TranscriptionList list={list} />
      }
    }

    return <div>lala</div>
  }

  const handleChangePage = useCallback(
    (e, page) => {
      dispatch(changeTranscriptListPage(page, transcriptListLimit))
    },
    [transcriptListLimit, dispatch],
  )

  const handleChangeLimit = useCallback(
    limit => {
      dispatch(changeTranscriptListLimit(currentTranscriptListPage, limit))
    },
    [currentTranscriptListPage, dispatch],
  )

  useEffect(() => {
    dispatch(
      getAssignedTranscriptionList(
        1,
        transcriptListLimit,
        complete,
        assignedRole,
      ),
    )
  }, [complete, assignedRole, dispatch])

  const completeOptions = [
    {
      key: true,
      text: 'Complete',
      value: true,
    },
    {
      key: false,
      text: 'Incomplete',
      value: false,
    },
  ]

  const roleOptions = [
    {
      key: 'all',
      text: 'All',
      value: 'all',
    },
    ...user.roles.map(role => ({
      key: role,
      text: role.charAt(0).toUpperCase() + role.slice(1),
      value: role,
    })),
  ]

  const AssignedFilters = () => {
    const filterStyle = {
      display: 'flex',
      width: '100%',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: 10,
    }

    const labelStyle = {
      marginLeft: 15,
      marginRight: 15,
      fontSize: 'large',
      marginTop: 'auto',
      marginBottom: 'auto',
    }

    return (
      <div style={filterStyle}>
        <p style={labelStyle}>Complete: </p>
        <Dropdown
          defaultValue={false}
          selection
          options={completeOptions}
          onChange={(event, data) => setComplete(data.value)}
        />
        <p style={labelStyle}>Role: </p>
        <Dropdown
          defaultValue={'all'}
          selection
          options={roleOptions}
          onChange={(event, data) =>
            setAssignedRole(data.value === 'all' ? '' : data.value)
          }
        />
      </div>
    )
  }

  return (
    <React.Fragment>
      <Menu tabular style={{ height: 50 }}>
        <div className="btn-group">
          <Menu.Item
            name="Created"
            active={subPage === 'Created'}
            onClick={handleSubTabClick}
          />
          <Menu.Item
            name="Assigned"
            active={subPage === 'Assigned'}
            onClick={handleSubTabClick}
            disabled={!user.roles.length}
          />
        </div>
        <Menu.Menu position="right" style={{ width: '500px' }}>
          <div style={{ width: '40%', display: 'flex' }}>
            {!isLoadingList && (
              <span className="search-results" style={{ margin: 'auto' }}>
                {filteredList.length > 1
                  ? `(${filteredList.length} records found)`
                  : `(${filteredList.length} record found)`}
              </span>
            )}
          </div>
          <div style={{ width: '60%', display: 'flex', alignItems: 'center' }}>
            {!isLoadingList ? (
              <Input
                icon={{ name: 'search', link: true }}
                placeholder="Search records..."
                onChange={searchBarHandler}
              />
            ) : (
              <SkeletonTheme
                color="rgba(0, 0, 0, 0.4)"
                highlightColor="rgba(0, 0, 0, 0.5)"
              >
                <Skeleton width={250} height={30} />
              </SkeletonTheme>
            )}
          </div>
        </Menu.Menu>
      </Menu>
      {!isLoadingList && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', margin: 10 }}>
            <Checkbox label={<label style={{color: 'white'}}>Select All</label>} onChange={handleSelectAll} />
            <SUIButton
              style={{ marginLeft: 20 }}
              content="Download Selected"
              onClick={downloadSelected}
              disabled={!isAnyChecked}
            />
          </div>)
      }
      {subPage === 'Assigned' && AssignedFilters()}
      <TranscriptionListWrapper>
        {isLoadingList ? <GhostLoader /> : getSubPage(subPage, filteredList)}
      </TranscriptionListWrapper>
      <TranscriptPaginationActions
        count={subPage === 'Assigned' ? totalAssignedTranscriptionCount : totalTranscriptionCount}
        page={currentTranscriptListPage}
        rowsPerPage={transcriptListLimit}
        onChangePage={handleChangePage}
        onChangePageLimit={handleChangeLimit}
        limitOptions={[10, 20, 30, 50, 100, 200]}
      />
    </React.Fragment>
  )
}

export default ListTranscriptions
