<template>
  <div class="home">
    <header class="main-header">
        <b-container fluid>
            <b-row align-h="around" align-v="center">
                <b-col cols="11" md="4" lg="5">
                    <ticker-search-bar class="ticker-search-bar"></ticker-search-bar>
                </b-col>
                <b-col cols="11" md="7" lg="7">
                    <div class="header-button-row">
                        <button 
                            :class="{'header-button-row-button':true,'active':range.value == selectedRange}" 
                            v-for="range in rangeButtonList" 
                            :key="range.value"
                            @click="selectedRange = range.value">{{range.text}}</button>
                    </div>
                </b-col>
            </b-row>
        </b-container>
    </header>
    <b-container fluid>
        <b-row align-h="center" align-v="center"  class="box-sizing-container">
            <b-col cols="11" md="3" order="1">
                <section>
                    <label>Sizing Method</label>
                    <b-form-select v-model="selectedBoxSizingModel" :options="boxSizingList"></b-form-select>
                </section>
            </b-col>
             <b-col cols="11" md="3" order="2" order-md="3">
                <section v-show="selectedBoxSizingModel != 'traditional'">
                    <label>{{boxSizeValueLabel[selectedBoxSizingModel]}}</label>
                    <b-form-input v-model="selectedBoxSizeValue" placeholder="Number of days" type="number" class="box-input"></b-form-input>
                </section>
             </b-col>
            <b-col cols="11" md="3" order="3" order-md="2">
                <section>
                    <label>Number of boxes for a reversal</label>
                    <b-form-input v-model="reversalBoxCount" placeholder="Number of boxes for a reversal" type="number" class="box-input"></b-form-input>
                </section>
            </b-col>
        </b-row>
    </b-container>
    <chart :priceData="priceData" ref="chart"></chart>
  </div>
</template>

<script>
import axios from 'axios'
import chart from '@/components/chart.vue';
import tickerSearchBar from '@/components/ticker-search-bar.vue';
export default {
    name: 'Home',
    components: {
        chart,
        tickerSearchBar,
    },
    data(){
        return {
            priceData:[],
            rangeButtonList:[
                {text:"1 day", value:"1d"},
                {text:"5 days", value:"5d"},
                {text:"1 month", value:"1m"},
                {text:"6 months", value:"6m"},
                {text:"YTD", value:"ytd"},
                {text:"1 year", value:"1y"},
                {text:"5 years", value:"5y"},
                {text:"Max", value:"max"},
            ],
            boxSizingList:[
                {"text":"Traditional",value:"traditional"},
                {"text":"Dynamic (ATR)", value:"atr"}
            ],
            boxSizeValueLabel:{
                atr:"Number of Days",
            },
            selectedRange:'1m',
            selectedBoxSizingModel:"traditional",
            selectedBoxSizeValue:null,
            boxSizeValueDebounce:null,
            reversalBoxCountDebounce:null,
            reversalBoxCount:3,
        }
    },
    methods:{
        async getTickerData(symbol, range){
            const baseUrl = (this.$store.state.iexMode == "sandbox") ? "https://sandbox.iexapis.com/" : "https://cloud.iexapis.com/"
            const token = this.$store.state.iexAPIKey;
            const apiLink = (range == "1d") ?
                `stable/stock/${symbol}/intraday-prices/?token=${token}` :
                `stable/stock/${symbol}/chart/${range}/?token=${token}`;
            const response = await axios.get(baseUrl + apiLink);
            const responseArray = [];
            response.data.forEach((record)=>{
                const dateArray = record.date.split('-');
                if(record.minute){
                    dateArray.push(...record.minute.split(':'))
                }
                const timestamp = new Date(...dateArray).getTime();
                const responseObject = {
                    date: timestamp,
                    high: record.high,
                    low: record.low,
                    close: record.close
                }
                if(responseObject.high && responseObject.low && responseObject.close){
                    responseArray.push(responseObject);
                }
            });
            return responseArray;
        },
        async loadChartData(){
            if(this.ticker.length > 0){ 
                const data = await this.getTickerData(this.ticker, this.selectedRange);
                this.$refs.chart.resetGraph();
                await this.$nextTick();
                this.$refs.chart.addPriceDataPoint(...data)
            }
        }
    },
    computed:{
        ticker(){
            return this.$store.state.ticker;
        }
    },
    watch:{
        ticker(){
            this.loadChartData();
        },
        selectedRange(){
            this.loadChartData();
        },
        selectedBoxSizingModel(model){
            this.$store.commit('setValue',{"selectedBoxSizingModel":model});
            if(model=="traditional" || this.selectedBoxSizeValue && this.selectedBoxSizeValue.length > 0 && this.reversalBoxCount && parseFloat(this.reversalBoxCount) > 0){
                this.loadChartData();
            }
        },
        selectedBoxSizeValue(value){
            clearTimeout(this.boxSizeValueDebounce);
            this.boxSizeValueDebounce = setTimeout(()=>{
                this.$store.commit('setValue',{"selectedBoxSizeValue":parseFloat(value)});
                if(this.selectedBoxSizingModel=="traditional" || value && value.length > 0 && parseFloat(value) > 0 && this.reversalBoxCount && parseFloat(this.reversalBoxCount) > 0){
                    this.loadChartData();
                } 
            },300);
        },
        reversalBoxCount(value){
            clearTimeout(this.reversalBoxCountDebounce);
            this.reversalBoxCountDebounce = setTimeout(()=>{
                this.$store.commit('setValue',{"reversalBoxCount":parseFloat(value)});
                if(this.selectedBoxSizingModel=="traditional" || value && value.length > 0 && parseFloat(value) > 0 && this.selectedBoxSizeValue && this.selectedBoxSizeValue.length > 0){
                    this.loadChartData();
                } 
            },300);
        },
    }
}
</script>
<style lang="scss">
    .main-header{
        --bg-color: #2253a1;
        background-color: var(--bg-color);
        box-shadow: 0 5px 15px rgba(33,50,90, 0.1);
    }
    .main-header-label{
        margin-top: 1%;
        color: #FFF;
    }
    .ticker-search-bar{
        margin: 2%;
    }
    .date-picker{
        margin: 2%;
        input{
            width: 100%;
        }
    }
    .header-button-row{
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        flex-wrap: wrap;
    }
    .header-button-row-button{
        all:unset;
        white-space: nowrap;
        cursor: pointer;
        margin: 1%;
        padding: 1%;
        color: #FFF;
        transition: background-color 0.15s ease-in-out;
        position: relative;
        border-radius: 999em;
        &:hover,
        &.active{
            background-color: #FFF;
            color: var(--bg-color);
        }
        &:active,
        &:focus{
            outline: none;
        }
    }
    .box-sizing-container{
        margin: 1% 0;
    }
    .box-input::placeholder{
        color: #AAA !important;
    }
</style>
