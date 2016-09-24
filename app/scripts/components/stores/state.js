import Reflux from 'reflux';
import _ from 'lodash';

var state = Reflux.createStore({
  init(){
    this.state = {
      // Core
      init: true,
      prefs: null,
      // Single item states
      update: null,
      massUpdate: null,
      remove: null,
      create: null,
      // UI
      search: '',
      width: window.innerWidth,
      height: window.innerHeight,
      collapse: window.innerWidth >= 1565,
      tileLimit: 100,
      context: {
        value: null,
        id: null
      },
      relay: {
        value: '',
        id: null
      },
      applyTabOrder: false,
      settings: 'sessions',
      // Chrome data
      tabs: null,
      altTabs: null
    };
  },
  set(obj){
    console.log('STATE INPUT: ', obj);
    _.assignIn(this.state, obj);
    console.log('STATE: ', this.state);
    this.trigger(this.state);
  },
  get(){
    return this.state;
  }
});

window.state = state;
export default state;