import React, { useState } from 'react'
import 'react-dropzone-uploader/dist/styles.css'
import Dropzone from 'react-dropzone'
import { Dropdown, Checkbox, Button, Divider, Message } from 'semantic-ui-react'
import dataProvider from '../dataProvider'
import { useToasts } from 'react-toast-notifications'
import { bandwidth } from '../network'
import { timeFormat } from '../timeFormat'
import filesize from 'filesize'
import '../styles.css'

import { handleError } from '../../actions/TranscriptionActions'
import { useDispatch } from 'react-redux'

/*
  Refer: https://react-dropzone-uploader.js.org/docs/api#onsubmit
*/

const Upload = () => {
  const dispatch = useDispatch()

  const [language, setLanguage] = useState('english')
  const [custom, setCustom] = useState(false)
  const [audioFileObjs, setAudioFileObjs] = useState([])
  const [transcripts, setTranscripts] = useState([])
  const { addToast, removeToast, updateToast } = useToasts()

  // useEffect(() => {
  //     console.log(audioFileObjs);
  // }, [audioFileObjs]);

  const uploadStatus = (message, type) => {
    removeToast(1)

    addToast(message, {
      autoDismiss: true,
      appearance: type,
      autoDismissTimeout: 5000,
    })

    localStorage.removeItem('upload_in_progress')
  }

  const getType = name => {
    const extension = name.split('.')[1]

    if (extension === 'wav' || extension === 'mp3') {
      return 'audio'
    } else if (extension === 'TextGrid') {
      return 'transcript'
    } else {
      return 'unsupported'
    }
  }

  const getResourceType = formData => {
    if (formData.getAll('transcript').length === 0) {
      // only audio mode no transcripts
      return 'upload'
    } else {
      if (formData.getAll('audio').length > 0) {
        // both trasncript and audio present
        return 'import'
      } else {
        return null
      }
    }
  }

  const stripSymbols = name => {
    /*
            Remove in-valid characters from filename
            such as '.' or '(' or ')'
        */
    const parts = name.split('.')

    const extension = parts.pop()
    const nameWithoutExt = parts.join('')

    const letterArr = nameWithoutExt.split('')

    const cleanedName = letterArr.reduce((prev, curr) => {
      if (curr !== ')' && curr !== '(') {
        return prev + curr
      } else {
        return prev
      }
    }, '')

    return cleanedName + '.' + extension
  }

  const options = [
    /*
            Language codes :

            english | eng-malay | eng-mandarin
            malay | mandarin
        */
    {
      key: 1,
      text: 'english',
      value: 'english',
      selected: false,
    },
    {
      key: 2,
      text: 'mandarin',
      value: 'mandarin',
    },
    {
      key: 3,
      text: 'malay',
      value: 'malay',
    },
    {
      key: 4,
      text: 'eng-mandarin',
      value: 'eng-mandarin',
    },
    {
      key: 5,
      text: 'eng-malay',
      value: 'eng-malay',
    },
  ]

  const onSubmit = async () => {
    const $e = document.querySelector(
      '.dzu-submitButtonContainer .dzu-submitButton',
    )

    $e.disabled = true
    $e.style.cursor = 'not-allowed'

    addToast('Preparing file(s) for upload...', {
      autoDismiss: false,
      appearance: 'warning',
      id: 1, // random id
    })

    let timeTakenEstimated = 1 // in seconds

    // checking if the user is online
    if (window.navigator.onLine) {
      const bw = await bandwidth() // in kbps

      const totalKbs = audioFileObjs.reduce((prev, curr) => {
        return prev + curr.file.size / 1000
      }, 0)

      timeTakenEstimated += totalKbs / bw
    } else {
      if (`${process.env.NODE_ENV}` === 'production') {
        // only if the user is using the web version
        // addToast(`You are offline, try again once you're online!`, {
        //     autoDismiss: true,
        //     appearance: 'error',
        //     autoDismissTimeout: 5000,
        // });
        const errMsg = "You are offline, try again once you're online!"
        dispatch(handleError(errMsg))

        return
      }
    }

    /*
            NOT SO ACCURATE AS IT FINISHES
            BEFORE UPLOAD IS ACTUALLY DONE!
        */
    updateToast(1, {
      content: `Upload in progress, total estimated time ${timeFormat(
        timeTakenEstimated,
      )}`,
      autoDismiss: false,
      appearance: 'warning',
    })

    localStorage.setItem('upload_in_progress', 'true')

    // const resource = getResourceType(formData);

    const uploadPromises = []

    for (const obj of audioFileObjs) {
      const formData = new FormData()
      const audioFileName = stripSymbols(obj.file.name)
      formData.append('audio', obj.file, audioFileName)
      const transcriptIndex = obj.transcriptIndex
      if (transcriptIndex > -1) {
        const transcriptFile = transcripts[transcriptIndex]
        const transcriptFileName = stripSymbols(transcriptFile.name)
        formData.append('transcript', transcriptFile, transcriptFileName)
      }
      if (custom) {
        formData.append('language', obj.language)
      } else {
        formData.append('language', language)
      }

      // console.log(formData);

      const resource = getResourceType(formData)

      if (resource) {
        uploadPromises.push(
          dataProvider.speech.create(resource, {
            options: {
              data: formData,
            },
          }),
        )
      } else {
        $e.disabled = false
        $e.style.cursor = 'pointer'

        uploadStatus('Need an audio file along with the transcript!', 'error')
      }
    }

    Promise.all(uploadPromises)
      .then(res => {
        $e.disabled = false
        $e.style.cursor = 'pointer'

        uploadStatus(
          'File(s) uploaded successfully! View status in "My Transcriptions"',
          'success',
        )
      })
      .catch(err => {
        $e.disabled = false
        $e.style.cursor = 'pointer'

        if (err && 'message' in err.response.data) {
          uploadStatus(err.response.data.message, 'error')
        } else {
          uploadStatus('Error Uploading file', 'error')
        }
      })
    setAudioFileObjs([])
    setTranscripts([])
  }

  const toggleLanguage = (e, { value }) => setLanguage(value)

  const handleDrop = acceptedFiles => {
    const acceptedAudioFileObjs = []
    const acceptedTranscripts = []
    for (const file of acceptedFiles) {
      const type = getType(stripSymbols(file.name))
      if (type === 'audio') {
        acceptedAudioFileObjs.push({
          file: file,
          transcriptIndex: -1,
          language: language,
        })
      } else if (type === 'transcript') {
        acceptedTranscripts.push(file)
      }
    }
    setAudioFileObjs([...audioFileObjs, ...acceptedAudioFileObjs])
    setTranscripts([...transcripts, ...acceptedTranscripts])
  }

  const removeAudioFileObj = index => {
    const tempFiles = [...audioFileObjs]
    tempFiles.splice(index, 1)
    setAudioFileObjs(tempFiles)
  }

  const removeTranscript = index => {
    setAudioFileObjs(
      audioFileObjs.map(obj => {
        if (obj.transcriptIndex > -1 && obj.transcriptIndex > index) {
          obj.transcriptIndex -= 1
        }
        return obj
      }),
    )

    const tempFiles = [...transcripts]
    const transcript = tempFiles.splice(index, 1)
    setTranscripts(tempFiles)
    return transcript
  }

  const transcriptSelected = index => {
    return audioFileObjs.reduce((t, { transcriptIndex }) => {
      return t || transcriptIndex === index
    }, false)
  }

  const transcriptOptions = () => {
    const temp = transcripts.map((t, i) => ({
      key: i,
      text: t.name,
      value: i,
      // disabled: transcriptSelected(i),
    }))
    temp.unshift({
      key: -1,
      text: 'None',
      value: -1,
    })
    return temp
  }

  const toggleTranscript = (index, value) => {
    setAudioFileObjs(
      audioFileObjs.map((obj, i) => {
        if (i === index) {
          obj.transcriptIndex = value
        }
        return obj
      }),
    )
  }

  const transcriptDropdown = index => (
    <Dropdown
      className="transcript-dropdown"
      value={audioFileObjs[index].transcriptIndex}
      options={transcriptOptions()}
      onChange={(e, { value }) => toggleTranscript(index, value)}
      selection
    />
  )

  // for language Dropdown for each audio file

  const customToggleLanguage = (index, value) => {
    setAudioFileObjs(
      audioFileObjs.map((obj, i) => {
        if (i === index) {
          obj.language = value
        }
        return obj
      }),
    )
  }

  const langDropdown = index => (
    <Dropdown
      className="language-dropdown"
      text={audioFileObjs[index].language}
      options={options}
      selectOnBlur={false}
      selectOnNavigation={false}
      onChange={(e, { value }) => customToggleLanguage(index, value)}
      selection
    />
  )

  return (
    <div className="upload-container">
      <Dropzone
        onDrop={acceptedFiles => handleDrop(acceptedFiles)}
        accept={['.mp3', '.wav', '.TextGrid']}
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps({ className: 'dzu-dropzone' })}>
            <input {...getInputProps()} />
            <p className="dzu-inputLabel">
              Upload audio file(s) and/or transcripts to continue (Only .mp3,
              .wav, .TextGrid file formats valid)
            </p>
          </div>
        )}
      </Dropzone>
      <br />
      {(audioFileObjs.length > 0 || transcripts.length > 0) && (
        <React.Fragment>
          <div className="dzu-submitButtonContainer">
            <Checkbox
              label="Custom"
              style={{ marginRight: 10 }}
              onChange={(event, { checked }) => setCustom(checked)}
            />
            <Dropdown
              className="language-dropdown"
              text={language}
              options={options}
              selectOnBlur={false}
              selectOnNavigation={false}
              onChange={toggleLanguage}
              selection
              disabled={custom}
            />
            <Button
              content="Submit"
              onClick={onSubmit}
              className="dzu-submitButton"
              disabled={
                !transcripts.reduce((total, curr, index) => {
                  return total && transcriptSelected(index)
                }, true)
              }
            />
          </div>
        </React.Fragment>
      )}
      {audioFileObjs.length > 0 && (
        <React.Fragment>
          <p>Audio Files</p>
          <Divider />
          {audioFileObjs.map((obj, index) => (
            <Message key={index} className="dzu-previewFileMessage">
              <p className="dzu-previewFileName">
                {obj.file.name}, {filesize(obj.file.size)}
              </p>
              <div>
                {custom && langDropdown(index)}
                {transcripts.length > 0 && transcriptDropdown(index)}
                <Button
                  icon="close"
                  onClick={() => removeAudioFileObj(index)}
                />
              </div>
            </Message>
          ))}
        </React.Fragment>
      )}
      <br />
      {transcripts.length > 0 && (
        <React.Fragment>
          <p>Transcripts</p>
          <Divider />
          {transcripts.map((file, index) => (
            <Message key={index} className="dzu-previewFileMessage">
              <p className="dzu-previewFileName">
                {file.name}, {filesize(file.size)}
              </p>
              <Button
                icon="close"
                onClick={() => removeTranscript(index)}
                disabled={transcriptSelected(index)}
              />
            </Message>
          ))}
        </React.Fragment>
      )}
    </div>
  )
}

export default Upload
