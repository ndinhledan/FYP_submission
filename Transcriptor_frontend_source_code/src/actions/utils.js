import { map, sortBy } from 'lodash'

export const processSentences = sentences => {
  const notes = []
  let counter = 1
  const channelSet = new Set()

  for (const s of sortBy(sentences, ({ startTime }) => +startTime)) {

    notes.push({...processOneSentence(s), id: counter + ''})

    channelSet.add(s.channel)
    counter++
  }

  return {
    notes,
    channelSet,
  }
}

// function to transform sentences back to correct form
export const transformSentences = notes => {
  return map(notes, note => ({
    startTime: parseFloat(note.begin),
    endTime: parseFloat(note.end),
    text: note.lines,
    speechId: note.speechId || null,
    channel: note.channel || null,
    speaker: note.speaker || null,
  }))
}

export const transformOneSentence = note => ({
  startTime: parseFloat(note.begin),
  endTime: parseFloat(note.end),
  sentenceId: note.sentenceId,
  text: note.lines,
  speechId: note.speechId || null,
  channel: note.channel || null,
  speaker: note.speaker || null,
})

export const processOneSentence = s => ({
  begin: `${s.startTime}`,
  end: `${s.endTime}`,
  lines: s.text,
  sentenceId: s._id,
  prevText: s.prevText,
  reSpeak: s.respeak,
  speaker: s.speaker,
  channel: s.channel,
})
