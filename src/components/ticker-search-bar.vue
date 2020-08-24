<template>
    <model-select :options="options" v-model="item" placeholder="Search ticker" ref="searchBar"></model-select>
</template>
<script type="text/javascript">
    import 'vue-search-select/dist/VueSearchSelect.css'
    import { ModelSelect } from 'vue-search-select'
    import axios from 'axios'
    export default {
         data(){
            return {
                options: [],
                item:{value: '',text: ''},
                debounce:null,
                debounceDuration:300,
            }
        },
        components: {
          ModelSelect
        },
        mounted(){
            this.$refs.searchBar.$refs.input.addEventListener("input", (e)=>{
                clearTimeout(this.debounce);
                this.debounce = setTimeout(()=>{
                    const query = encodeURIComponent(e.srcElement.value.trim());
                    if(query.length > 0){
                        axios.get(`https://ticker-2e1ica8b9.now.sh/keyword/${query}`).then((res)=>{
                            this.options = res.data.map((stock)=>({
                                "value":stock.symbol, "text":`${stock.symbol},${stock.name}`
                            }))
                        }) 
                    }
                    
                }, this.debounceDuration);
            })
        },
        watch:{
            item:{
                deep:true,
                handler(item){
                    this.$store.commit("setValue",{'ticker':item.value});
                }
            }
        }
    }
</script>