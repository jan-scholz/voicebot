const flags = {
  speechEnabled: false,
  wakeWordDetected: false,
  listeners: []
}

function setFlag(partial) {
  Object.assign(flags, partial)
  flags.listeners.forEach(fn => fn({ ...flags }))
}

function subscribeToFlags(fn) {
  flags.listeners.push(fn)
  fn({ ...flags })
  return () => {
    flags.listeners = flags.listeners.filter(f => f !== fn)
  }
}

export { setFlag, subscribeToFlags }






// import { setFlag, subscribeToFlags } from './utils/flag_store.js'
//
// subscribeToFlags(state => {
//   if (state.wakeWordDetected) {
//     console.log('👂 Wake word heard!')
//   }
// })
//
// subscribeToFlags(newFlags => {
//   console.log('Flags changed:', newFlags)
//
//   if (newFlags.wakeWordDetected && fsm.state === 'idle') {
//     fsm.setState('listening')
//   }
// })
