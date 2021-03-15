const stringTimeFormat = (h, m, s) => {
  let time = ''

  if (h > 0) time += h.toString() + 'h '

  if (m > 0) time += m.toString() + 'm '

  if (s >= 0) time += s.toString() + 's'

  return time
}

export const timeFormat = time => {
  /*
        Inputs time in seconds format to h/m/s
        
        Ex: 337.2s -> 5m 37.2s
            3601.4s -> 1h 1.4s
    */
  time = parseFloat(time)

  let h = 0
  let m = 0
  let s = 0
  h = parseInt(time / 3600)
  time = time - h * 3600
  m = parseInt(time / 60)
  time = time - m * 60
  s = Math.round(time * 10) / 10 // converting to one decimal place

  return stringTimeFormat(h, m, s)
}
