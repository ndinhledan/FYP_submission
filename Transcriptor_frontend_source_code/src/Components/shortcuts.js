import up from '../images/up.png'
import down from '../images/down.png'
import enter from '../images/enter.png'
import ctrlp from '../images/ctrlp.png'
import tab from '../images/tab.png'
import ctrlplus from '../images/ctrlplus.png'
import ctrlminus from '../images/ctrlminus.png'
import incSpeed from '../images/incSpeed.png'
import decSpeed from '../images/decSpeed.png'

export default {
  'out of edit mode': [
    {
      label: 'Move up one sentence',
      icon: up,
      title: 'up arrow',
    },
    {
      label: 'Move down one sentence',
      icon: down,
      title: 'down arrow',
    },
    {
      label: 'Toggle edit mode',
      icon: enter,
      title: 'enter',
    },
    {
      label: 'Toggle play / pause mode',
      icon: ctrlp,
      title: 'ctrl + p',
    },
    {
      label: 'Increase playback speed by 0.1',
      icon: incSpeed,
      title: 'ctrl + >',
    },
    {
      label: 'Decrease playback speed by 0.1',
      icon: decSpeed,
      title: 'ctrl + <',
    },
  ],
  'in edit mode': [
    {
      label: 'Replay sentence from start',
      icon: tab,
      title: 'tab',
    },
    {
      label: 'Increment cursor point 0.1s',
      icon: ctrlplus,
      title: 'ctrl + plus',
    },
    {
      label: 'Decrement cursor point 0.1s',
      icon: ctrlminus,
      title: 'ctrl + minus',
    },
    {
      label: 'Toggle play / pause mode',
      icon: ctrlp,
      title: 'ctrl + p',
    },
    {
      label: 'Increase playback speed by 0.1',
      icon: incSpeed,
      title: 'ctrl + >',
    },
    {
      label: 'Decrease playback speed by 0.1',
      icon: decSpeed,
      title: 'ctrl + <',
    },
  ],
}
