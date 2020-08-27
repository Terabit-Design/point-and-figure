import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import { BootstrapVue } from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.use(BootstrapVue)
Vue.config.productionTip = false
import VueWorker from 'vue-worker'
Vue.use(VueWorker)


new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
