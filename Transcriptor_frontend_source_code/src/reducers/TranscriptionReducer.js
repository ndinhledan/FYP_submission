import { get } from 'lodash'
import { getTranscriptColor } from "./utils"

const initialState = {
  transcriptionList: {},
  assignedTranscriptionList: [],
  isLoadingList: true,
  currentTranscriptListPage: 1,
  transcriptListLimit: 10,
  totalTranscriptionCount: 0,
  totalAssignedTranscriptionCount: 0,
  transcriptionId: null,
  editId: null,
  assignId: null,
  respeakId: null,
  editMode: false,
  ee: null,
  inSaveMode: false,
  sentenceId: null,
  toast: null,
  reSpeakMode: false,
  sentenceIdForReSpeak: 0,
  channel: 'channel1',
  currentTranscriptIndex: 0,
  fileData: null,
  transcripts: null,
  transcriptColor: {},
  isLoading: true,
  isDecodingBuffer: false,
  estimatedDecodingTime: 0,
  isDownloadingAudio: false,
  downloadAudioProgress: 0,
  isSavingTranscripts: false,
  errorMsg: null,
  successMsg: null,
  getSourceError: false,
  channelCount: 0,
  currentChannel: 'all',
  audioSource: null,
  audioBuffer: null,
  audioContext: null,
  audioPlayer: new Audio(),
  wavesurfer: null,
  audioBuffersForChannels: {},
}

const transcriptionReducers = (state = initialState, { type, payload }) => {
  switch (type) {
    case 'UPDATE_TRANSCRIPT_STATUS':
      const { _id, content } = payload

      return {
        ...state,
        transcriptionList: {
          ...state.transcriptionList,
          [_id]: {
            ...state.transcriptionList[_id],
            status: content,
          },
        },
      }
    case 'TRANSCRIPTION_LIST_LOADING':
      return {
        ...state,
        isLoadingList: payload,
      }
    case 'CHANGE_TRANSCRIPT_LIST_PAGE':
      return {
        ...state,
        currentTranscriptListPage: payload,
      }
    case 'CHANGE_TRANSCRIPT_LIST_LIMIT':
      return {
        ...state,
        transcriptListLimit: payload,
      }
    case 'SET_TRANSCRIPTION_LIST':
      const { totalCount = state.totalTranscriptionCount, list } = payload
      return {
        ...state,
        totalTranscriptionCount: totalCount,
        transcriptionList: list,
      }
    case 'SET_ASSIGNED_TRANSCRIPTION_LIST':
      const { assignedList, totalAssignedCount = state.totalAssignedTranscriptionCount } = payload
      return {
        ...state,
        totalAssignedTranscriptionCount: totalAssignedCount,
        assignedTranscriptionList: assignedList,
      }
    case 'SET_WAVESURFER':
      return {
        ...state,
        wavesurfer: payload,
      }
    case 'SET_AUDIO_PLAYER':
      return {
        ...state,
        audioPlayer: payload,
      }
    case 'SET_ERROR':
      return {
        ...state,
        errorMsg: payload,
      }
    case 'SET_SUCCESS':
      return {
        ...state,
        successMsg: payload,
      }
    case 'SET_SOURCE_ERROR':
      return {
        ...state,
        getSourceError: payload,
      }
    case 'SET_AUDIO_SOURCE':
      return {
        ...state,
        audioSource: payload.audioSource,
        audioBuffer: payload.audioBuffer,
        audioContext: payload.audioContext,
        channelCount: payload.channelCount,
        audioBuffersForChannels: payload.audioBuffersForChannels,
        currentChannel: payload.currentChannel,
      }
    case 'CHANGE_CHANNEL':
      return {
        ...state,
        currentChannel: payload,
        audioBuffer: get(
          state.audioBuffersForChannels,
          payload,
          state.audioBuffersForChannels.all,
        ),
      }
    case 'SET_CHANNELS':
      return {
        ...state,
        channels: payload,
      }
    case 'SET_SAVING_TRANSCRIPT':
      return {
        ...state,
        isSavingTranscripts: payload,
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: payload,
      }
    case 'SET_DECODING_BUFFER':
      return {
        ...state,
        isDecodingBuffer: payload,
      }
    case 'SET_DOWNLOADING_AUDIO':
      return {
        ...state,
        isDownloadingAudio: payload,
      }
    case 'SET_DOWNLOAD_AUDIO_PROGRESS':
      return {
        ...state,
        downloadAudioProgress: payload,
      }
    case 'SET_ESTIMATED_DECODING_TIME':
      return {
        ...state,
        estimatedDecodingTime: payload,
      }
    case 'SET_FILE_DATA':
      return {
        ...state,
        fileData: payload,
      }
    case 'SET_TRANSCRIPT':
      const transcriptColor = getTranscriptColor(payload, state.transcriptColor)

      return {
        ...state,
        transcripts: payload,
        transcriptColor,
      }
    case 'ENABLE_EDIT_MODE':
      return { ...state, editMode: true }
    case 'DISABLE_EDIT_MODE':
      return { 
        ...state,
        editMode: false,
        channelCount: 0,
        currentChannel: 'all',
        audioSource: null,
        audioBuffer: null,
        audioContext: null,
        audioPlayer: new Audio(),
        wavesurfer: null,
        audioBuffersForChannels: {},
      }
    case 'SET_TRANSCRIPTION_ID_FOR_EDIT':
      return { ...state, editId: payload }
    case 'SET_TRANSCRIPTION_ID_FOR_ASSIGN':
      return { ...state, assignId: payload }
    case 'ENABLE_RESPEAK_MODE':
      return { ...state, reSpeakMode: true }
    case 'DISABLE_RESPEAK_MODE':
      return { ...state, reSpeakMode: false }
    case 'SET_TRANSCRIPTION_ID_FOR_RESPEAK':
      return { ...state, respeakId: payload }
    case 'ADD_SECTION_FOR_RESPEAK':
      return { ...state, sentenceIdForReSpeak: payload }
    case 'SAVE_EVENT_EMITTER':
      return { ...state, ee: payload }
    case 'TOGGLE_SAVE_MODE':
      return { ...state, inSaveMode: payload }
    case 'DELETE_TRANSCRIPTION':
      return { ...state, transcriptionId: payload }
    case 'SET_TRANSCRIPTION_ID':
      return { ...state, transcriptionId: payload }
    case 'DELETE_SENTENCE':
      return { ...state, sentenceId: payload }
    case 'SET_SENTENCE_ID':
      return { ...state, sentenceId: payload }
    case 'ADD_TOAST':
      return { ...state, toast: payload }
    case 'CHANGE_TRANSCRIPT_INDEX':
      return {
        ...state,
        currentTranscriptIndex: payload,
      }
    default:
      return state
  }
}

export default transcriptionReducers
