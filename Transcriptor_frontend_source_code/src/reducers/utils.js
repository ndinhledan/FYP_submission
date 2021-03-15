import { groupBy, keys, get } from 'lodash'

const colorLists = [
  '#d2b453',
  '#e91d1a',
  '#f776d7',
  '#fc585b',
  '#62d7a2',
  '#5d02ed',
  '#90e06c',
  '#e79e15',
  '#54b158',
  '#d8a940',
  '#786fc7',
  '#616d70',
  '#bce0ab',
  '#568a49',
  '#21dd2d',
  '#343c93',
  '#d9c9c7',
]

export const getTranscriptColor = (transcripts, colors) => {
  const speakerGroupBy = groupBy(transcripts, 'speaker')

  const speakers = keys(speakerGroupBy)

  return speakers.reduce((acc, speaker, i) => {
    return {
      ...acc,
      [speaker]: get(colors, speaker, get(colorLists, i, `#${Math.floor(Math.random() * 16777215).toString(16)}`)),
    }
  }, {})
}
