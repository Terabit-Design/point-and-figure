<template>
  <div class="home">
    <chart :priceData="priceData" ref="chart"></chart>
  </div>
</template>

<script>
import chart from '@/components/chart.vue'
import axios from 'axios'
export default {
  name: 'Home',
  components: {
    chart
  },
  data(){
    return {
        priceData:[]
    }
  },
  methods:{
    async getTickerData(symbol){
        const token = 'pk_9f1292e2c2a840b49228bc0135e3258e';
        const apiLink = `https://cloud.iexapis.com/stable/stock/${symbol}/intraday-prices/?token=${token}`;
        const response = await axios.get(apiLink);
        const responseArray = [];
        response.data.forEach((record)=>{
            const dateArray = record.date.split('-');
            const timeArray = record.minute.split(':');
            const timestamp = new Date(dateArray[0], dateArray[1], dateArray[2], timeArray[0], timeArray[1]).getTime() / 1000;
            const responseObject = {
                date: timestamp,
                high: record.high,
                low: record.low
            }
            if(responseObject.high && responseObject.low){
                responseArray.push(responseObject);
            }
        });
        return responseArray;
    }
  },
  mounted(){
    this.getTickerData("amzn").then((data)=>{
        console.log(data);
        console.log(this.$refs.chart);
        this.$refs.chart.addPriceDataPoint(...data)
    });
  }
}
</script>
