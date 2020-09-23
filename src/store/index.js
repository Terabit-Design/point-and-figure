import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    ticker:"",
    iexAPIKey:'Tpk_9951b4c0a965499f87e57c218a866e95',
    iexMode:"sandbox",
    selectedBoxSizingModel:"user",
    selectedBoxSizeValue:null,
    reversalBoxCount:3,
    emaBarCount:2,
    pivotCount: 3,
    atrLength: 1,
    atr:"---",
    traditionalBoxSizes:[
      {
          min: 0,
          max: 5,
          size: 0.25
      },
      {
          min: 5,
          max: 20,
          size: 0.5,
      },
      {
          min: 20,
          max: 100,
          size: 1
      },
      {
          min: 100,
          max: 200,
          size: 2
      },
      {
          min: 200,
          max: Infinity,
          size: 4
      },
    ],
  },
  mutations: {
    setValue(state, payload){
        Object.keys(payload).forEach((key)=>{
            if(key in state){
                state[key] = payload[key]
            }
        })
    }
  },
  actions: {
  },
  modules: {
  }
})
