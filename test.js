console.clear();
var chart = {
    element      : "",
    chart        : "",
    polygon      : "",
    width        : 100,
    height       : 50,
    maxValue     : 0,
    values       : [],
    points       : [],
    vSteps       : 5,
    measurements : [],

    calcMeasure : function(){
        this.measurements = [];
        for(x=0; x < this.vSteps; x++){
            var measurement = Math.ceil((this.maxValue / this.vSteps) * (x +1));
            this.measurements.push(measurement);
        }

        this.measurements.reverse();
    },
    /**
     * Get Element
     * Take the selector  being passed, determine if
     * the selector is a class (".") or an id ("#"), and get the element
     * @param  {String} element - the element selector
     */
    getElement : function(element){
        if(element.indexOf(".") == 0){
            this.element = document.getElementsByClassName("chart")[0]
        }
        else if(element.indexOf("#") == 0){
            this.element = document.getElementById("chart");
        }
        else {
            console.error("Please select a valid element");
        }

    },
    /**
     * Create Chart
     *  - calc the max value
     *  - calc the points for the polygon
     *  - create a chart <svg>
     *  	- set width, height, and viewbox attributes on <svg>
     *  - create a <polygon>
     *  	- set points on <polygon>
     *  - calc the vertical measurements
     * @param  {array} values - the values to plot on the chart
     */
    createChart : function(element, values){
        this.getElement(element);
        this.values = values;

        // Do some calculations
        this.calcMaxValue();
        this.calcPoints();
        this.calcMeasure();

        // Clear any existing
        this.element.innerHTML = "";

        // Create the <svg>
        this.chart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.chart.setAttribute("width", "100%");
        this.chart.setAttribute("height", "100%");
        this.chart.setAttribute("viewBox", "0 0 " + chart.width + " " + chart.height);

        // Create the <polygon>
        this.polygon = document.createElementNS('http://www.w3.org/2000/svg','polygon');
        this.polygon.setAttribute("points", this.points);
        this.polygon.setAttribute("class", "line");

        if(this.values.length > 1){
            var measurements = document.createElement("div");
            measurements.setAttribute("class", "chartMeasurements");
            for(x=0; x < this.measurements.length; x++){
                var measurement = document.createElement("div");
                measurement.setAttribute("class", "chartMeasurement");
                measurement.innerHTML = this.measurements[x];
                measurements.appendChild(measurement);
            }


            this.element.appendChild(measurements);
            // Append the <svg> to the target <div>
            this.element.appendChild(this.chart);
            // Append the polygon to the target <svg>
            this.chart.appendChild(this.polygon);
        }
    },
    /**
     * Calc Points
     * Calculate all the points for the polygon
     */
    calcPoints : function(){
        this.points = [];
        if(this.values.length > 1){
            // First point is bottom left hand side (max value is the bottom of graph)
            var points = "0," + chart.height + " ";
            // Loop through each value
            for(x=0; x < this.values.length; x++){
                // Calculate the perecentage of this value/the max value
                var perc  = this.values[x] / this.maxValue;
                // Steps is a percentage (100) / the total amount of values
                var steps = 100 / ( this.values.length - 1 );
                // Create the point, limit points to 2 decimal points,
                // Y co-ord is calculated by the taking the chart height,
                // then subtracting (chart height * the percentage of this point)
                // Remember the & co-ord is measured from the top not the bottom like a traditional graph
                var point = (steps * (x )).toFixed(2) + "," + (this.height - (this.height * perc)).toFixed(2) + " ";
                // Add this point
                points += point;
            }
            // Add the final point (bottom right)
            points += "100," + this.height;
            this.points = points;


        }
        // output the values for display
        document.getElementById("yourValues").innerHTML= this.values;
    },
    /**
     * Calculate Max Value
     * Find the highest value in the array, and then
     * add 10% to it so the graph doesn't touch the top of the chart
     */
    calcMaxValue : function(){
        this.maxValue = 0;
        for(x=0; x < this.values.length; x++){
            if(this.values[x] > this.maxValue){
                this.maxValue = this.values[x];
            }
        }
        // Round up to next integer
        this.maxValue = Math.ceil(this.maxValue);
    }
}

var values = [];

function addValue(){
    var input = document.getElementById("value");
    var value = parseInt(input.value);

    if(!isNaN(value)){
        values.push(value);
        chart.createChart('.chart',values);
    }

    input.value = "";


}

function clearChart(){
    values = [];
    chart.createChart('.chart',values);
}



chart.createChart('.chart',[3522,4088,4146,4477,4202,4157,4177,4203,4223,3948,3946,3898,3979,4052,3279,3229,3302,3040,3054,2982,3077,2965,2973,5148,22485,13077,9055,7446,6824,5995,5787,5367,4997,4689,4630,4785,22365,15244,10626,8666,7681,6929,6219,6367,5402,4932,4844,5146,5265,4887,4714,4722,4718,4693,4746,4819,4455,4419,4323,4407,4277,11589,6100,5076,4769,8929,14002,9756,7520,6343,5633,5415,5052,4850,4624,4480,14102,24005,14263,10845,9028,7755,7197,7001,6737,6254,6150,5922,5603,5048,5423,5003,5035,4747,4814,4661,4462,4516,4221,4111,4053,12515,15781,10499,8175,6831,6287,5990,5590,5148,4760,4809]);







