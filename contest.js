import data from './chart_data.js'

const svgNS = "http://www.w3.org/2000/svg";

class Diagram {
    constructor(data) {
        this.root = document.createElement('svg');
        this.axis = {};
        this.lines = {};
        this.dataLength = 0;
        this.maxDataLength = 0;
        this.processData(data);
        this.initCanvas();
        console.log(this.maxDataLength);
    }

    processData = data => {
        this.dataLength = data.columns[0].length;
        data.columns.forEach(columnData => {
            const columnId = columnData[0];
            const columnType = data.types[columnId];
            if (columnType === 'x') {
                this.axis = {
                    data: columnData,
                    min: columnData[0],
                    max: columnData[this.dataLength - 1],
                }
            }
            if (columnType === 'line') {
                // columnData.slice(2).forEach(coords => {
                //     const pathElement = document.createElementNS(svgNS, "line");
                //     pathElement.setAttributeNS(null, "d", `M0,${this.maxDataLength-line.start} l${line.pathData[0]}`);
                //     pathElement.setAttributeNS(null, 'style', `shape-rendering:crispEdges; stroke: ${line.color}; stroke-width: 1; fill: none;`);
                //     document.getElementById("a").appendChild(pathElement);
                // })
                this.lines[columnId] = {
                    name: data.names[columnId],
                    color: data.colors[columnId],
                    start: columnData[1],
                    rawData: columnData.slice(1),
                    pathData: columnData.slice(2).reduce((tmpData, value) =>
                        [`${tmpData[0]}1,${tmpData[2] - value} `, Math.max(tmpData[1], value), value], ['', 0, columnData[1]]
                    )
                }
                this.maxDataLength = Math.max(this.maxDataLength, this.lines[columnId].pathData[1])
            }
        })
    }

    initCanvas = () => {
        Object.values(this.lines).forEach(line => {
            console.log(line.rawData.toString());
            line.rawData.forEach((y, index) => {
                const pathElement = document.createElementNS(svgNS, "line");
                pathElement.setAttributeNS(null, "stroke-width", 1);
                pathElement.setAttributeNS(null, "stroke", line.color);
                pathElement.setAttributeNS(null, "x1", index+1);
                pathElement.setAttributeNS(null, "x2", index+2);
                pathElement.setAttributeNS(null, "y1", (this.maxDataLength-line.rawData[index-1]||0)/100);
                pathElement.setAttributeNS(null, "y2", (this.maxDataLength-y)/100);
                document.getElementById("a").appendChild(pathElement);
            })
        })
    }
}

console.log(data[1]);
new Diagram(data[1]);