const fsm = {
  state: 'idle',
  transitions: {
    idle: ['listening'],
    listening: ['speaking', 'paused'],
    speaking: ['idle'],
    paused: ['listening']
  },
  listeners: [],
  
  setState(newState) {
    if (this.transitions[this.state].includes(newState)) {
      this.state = newState
      this.listeners.forEach(fn => fn(this.state))
    } else {
      console.warn(`Invalid transition: ${this.state} → ${newState}`)
    }
  },

  subscribeToState(fn) {
    this.listeners.push(fn)
    fn(this.state)
    return () => {
      this.listeners = this.listeners.filter(f => f !== fn)
    }
  }
}

export { setState, subscribeToState }



// import { setState, subscribeToState } from './utils/fsm.js'
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
