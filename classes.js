import data from './chart_data.js'

const svgNS = "http://www.w3.org/2000/svg";
var  xlinkns = "http://www.w3.org/1999/xlink";
const axisYLinesCount = 5;
const axisXSize = 1000;
const axisYSize = 700;
const axisYNavigationSize = 100;
const navigationWindowResizeTrheshold = 15;

const themes = {
    dark: {
        chartArea: 'chart--dark',
        navigationBar: 'navigation-bar--dark',
        navigationForegroundLeft: 'navigation-bar__foreground-left--dark',
        navigationForegroundWindow: 'navigation-bar__foreground-window--dark',
        navigationForegroundRight: 'navigation-bar__foreground-right--dark'
    }
};


class Diagram {
    constructor(data) {
        this.root = document.createElement('div');

        this.chartArea = document.createElement('div');
        this.chart = document.createElementNS(svgNS, 'svg');

        this.navigationBar = document.createElement('div');
        this.navigationChart = document.createElementNS(svgNS, 'svg');
        this.navigationForegroundLeft = document.createElement('div');
        this.navigationForegroundRight = document.createElement('div');
        this.navigationForegroundWindow = document.createElement('div');

        this.axisX = {};
        this.lines = {};
        this.dataLength = 0;
        this.maxY = 0;
        this.maxX = 0;

        this.state = {
            theme: 'dark',
            navigationWindowWidth: 30,
            navigationWindowPositionLeft: 64,
            isDragging: false,
            pointerCoords: {}
        }

        this.processData(data);

        this.initCanvas();
        setTimeout(this.initEvents, 1000);
        console.log(this.maxDataLength);
    }

    setState(field, value, callback) {
        this.state[field] = value;
        if (callback) callback();
    }

    setClassnames = theme => {
        Object.keys(theme).forEach(elementName => {
            const classNames = theme[elementName];
            if (classNames) {
                const element = this[elementName];
                if (element) {
                    element.removeAttribute('class');
                    element.classList.add(classNames);
                }
            }
        })
    }

    processData = data => {
        this.dataLength = data.columns[0].length;
        this.multiplierX = axisXSize / this.dataLength;
        data.columns.forEach(columnData => {
            const columnId = columnData[0];
            const columnType = data.types[columnId];
            if (columnType === 'x') {
                this.axisX = {
                    data: columnData,
                    min: columnData[0],
                    max: columnData[this.dataLength - 1]
                }
            }
            if (columnType === 'line') {
                this.lines[columnId] = {
                    id: columnId,
                    name: data.names[columnId],
                    color: data.colors[columnId],
                    rawData: columnData.slice(1),
                    hidden: false
                }
            }
        });
    };
    updateNavigationWindowDimensions = () => {
        this.navigationForegroundLeft.style.right = `${100 - this.state.navigationWindowPositionLeft}%`;
        this.navigationForegroundWindow.style.left = `${this.state.navigationWindowPositionLeft}%`;
        this.navigationForegroundWindow.style.right = `${100 - this.state.navigationWindowPositionLeft - this.state.navigationWindowWidth}%`;
        this.navigationForegroundRight.style.left = `${this.state.navigationWindowPositionLeft + this.state.navigationWindowWidth}%`;
        this.refreshChart();
    };
    refreshMaxValues = () => {
        this.maxValue = 0;
        this.maxVisibleValue = 0;
        this.visibleData = {
            from: Math.floor(this.dataLength / 100 * this.state.navigationWindowPositionLeft),
            to: Math.ceil(this.dataLength / 100 * this.state.navigationWindowPositionLeft + this.state.navigationWindowWidth)
        };

        Object.values(this.lines).forEach(line => {
            if (!line.hidden) {
                const [maxValue, maxVisibleValue] =
                    line.rawData.reduce((result, value, index) =>
                        [Math.max(result[0], value), Math.max(result[1], value)], [0, 0]);
                line.maxValue = maxValue;
                this.maxValue = Math.max(maxValue, this.maxValue || 0);
            }
        });
        this.multiplierYNavigation = axisYSize / this.maxValue;
        this.multiplierYChart = axisYSize / this.maxVisibleValue;

        this.axisYMarks = Array(axisYLinesCount)
            .map((item, index) => Math.ceil((this.maxValue / axisYLinesCount) * (index + 1))).reverse();
    };
    addLineToChart = (line, start, end) => {
        const defs = document.createElementNS(svgNS, 'def');
        const lineSymbol = document.createElementNS(svgNS, 'symbol');
        const polyline = document.createElementNS(svgNS, 'polyline');
        line.chartData = line.rawData.reduce((result, value, index) =>
            `${result} ${Math.ceil(this.multiplierX * index)},${Math.ceil(this.multiplierYNavigation * (this.maxValue - value))} `, '');
        line.chartData1 = line.rawData.reduce((result, value, index) =>
            `${result} ${Math.ceil(this.multiplierX * index)},${Math.ceil(this.multiplierYNavigation * (this.maxValue - value))} `, '');
        polyline.setAttribute('stroke-width', 2);
        polyline.setAttribute('stroke', line.color);
        polyline.setAttribute('class', 'line');
        polyline.setAttribute('points', line.chartData);
        lineSymbol.setAttribute('id', line.id);
        lineSymbol.appendChild(polyline);
        defs.appendChild(lineSymbol);
        this.navigationChart.appendChild(defs);
        const navigationLine = document.createElementNS(svgNS, 'use');
        const chartLine = document.createElementNS(svgNS, 'use');
        navigationLine.setAttributeNS(xlinkns, 'href','#'+line.id);
        navigationLine.setAttribute('x', 0);
        navigationLine.setAttribute('y', 0);
        navigationLine.setAttribute('transform', 'scale(1,0.15)');
        navigationLine.setAttribute('height', '700%');
        chartLine.setAttributeNS(xlinkns, 'href','#'+line.id);
        chartLine.setAttribute('x', 0);
        chartLine.setAttribute('y', 0);

        this.navigationChart.appendChild(navigationLine);
        this.chart.appendChild(chartLine);

    };
    updateCharts = () => {
        this.refreshMaxValues();
        Object.values(this.lines).forEach(line => {
            console.log(line);
            this.addLineToChart(line)
        });
    };
    refreshChart(){
        this.chart.setAttribute('viewBox', `0 0 ${axisXSize} ${axisYSize}`);
    }
    initCanvas = () => {
        this.chart.setAttribute('width', '100%');
        this.chart.setAttribute('height', '100%');
        this.chart.setAttribute('preserveAspectRatio', 'none');
        this.chart.setAttribute('viewBox', `0 0 ${axisXSize} ${axisYSize}`);
        this.chart.setAttribute('class', 'navigation');

        this.chartArea.appendChild(this.chart);

        this.navigationChart.setAttribute('width', '100%');
        this.navigationChart.setAttribute('height', '100%');
        this.navigationChart.setAttribute('preserveAspectRatio', 'none');
        this.navigationChart.setAttribute('viewBox', `0 0 ${axisXSize} ${axisYNavigationSize}`);
        this.navigationChart.setAttribute('class', 'navigation');

        this.navigationBar.appendChild(this.navigationChart);
        this.navigationBar.appendChild(this.navigationForegroundLeft);
        this.navigationBar.appendChild(this.navigationForegroundWindow);
        this.navigationBar.appendChild(this.navigationForegroundRight);

        this.setClassnames(themes[this.state.theme]);
        this.root.appendChild(this.chartArea);
        this.root.appendChild(this.navigationBar);
        document.getElementById('wrapper').appendChild(this.root);

        this.updateNavigationWindowDimensions();

        this.updateCharts();

    }

    touchStartHandler = e => {
        let mode = 'move';
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;

        if (x < navigationWindowResizeTrheshold) mode = 'resizeRight';
        if (x + navigationWindowResizeTrheshold > rect.width) mode = 'resizeLeft';
        this.state.mode = mode;
        e.preventDefault();
    };
    touchEndHandler = e => {
        this.state.mode = null;
        this.state.pointerCoords = {};
        e.preventDefault();
    };
    touchMoveHandler = e => {
        if (this.state.mode) {
            const rect = this.navigationBar.getBoundingClientRect();
            const oldX = this.state.pointerCoords.x;
            this.state.pointerCoords = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            console.log(this.state.mode);
            if (this.state.mode === 'move' && oldX) {
                if (oldX) {
                    const windowPositionLeftInPx = this.state.navigationWindowPositionLeft * this.navigationBar.offsetWidth / 100;
                    this.state.navigationWindowPositionLeft =
                        (windowPositionLeftInPx + this.state.pointerCoords.x - oldX) / this.navigationBar.offsetWidth * 100;
                    this.updateNavigationWindowDimensions();
                }
            }
            if (this.state.mode === 'resizeLeft' && oldX) {
                const windowWithInPx = this.state.navigationWindowWidth * this.navigationBar.offsetWidth / 100;
                this.state.navigationWindowWidth =
                    (windowWithInPx + this.state.pointerCoords.x - oldX) / this.navigationBar.offsetWidth * 100;
                this.updateNavigationWindowDimensions();
            }
            if (this.state.mode === 'resizeRight' && oldX) {
                const windowWithInPx = this.state.navigationWindowWidth * this.navigationBar.offsetWidth / 100;
                const windowPositionLeftInPx = this.state.navigationWindowPositionLeft * this.navigationBar.offsetWidth / 100;
                this.state.navigationWindowPositionLeft =
                    (windowPositionLeftInPx + this.state.pointerCoords.x - oldX) / this.navigationBar.offsetWidth * 100;
                this.state.navigationWindowWidth =
                    (windowWithInPx - this.state.pointerCoords.x + oldX) / this.navigationBar.offsetWidth * 100;
                this.updateNavigationWindowDimensions();
            }
        }
        e.preventDefault();

        // this.state.mode
    };
    initEvents = () => {
        //this.navigationForegroundWindow.addEventListener('pointerdown', this.touchStartHandler, false);
        this.navigationForegroundWindow.addEventListener('mousedown', this.touchStartHandler, false);
        this.navigationForegroundWindow.addEventListener('mouseup', this.touchEndHandler, false);
        this.navigationForegroundWindow.addEventListener('mousemove', this.touchMoveHandler, true);
        this.navigationForegroundWindow.addEventListener('mouseleave', this.touchEndHandler, true);
    }
}

console.log(data[1]);
new Diagram(data[1]);