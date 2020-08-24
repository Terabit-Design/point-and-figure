<template>
    <div ref="chart"></div>
</template>
<script type="text/javascript">
    import { createChart, CrosshairMode } from 'lightweight-charts';
    export default {
        data(){
            return {
                chart:null,
                series:null,
                bars:{
                    minDate:null,
                    maxDate:0,
                    data:[]
                },
                prices:{},
                defaultReversal:3,
                defaultBoxSizes:[
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
                currentHigh: null,
                currentLow: null,
                priceDirection:0,
            }
        },
        methods:{
            resetGraph(){
                this.priceDirection = 0;
                this.currentHigh = null;
                this.currentLow = null;
                this.prices = [];
                this.bars = {
                    minDate:null,
                    maxDate:0,
                    data:[]
                };
            },
            graphData(){
                const candlestickData = [];
                this.bars.data.forEach((bar)=>{
                    const high = Math.max(...bar.prices);
                    const low = Math.min(...bar.prices);
                    const open = (bar.direction == "O") ? high : low;
                    const close = (bar.direction == "O") ? low : high;
                    const time = bar.time;
                    candlestickData.push({high,low,open,close,time});
                })
                if(candlestickData.length > 0){
                    this.series.setData(candlestickData);
                    this.chart.timeScale().setVisibleRange({
                        from: this.bars.minDate,
                        to: this.bars.maxDate,
                    });
                }
            },
            addPriceDataPoint(){
                const priceData = [...arguments];
                priceData.forEach((price)=>{
                    // Ignore prices with a timestamp less that the current max timestamp
                    if(price.date > this.bars.maxDate){
                        this.bars.maxDate = price.date;
                        // Initialize minDate to that of the first price record received
                        if(this.bars.minDate === null){
                            this.bars.minDate = price.date;
                        }
                        // deltaBox measures the number of boxes of price change that have occured with the addition of this price record
                        let deltaBox = 0;
                         // reversal is a flag to check if a new bar is needed (a reversal has occured)
                        let reversal = false;
                        // Use first set of high/low data to set the graphs currentHigh/currentLow values
                        if(this.currentHigh === null){
                            this.currentHigh = price.high;
                            this.currentLow = price.low;
                        }
                        // Else if inital price direction has not been set yet, set the price direction when a reversal level price movement has occured
                        else if(this.priceDirection == 0){
                            let deltaBoxLow = 0;
                            let deltaBoxHigh = 0;
                            let newPriceLow, newPriceHigh;
                            if(this.currentLow > price.low){
                                [deltaBoxLow, newPriceLow] = this.getBoxChange(this.currentLow, price.low);
                            }
                            if(this.currentHigh < price.high){
                                [deltaBoxHigh, newPriceHigh] = this.getBoxChange(this.currentHigh, price.high);
                            }
                            if(Math.max(deltaBoxLow, deltaBoxHigh) >= this.defaultReversal){
                                // Greater negative change than positive change
                                if(deltaBoxLow > deltaBoxHigh){
                                    this.priceDirection = -1;
                                    this.currentLow = newPriceLow;
                                    deltaBox = deltaBoxLow;
                                    this.currentHigh = this.getCurrentBoxPrice(this.currentLow);
                                }else{
                                    this.priceDirection = 1;
                                    this.currentHigh = newPriceHigh;
                                    deltaBox = deltaBoxHigh;
                                    this.currentLow = this.getCurrentBoxPrice(this.currentHigh);
                                }
                                // Set reversal to true create first bar
                                reversal = true;
                            }
                        }
                        // Else if price direction is rising
                        else if(this.priceDirection > 0){
                            if(this.currentHigh < price.high){
                                [deltaBox, this.currentHigh] = this.getBoxChange(this.currentHigh, price.high);
                                this.currentLow = this.getCurrentBoxPrice(this.currentHigh);
                            }
                            if(deltaBox == 0 && this.currentLow > price.low){
                                const [reversalDeltaBox, reversalPrice] = this.getBoxChange(this.currentLow, price.low);
                                if(reversalDeltaBox >= this.defaultReversal){
                                    this.currentLow = reversalPrice;
                                    this.currentHigh = this.getCurrentBoxPrice(this.currentLow);
                                    deltaBox = reversalDeltaBox;
                                    this.priceDirection = -1;
                                    reversal = true;
                                }
                            }
                        }
                        // Else if price direction is falling
                        else if(this.priceDirection < 0){
                            if(this.currentLow > price.low){
                                [deltaBox, this.currentLow] = this.getBoxChange(this.currentLow, price.low);
                                this.currentHigh = this.getCurrentBoxPrice(this.currentLow);
                            }
                            if(deltaBox == 0 && this.currentHigh < price.high){
                                const [reversalDeltaBox, reversalPrice] = this.getBoxChange(this.currentHigh, price.high);
                                if(reversalDeltaBox >= this.defaultReversal){
                                    this.currentHigh = reversalPrice;
                                    this.currentLow = this.getCurrentBoxPrice(this.currentHigh);
                                    deltaBox = reversalDeltaBox;
                                    this.priceDirection = 1;
                                    reversal = true;
                                }
                            }
                        }
                        if(reversal){
                            this.bars.data.push({
                                "direction":(this.priceDirection < 0) ? "O" : "X",
                                "prices": [],
                                "time":price.date
                            });
                        }
                        if(this.bars.data.length > 0){
                            const currentBar = this.bars.data[this.bars.data.length - 1];
                            let currentPrice = (this.priceDirection < 0) ? this.currentLow : this.currentHigh;
                            // For all bars except the first one, skip the first box after a reversal
                            const startingIndex = (this.bars.data.length == 1) ? 0 : 1;
                            for(let i = startingIndex; i <= deltaBox; i++){
                                const boxSize = this.getCurrentBoxSize(currentPrice);
                                const currentBoxPrice = this.getCurrentBoxPrice(currentPrice);
                                if(!currentBar.prices.includes(currentBoxPrice)){
                                    currentBar.prices.push(currentBoxPrice);
                                }
                                currentPrice -= this.priceDirection * boxSize;
                            }
                        }
                        this.prices[price.date] = price;
                    }
                })
                this.graphData();
            },
            getCurrentBoxPrice(price){
                const boxSize = this.getCurrentBoxSize(price);
                return Math.floor(price/boxSize) * boxSize;
            },
            getCurrentBoxSize(price){
                return this.defaultBoxSizes.find((box)=>price >= box.min && price < box.max).size; 
            },
            getBoxChange(currentPrice, newPrice){
                let deltaBox = 0;
                let price = currentPrice;
                if(currentPrice > newPrice){
                    let boxSize = this.getCurrentBoxSize(price);
                    while(price - boxSize >= newPrice){
                        deltaBox++;
                        price -= boxSize;
                        boxSize = this.getCurrentBoxSize(price);
                    }
                }else if(currentPrice < newPrice){
                    let boxSize = this.getCurrentBoxSize(price);
                    while(price + boxSize <= newPrice){
                        deltaBox++;
                        price += boxSize;
                        boxSize = this.getCurrentBoxSize(price);
                    }
                }
                return [deltaBox, price];
            },
            resizeChart(){
                const parentWidth = this.$refs.chart.parentNode.getBoundingClientRect().width;
                this.chart.applyOptions({ width: parentWidth, height: Math.max(0.3 * parentWidth, 300)})
            }
        },
        mounted(){
            this.chart = createChart(this.$refs.chart, { 
                layout: {
                    backgroundColor: '#131822',
                    textColor: 'rgba(255, 255, 255, 0.9)',
                },
                crosshair: {
                    mode: CrosshairMode.Normal,
                },
                leftPriceScale:{
                    visible:true
                }
            });
            this.resizeChart();
            window.addEventListener("resize",this.resizeChart);
            this.series = this.chart.addCandlestickSeries({
                upColor: '#469e4b',
                downColor: '#77313d',
                borderVisible: false,
                wickVisible: false,
            });
        }
    }
</script>