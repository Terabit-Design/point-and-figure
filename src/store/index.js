import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    ticker:"",
    iexAPIKey:'Tpk_9951b4c0a965499f87e57c218a866e95',
    iexMode:"sandbox"
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
