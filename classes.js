// Реализация
// Т.к. эксперименты показали, что многократное масштабирование приводит с сильной потере качества тонких линий
// было принято решение подстраивать значения под размер экрана на этапе построения графиков
// Навигация:
// По оси X viewBox имеет ширину равную ширине диаграммы, значения формируются исходя из коэффициента [ширина диаграммы / количество значений]
// По оси Y viewBox имеет ширину равную высоте диаграммы, значения формируются исходя из коэффициента [высота диаграммы / максимальное значение среди всех линий
// Диаграмма:
// По оси X значения формируются исходя из коэффициента [ширина диаграммы / количество значений]
// viewBox начинается со значения "коэффициент [ширина диаграммы / количество значений] * (100% - ширина окна в %) * ширина диаграммы"
// ширина viewBox равна "коэффициент [ширина диаграммы / количество значений] * (ширина окна в %) * ширина диаграммы"

// начинается со значения "коэффициент [ширина диаграммы / количество значений] * (100% - ширина окна в %) * (ширина окна в %)
// Это позволяет не пересчитывать графи
// По оси Y значения формируются исходя из коэффициента [высота диаграммы / максимальное ВИДИМОЕ значение среди ВИДИМЫХ линий
// Масштаб графиков равен ширине видимого окна в %.
// По оси X viewBox ширину равную ширине видимого "окна", значения формируются исходя из коэффициента [ширина диаграммы / количество значений]

// значения  длина линии делается равной количеству значений
// По оси Y количество делений делается равным

import data from './chart_data.js'

const svgNS = "http://www.w3.org/2000/svg";
const htmlNS = "http://www.w3.org/1999/xhtml";

const axisYLinesCount = 5;
const axisYSize = 700;
const offsetY = 30;
const labelXWith = 35;
const axisYNavigationSize = 30;
const navigationWindowResizeTrheshold = 15;

const themes = {
    dark: {
        chartArea: 'chart--dark',
        axisXLabelsContainer: 'axis-x-container',
        navigationBar: 'navigation-bar--dark',
        navigationForegroundLeft: 'navigation-bar__foreground-left--dark',
        navigationForegroundWindow: 'navigation-bar__foreground-window--dark',
        navigationForegroundRight: 'navigation-bar__foreground-right--dark',
        navigationButton: 'navigation-bar__button',
        tooltip: 'tooltip--dark'

    }
};


class Diagram {
    constructor(data) {
        this.root = document.createElement('div');

        this.chartArea = document.createElement('div');
        this.chart = document.createElementNS(svgNS, 'svg');
        this.chartGroup = document.createElementNS(svgNS, 'g');

        this.axisXLabelsContainer = document.createElement('div');
        this.axisXLabelsVisibleContainer = document.createElement('div');

        this.navigationBar = document.createElement('div');
        this.navigationChart = document.createElementNS(svgNS, 'svg');
        this.navigationForegroundLeft = document.createElement('div');
        this.navigationForegroundRight = document.createElement('div');
        this.navigationForegroundWindow = document.createElement('div');
        this.navigationButton = document.createElement('div');

        this.buttonsContainer = document.createElement('div');

        this.tooltip = document.createElement('div');

        this.axisX = {};
        this.lines = {};
        this.dataLength = 0;
        this.maxValue = 0;
        this.maxVisibleValue = 0;
        this.visibleData = {from: 0, to: 0};
        this.state = {
            theme: 'dark',
            navigationWindowWidth: 30,
            navigationWindowPositionLeft: 30,
            isDragging: false,
            pointerCoords: {}
        }
        this.axisXSize = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        this.axisYElements = {};

        this.processData(data);

        this.initCanvas();
        setTimeout(this.initEvents, 1000);
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
        this.multiplierX = this.axisXSize / this.dataLength;
        data.columns.forEach(columnData => {
            const columnId = columnData[0];
            const columnType = data.types[columnId];
            if (columnType === 'x') {
                this.axisX = {
                    data: columnData.slice(1),
                    min: columnData[0],
                    max: columnData[this.dataLength - 1],
                    htmlElements: columnData
                        .slice(1)
                        .map(stamp => {
                            const element = document.createElement('span');
                            element.innerHTML = (new Date(stamp)).toDateString().split(' ').slice(1, 3).join(' ');
                            element.classList.add('axis-x-label');
                            element.classList.add('hidden');
                            this.axisXLabelsContainer.appendChild(element);
                            return element;
                        })
                };

            }
            if (columnType === 'line') {
                this.lines[columnId] = {
                    id: columnId,
                    name: data.names[columnId],
                    color: data.colors[columnId],
                    rawData: columnData.slice(1),
                    hidden: false
                };
            }
        });
    };

    addLineToChart = (line) => {
        // the first attempt was to reuse polylines via "sybbol" and "reuse" but with big values it scaling looks ugly
        // so I've decided to sacrifice efficiency for the proper appearance sake.
        const polylineChart = document.createElementNS(svgNS, 'polyline');
        const polylineNavigation = document.createElementNS(svgNS, 'polyline');

        line.navigationChartData = line.rawData.reduce((result, value, index) =>
            `${result} ${Math.ceil(this.multiplierX * index)},${Math.floor(this.multiplierYNavigation * (this.maxValue - value))} `, '');

        line.chartData = [];

        polylineChart.setAttribute('stroke-width', 3);
        polylineChart.setAttribute('stroke', line.color);
        polylineChart.setAttribute('class', 'line');
        this.chartGroup.appendChild(polylineChart);

        line.polyline = polylineChart;

        polylineNavigation.setAttribute('stroke-width', 1);
        polylineNavigation.setAttribute('stroke', line.color);
        polylineNavigation.setAttribute('class', 'line');
        polylineNavigation.setAttribute('points', line.navigationChartData);

        this.navigationChart.appendChild(polylineNavigation);


//        this.polylineChart.addEventListener('mousleave', this.touchHandler, false);


    };

    refreshChartData = (line) => {
        line.chartData = line.rawData.reduce((result, value, index) =>
            `${result} ${Math.ceil(this.multiplierXChart * index)},${Math.floor(this.multiplierYChart * (this.maxVisibleValue - value))} `, '');
        line.polyline.setAttribute('points', line.chartData);
    };

    refreshXLabelsVisibility = () => {
        const axisXLabelsContainerWith = this.dataLength * this.multiplierXChart - labelXWith / 2;
        const axisXLabelsRatio = Math.ceil(this.dataLength / (axisXLabelsContainerWith / labelXWith));

        this.axisXLabelsContainer.style.width = axisXLabelsContainerWith + 'px';
        this.axisX.htmlElements.forEach((element, index) => {
            if (!(index % axisXLabelsRatio)) {
                element.classList.remove('hidden')
            } else element.classList.add('hidden')
        });
    };

    updateCharts = () => {
        console.log('updating');
        this.refreshChart();
        this.axisYMarks.forEach((value, index) => {
            if (!this.axisYElements[index]) {
                this.axisYElements[index] = {
                    label: document.createElement('span'),
                    line: document.createElement('div')
                }
                this.chartArea.appendChild(this.axisYElements[index].label);
                this.chartArea.appendChild(this.axisYElements[index].line);
                this.axisYElements[index].label.setAttribute('class', 'chart-label-y');
                this.axisYElements[index].line.setAttribute('class', 'chart-line-y');
            }
            this.axisYElements[index].label.style.bottom = `calc( ${(100 / axisYLinesCount * (axisYLinesCount - index - 1))}% + 5px )`;
            this.axisYElements[index].line.style.bottom = (100 / axisYLinesCount * index) + '%';
            this.axisYElements[index].label.innerHTML = value;

        });
        Object.values(this.lines).forEach(line => {
            if (!line.polyline) this.addLineToChart(line);
            this.refreshChartData(line);
        });
        this.refreshXLabelsVisibility();
    };

    refreshMaxValues = () => {
        this.maxValue = 0;
        this.maxVisibleValue = 0;
        this.visibleData = {
            from: Math.floor(this.dataLength / 100 * this.state.navigationWindowPositionLeft),
            to: Math.ceil(this.dataLength / 100 * (this.state.navigationWindowPositionLeft + this.state.navigationWindowWidth))
        };

        Object.values(this.lines).forEach(line => {
            if (!line.hidden) {
                const [maxValue, maxVisibleValue] =
                    line.rawData.reduce((result, value, index) =>
                        [
                            Math.max(result[0], value),
                            Math.max(result[1], index >= this.visibleData.from && index <= this.visibleData.to ? value : -Infinity)
                        ], [-Infinity, -Infinity]);
                line.maxValue = maxValue;
                line.maxVisibleValue = maxVisibleValue;
                this.maxValue = Math.max(maxValue, this.maxValue || -Infinity);
                this.maxVisibleValue = Math.max(maxVisibleValue, this.maxVisibleValue || -Infinity);
            }
        });
        this.multiplierYNavigation = axisYNavigationSize / this.maxValue;
        this.multiplierYChart = axisYSize / this.maxVisibleValue;
        this.multiplierXChart = this.multiplierXChart || this.axisXSize / (this.visibleData.to - this.visibleData.from);

        this.axisYMarks = [...Array(axisYLinesCount)]
            .map((item, index) => Math.ceil((this.maxVisibleValue / axisYLinesCount) * index)).reverse();
    };

    refreshChartViewboxSize() {
        this.chart.setAttribute('viewBox',
            `${0} 0 ${this.state.navigationWindowWidth * this.multiplierXChart * this.dataLength / 100} ${axisYSize}`);
    }

    transformChart = mode => {
        this.chartGroup.setAttribute('transform', `translate(${-(this.state.navigationWindowPositionLeft) * this.multiplierXChart * this.dataLength / 100}, 0)`);
        if (mode === 'move') this.axisXLabelsContainer.style.transform = `translateX(${-(this.state.navigationWindowPositionLeft) * this.multiplierXChart * this.dataLength / 100}px)`;
    };

    refreshChart() {
        this.refreshMaxValues();
        this.refreshChartViewboxSize();
        this.transformChart();
        // this.scaleChart()
    }

    initCanvas = () => {
        this.updateNavigationWindowDimensions();
        this.updateCharts();
        this.chart.setAttribute('width', '100%');
        this.chart.setAttribute('height', '100%');
        this.chart.setAttribute('preserveAspectRatio', 'none');
        this.chart.setAttribute('class', 'navigation');

        this.chartArea.appendChild(this.chart);
        this.chart.appendChild(this.chartGroup);


        this.chart.setAttribute('xmlns', htmlNS);

        this.navigationChart.setAttribute('width', '100%');
        this.navigationChart.setAttribute('height', '100%');
        this.navigationChart.setAttribute('preserveAspectRatio', 'none');
        this.navigationChart.setAttribute('viewBox', `0 0 ${this.axisXSize} ${axisYNavigationSize}`);
        this.navigationChart.setAttribute('class', 'navigation');

        this.navigationBar.appendChild(this.navigationChart);
        this.navigationBar.appendChild(this.navigationForegroundLeft);
        this.navigationBar.appendChild(this.navigationForegroundWindow);
        this.navigationBar.appendChild(this.navigationForegroundRight);
        this.navigationBar.appendChild(this.navigationButton);

        // this.axisXLabelsContainer.appendChild(this.axisXLabelsContainer);
        this.createButtons();

        this.setClassnames(themes[this.state.theme]);
        this.root.appendChild(this.chartArea);
        this.root.appendChild(this.axisXLabelsContainer);
        this.root.appendChild(this.navigationBar);
        this.root.appendChild(this.buttonsContainer);
        this.chartArea.appendChild(this.tooltip);

        document.getElementById('wrapper').appendChild(this.root);

    }

    createButtons = () => {
        Object.values(this.lines).forEach((line) => {
            line.lineButtonElement = document.createElement('div');
            line.lineButtonElement.classList.add('chart-button');
            const checkmarkSVG = document.createElementNS(svgNS, 'svg');
            const checkmarkSVGCheck = document.createElementNS(svgNS, 'path');
            const checkmarkSVGCircle = document.createElementNS(svgNS, 'circle');
            const nameBox = document.createElement('span');

            nameBox.innerText = line.name;
            nameBox.classList.add('chart-button-name');

            checkmarkSVGCircle.setAttribute('cx', 320);
            checkmarkSVGCircle.setAttribute('cy', 320);
            checkmarkSVGCircle.setAttribute('r', 290);
            checkmarkSVGCircle.setAttribute('fill', 'none');
            checkmarkSVGCircle.setAttribute('stroke', line.color);
            checkmarkSVGCircle.setAttribute('stroke-width', 30);
            checkmarkSVG.classList.add('chart-button-svg');
            checkmarkSVG.setAttribute('width', 30);
            checkmarkSVG.setAttribute('height', 30);
            checkmarkSVG.setAttribute('viewBox', '0 0 640 640');
            checkmarkSVG.setAttribute('style', 'fill-rule:evenodd;');
            //checkmarkSVG.style.borderColor = line.color;
            // checkmarkSVGCheck.style.borderColor = line.color;
            checkmarkSVGCheck.setAttribute('d', 'M319.988 0c176.719,0 320.012,143.293 320.012,320 0,176.719 -143.293,320 -320.012,320 -176.695,0 -319.988,-143.281 -319.988,-320 0,-176.707 143.293,-320 319.988,-320zm-181.951 350.591c-15.7797,-13.6419 -17.5042,-37.5005 -3.85044,-53.2802 13.6537,-15.7797 37.5241,-17.5042 53.3038,-3.85044l86.3278 74.8592 176.742 -174.9c14.7876,-14.7049 38.7406,-14.6458 53.4455,0.153545 14.7167,14.7994 14.6577,38.7406 -0.141734,53.4574l-201.688 199.585 -0.0118112 -0.0118112c-13.8781,13.8427 -36.3075,14.823 -51.3668,1.78349l-112.761 -97.7965z');
            checkmarkSVGCheck.setAttribute('fill', line.color);

            // checkmarkSVGCheck.setAttribute('fill', 'none');
            // checkmarkSVGCheck.setAttribute('fill', this.transformChart);
            // const lineButtonCircle = document.createElement('div');
            //
            // line.lineButtonElement.classList.add('line-button');
            checkmarkSVG.appendChild(checkmarkSVGCircle);
            checkmarkSVG.appendChild(checkmarkSVGCheck);
            line.lineButtonElement.appendChild(checkmarkSVG);
            line.lineButtonElement.appendChild(nameBox);
            this.buttonsContainer.appendChild(line.lineButtonElement);
        })
    };

    animateButtom = (mode, x, y) => {
        this.navigationButton.style.top = y + 'px';
        this.navigationButton.style.left = x - 10 + 'px';

        if (mode === 'show') this.navigationButton.classList.add('navigation-bar__button--pressed');
        if (mode === 'hide') this.navigationButton.classList.remove('navigation-bar__button--pressed');
    };

    updateNavigationWindowDimensions = () => {
        this.navigationForegroundLeft.style.right = `${100 - this.state.navigationWindowPositionLeft}%`;
        this.navigationForegroundWindow.style.left = `${this.state.navigationWindowPositionLeft}%`;
        this.navigationForegroundWindow.style.right = `${100 - this.state.navigationWindowPositionLeft - this.state.navigationWindowWidth}%`;
        this.navigationForegroundRight.style.left = `${this.state.navigationWindowPositionLeft + this.state.navigationWindowWidth}%`;
        this.refreshChart();
    };
    touchHandler = (e) => {
        const touchX = (e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
        const touchY = (e.type === 'touchstart' ? e.touches[0].clientY : e.clientY);

        this.tooltip.style.left = touchX + 'px';
        this.tooltip.style.top = touchY + 'px';
        console.log(this.tooltip.style.top, touchY + 'px');
        console.log(this.tooltip.style.top, touchY + 'px');
        console.log(this.tooltip);
    }
    touchStartHandler = e => {
        let mode = 'move';
        const rect = e.target.getBoundingClientRect();
        const touchX = (e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
        const touchY = (e.type === 'touchstart' ? e.touches[0].clientY : e.clientY);

        this.animateButtom('show', touchX, touchY - rect.top);

        if (touchX - rect.left < navigationWindowResizeTrheshold) mode = 'resizeRight';
        if (touchX - rect.left + navigationWindowResizeTrheshold > rect.width) mode = 'resizeLeft';
        this.state.mode = mode;
        e.preventDefault();
    };
    touchEndHandler = e => {
        console.log('end');
        this.state.mode = null;
        this.state.pointerCoords = {};
        this.multiplierXChart = null;
        this.updateCharts();
        this.animateButtom('hide');
        e.preventDefault();
    };
    touchMoveHandler = e => {
        if (this.state.mode) {
            const rect = this.navigationBar.getBoundingClientRect();
            const oldX = this.state.pointerCoords.x;
            const touchX = (e.type === 'touchmove' ? e.touches[0].clientX : e.clientX);
            const touchY = (e.type === 'touchmove' ? e.touches[0].clientY : e.clientY);

            this.state.pointerCoords = {
                x: touchX - rect.left,
                y: touchY - rect.top
            };
            if (oldX) {
                this.animateButtom('move', touchX, this.state.pointerCoords.y);

                const windowPositionLeftInPx = this.state.navigationWindowPositionLeft * this.navigationBar.offsetWidth / 100;
                const windowWithInPx = this.state.navigationWindowWidth * this.navigationBar.offsetWidth / 100;

                const navigationWindowPositionLeft =
                    (windowPositionLeftInPx + this.state.pointerCoords.x - oldX) / this.navigationBar.offsetWidth * 100;
                const navigationWindowWidth =
                    (windowWithInPx - this.state.pointerCoords.x + oldX) / this.navigationBar.offsetWidth * 100;

                switch (this.state.mode) {
                    case 'move': {
                        if (navigationWindowPositionLeft < 0) {
                            this.state.navigationWindowPositionLeft = 0
                        } else {
                            if (navigationWindowPositionLeft + this.state.navigationWindowWidth > 100) {
                                this.state.navigationWindowPositionLeft = 100 - this.state.navigationWindowWidth;
                            } else
                                this.state.navigationWindowPositionLeft =
                                    (windowPositionLeftInPx + this.state.pointerCoords.x - oldX) / this.navigationBar.offsetWidth * 100;
                        }
                        this.refreshMaxValues();
                        this.updateNavigationWindowDimensions();
                        this.transformChart(this.state.mode);
                        break;
                    }
                    case 'resizeLeft': {
                        if (navigationWindowWidth + navigationWindowPositionLeft > 100) {
                            this.state.navigationWindowWidth = 100 - this.state.navigationWindowPositionLeft;
                        } else {
                            this.state.navigationWindowWidth =
                                (windowWithInPx + this.state.pointerCoords.x - oldX) / this.navigationBar.offsetWidth * 100;
                        }
                        this.refreshMaxValues();
                        this.updateNavigationWindowDimensions();
                        this.transformChart(this.state.mode);
                        this.refreshXLabelsVisibility();
                        break;
                    }
                    case 'resizeRight': {
                        this.state.navigationWindowPositionLeft =
                            (windowPositionLeftInPx + this.state.pointerCoords.x - oldX) / this.navigationBar.offsetWidth * 100;
                        this.state.navigationWindowWidth =
                            (windowWithInPx - this.state.pointerCoords.x + oldX) / this.navigationBar.offsetWidth * 100;
                        this.refreshMaxValues();
                        this.updateNavigationWindowDimensions();
                        this.transformChart(this.state.mode);
                        this.refreshXLabelsVisibility();

                    }
                    //this.chartGroup.setAttribute('transform', `scale(${this.state.navigationWindowWidth / 100}, 1)`);
                }
            }
        }
        e.preventDefault();
    };

    resizeHandler = () => {
        this.axisXSize = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        this.multiplierXChart = null;
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(this.updateCharts, 50);
    };
    initEvents = () => {
        //this.navigationForegroundWindow.addEventListener('pointerdown', this.touchStartHandler, false);
        this.navigationForegroundWindow.addEventListener('touchstart', this.touchStartHandler, false);
        this.navigationForegroundWindow.addEventListener('mousedown', this.touchStartHandler, false);

        this.navigationForegroundWindow.addEventListener('touchmove', this.touchMoveHandler, false);
        this.navigationForegroundWindow.addEventListener('mousemove', this.touchMoveHandler, false);

        this.navigationForegroundWindow.addEventListener('touchend', this.touchEndHandler, false);
        this.navigationForegroundWindow.addEventListener('mouseup', this.touchEndHandler, false);
        this.navigationForegroundWindow.addEventListener('mouseleave', this.touchEndHandler, false);

        this.chartGroup.addEventListener('mouseover', this.touchHandler, false);
        window.addEventListener('resize', this.resizeHandler);
    }
}

console.log(data[1]);
new Diagram(data[1]);