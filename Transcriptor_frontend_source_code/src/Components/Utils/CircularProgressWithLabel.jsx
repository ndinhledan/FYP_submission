import React from 'react'
import CircularProgress from '@material-ui/core/CircularProgress'
import Typography from '@material-ui/core/Typography'
import Box from '@material-ui/core/Box'

import { get } from 'lodash'
import { useSelector } from 'react-redux'

export const CircularProgressWithLabel = (props) => {
  const { downloadAudioProgress, isDownloadingAudio } = useSelector(state => ({ ...state.TRANSCRIPTION }))

  return (
    <Box position="relative" display="inline-flex" flexDirection="column" alignItems="center">
      <CircularProgress variant="determinate" {...props} value={isDownloadingAudio ? downloadAudioProgress : props.value} />
      <Box
        top={0}
        left="50%"
        style={{ transform: 'translateX(-50%)' }}
        position="absolute"
        display="flex"
        alignItems="center"
        justifyContent="center"
        width={get(props, 'style.width', 60)}
        height={get(props, 'style.height', 60)}
      >
        <Typography variant="caption" component="div" color="textSecondary" style={{ color: '#fff' }}>{`${Math.round(
            isDownloadingAudio ? downloadAudioProgress : props.value,
          )}%`}</Typography>
      </Box>
      <Typography variant="caption" component="div" color="textSecondary" style={{ color: '#fff', marginTop: 5 }}>{isDownloadingAudio ? 'Downloading...' : 'Decoding...'}</Typography>
    </Box>
  )
}
