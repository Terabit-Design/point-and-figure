<template>
    <div :class="{'chart-container':true,'loading':loading}">
        <Plotly :layout="layout" :data="data" class="chart" ref="chart"></Plotly>
        <div class="chart-loading">
            <div class="spinner--fade">
                <span style="--counter:0"></span>
                <span style="--counter:1"></span>
                <span style="--counter:2"></span>
                <span style="--counter:3"></span>
                <span style="--counter:4"></span>
                <span style="--counter:5"></span>
                <span style="--counter:6"></span>
            </div>
            <div>Loading...</div>
        </div>
    </div>
</template>
<script type="text/javascript">
    import {Plotly} from "vue-plotly"
    export default {
        data(){
            return {
                loading:false,
                chart:null,
                series:null,
                bars:null,
                prices:null,
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
                data:[],
                layout:{},
            }
        },
        components:{
            Plotly
        },
        methods:{
            // Resets graph to inital values so that new values can be plotted
            resetGraph(){
                this.loading = false;
                this.priceDirection = 0;
                this.currentHigh = null;
                this.currentLow = null;
                this.prices = [];
                this.bars = {
                    minDate:null,
                    maxDate:0,
                    minPrice: {"price":Number.MAX_VALUE},
                    maxPrice: {"price":Number.MIN_SAFE_INTEGER},
                    data:[]
                };
            },
            // Wrapper function to minimize JS impact on UI
            step(f){
                return new Promise((resolve)=>{
                    const callback = ()=>{
                        f();
                        resolve();
                    }
                    window.requestAnimationFrame(callback);
                })
            }, 
            // Convert point and figure data to traces for Plotly.js
            async graphData(){
                const xOffset = 100;
                const shapes = []
                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const numLabels = Math.max(1, Math.ceil(Math.log(this.bars.data.length)));
                const labelFrequency = Math.floor(this.bars.data.length / numLabels);
                const tickvals = []
                const ticktext = []
                const layout = this.layout;
                this.layout = null;
                // Set the horizontal symbol width as the box size at max price
                const barWidth = this.bars.maxPrice.size;
                let currYear = Number.MIN_SAFE_INTEGER;
                for(let i=0; i < this.bars.data.length; i++){
                    const bar = this.bars.data[i];
                    const timestamp = new Date(bar.time);
                    tickvals.push(xOffset + (i + 0.5) * barWidth);
                    let label = "";
                    if(i % labelFrequency == 0){
                        label = `${months[timestamp.getMonth()]} ${timestamp.getDate()}`;
                        if(timestamp.getFullYear() > currYear){
                            currYear = timestamp.getFullYear()
                            label += ` ${currYear}`;
                        }
                    }
                    ticktext.push(label);
                    const barPrices = Object.keys(bar.prices);
                    for(let j = 0; j < barPrices.length; j++){
                        const price = parseFloat(barPrices[j]);
                        const symbolCoords = {
                            "x0":xOffset + i * barWidth,
                            "x1":xOffset + (i + 1) * barWidth,
                            "y0":price,
                            "y1":price + bar.prices[price]
                        }
                        if(bar.direction == "O"){
                            shapes.push({
                                type: 'circle',
                                xref: 'x',
                                yref: 'y',
                                x0: symbolCoords.x0,
                                y0: symbolCoords.y0,
                                x1: symbolCoords.x1,
                                y1: symbolCoords.y1,
                                line: {
                                    color:'#DC7A85',
                                    width: 1
                                }
                            })
                        }else{
                            // Push two lines for X
                            shapes.push({
                                type: 'line',
                                xref: 'x',
                                yref: 'y',
                                x0: symbolCoords.x0,
                                y0: symbolCoords.y0,
                                x1: symbolCoords.x1,
                                y1: symbolCoords.y1,
                                line: {
                                    color:'#32ab60',
                                    width: 1
                                }
                            })
                            shapes.push({
                                type: 'line',
                                xref: 'x',
                                yref: 'y',
                                x0: symbolCoords.x0,
                                y0: symbolCoords.y1,
                                x1: symbolCoords.x1,
                                y1: symbolCoords.y0,
                                line: {
                                    color:'#32ab60',
                                    width: 1
                                }
                            })
                        }
                    }
                }
                layout.shapes = shapes;
                layout.xaxis.autorange = false;
                layout.yaxis.autorange = false;
                layout.xaxis.range = [xOffset, xOffset + Math.max(this.bars.data.length * barWidth, barWidth*5)];
                layout.yaxis.range = [this.bars.minPrice.price,this.bars.maxPrice.price];
                layout.xaxis.ticktext = ticktext;
                layout.xaxis.tickvals = tickvals;
                await this.$nextTick();
                this.layout = layout;
            },
            // Takes in High, Low, Close data to generate point and figure data
            addPriceDataPoint(){
                this.loading = true;
                const rawPriceData = [...arguments];
                const priceData = [];
                // Ignore prices with a timestamp less that the current max timestamp
                const priceFiltering = [];
                for(let i = 0; i < rawPriceData.length; i++){
                    priceFiltering.push(this.step(()=>{
                        const price = rawPriceData[i];
                        if(price.date > this.bars.maxDate){
                            priceData.push(price);
                            this.prices.push(price);
                            this.bars.maxDate = price.date
                            // Initialize minDate to that of the first price record received
                            if(this.bars.minDate === null){
                                this.bars.minDate = price.date;
                            }
                        }
                    }));
                }
                Promise.all(priceFiltering).then(()=>{
                    const priceProcessing = [];
                    for(let i = 0; i < priceData.length; i++){
                        priceProcessing.push(this.step(()=>{
                            const price = priceData[i];
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
                                if(Math.max(deltaBoxLow, deltaBoxHigh) >= this.$store.state.reversalBoxCount){
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
                                    if(reversalDeltaBox >= this.$store.state.reversalBoxCount){
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
                                    if(reversalDeltaBox >= this.$store.state.reversalBoxCount){
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
                                    "prices": {},
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
                                    if(!(currentBoxPrice in currentBar.prices)){
                                        currentBar.prices[currentBoxPrice] = boxSize;
                                    }
                                    if(currentBoxPrice > this.bars.maxPrice.price){
                                        this.bars.maxPrice.price = currentBoxPrice;
                                        this.bars.maxPrice.size = boxSize;
                                    }
                                    if(currentBoxPrice < this.bars.minPrice.price){
                                        this.bars.minPrice.price = currentBoxPrice;
                                        this.bars.minPrice.size = boxSize;
                                    }
                                    currentPrice -= this.priceDirection * boxSize;
                                }
                            }
                        }));
                    }
                    Promise.all(priceProcessing).then(this.graphData);
                })
                
            },
            // Gets the nominal price for the box of a given price
            getCurrentBoxPrice(price){
                const boxSize = this.getCurrentBoxSize(price);
                return Math.floor(price/boxSize) * boxSize;
            },
            // Gets the size of a box for a given price
            getCurrentBoxSize(price){
                const boxModel = this.$store.state.selectedBoxSizingModel;
                const boxValue = this.$store.state.selectedBoxSizeValue;
                if(boxValue > 0){  
                    if(boxModel=="atr"){
                        let atr = 0;
                        let count = Math.min(this.prices.length, boxValue);
                        let prevClose;
                        for(let i=0;i<count;i++){
                            const priceData = this.prices[i];
                            let tr = Math.abs(priceData.high - priceData.low);
                            if(prevClose){
                                tr = Math.max(tr,Math.abs(priceData.low - prevClose),Math.abs(priceData.high - prevClose));
                            }
                            prevClose = priceData.close;
                            atr += tr;
                        }
                        Math.round(atr /= count);
                        return atr;
                    }
                }
                return this.defaultBoxSizes.find((box)=>price >= box.min && price < box.max).size; 
            },
            // Calculate how many boxes are in between two prices
            getBoxChange(currentPrice, newPrice, i){
                let deltaBox = 0;
                let price = currentPrice;
                if(currentPrice > newPrice){
                    let boxSize = this.getCurrentBoxSize(price, i);
                    while(price - boxSize >= newPrice){
                        deltaBox++;
                        price -= boxSize;
                        boxSize = this.getCurrentBoxSize(price, i);
                    }
                }else if(currentPrice < newPrice){
                    let boxSize = this.getCurrentBoxSize(price, i);
                    while(price + boxSize <= newPrice){
                        deltaBox++;
                        price += boxSize;
                        boxSize = this.getCurrentBoxSize(price, i);
                    }
                }
                return [deltaBox, price];
            },
        },
        mounted(){
            this.layout = {
                margin: {
                    l: 30,
                    r: 40,
                    b: 30,
                    t: 30,
                    pad: 0
                },
                font:{
                    size:11
                },
                plot_bgcolor:'#131822',
                paper_bgcolor:'#131822',
                yaxis:{
                    color:"rgba(255, 255, 255, 0.9)",
                    gridcolor:"rgba(255, 255, 255, 0.1)",
                    side:"right",
                    tickformat : ".2f"
                },
                xaxis:{
                    tickmode:"array",
                    color:"rgba(255, 255, 255, 0.9)",
                    gridcolor:"rgba(255, 255, 255, 0.1)", 
                    tickangle: 0
                },
            };
            this.$refs.chart.$el.on("plotly_afterplot",()=>{
                this.loading = false;
            })
        }
    }
</script>
<style lang="scss">
    .chart-container{
        position: relative;
        .chart-loading{
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #131822;
            z-index: 2;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #FFF;
        }
        &:not(.loading) .chart-loading{
            display: none;
        }
    }
    .chart{
        position: relative;
        z-index: 1;
    }
</style>