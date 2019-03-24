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

const axisYLinesCount = 6;
const axisYSize = 380;
const offsetY = 30;
const labelXWith = 35;
const axisYNavigationSize = 40;
const navigationWindowResizeTrheshold = 15;

const themes = {
    dark: {
        chartArea: 'chart',
        chartName: 'chart-name',
        axisXLabelsContainer: 'axis-x-container',
        navigationBar: 'navigation-bar',
        navigationForegroundLeft: 'navigation-bar__foreground-left--dark',
        navigationForegroundWindow: 'navigation-bar__foreground-window--dark',
        navigationForegroundRight: 'navigation-bar__foreground-right--dark',
        navigationButton: 'navigation-bar__button',
        tooltip: 'tooltip--dark',
        tooltipHeader: 'tooltip-header',
        tooltipLegendContainer: 'tooltip-legend-container',
        tooltipLegend: 'tooltip-legend',
        tooltipLegendValue: 'tooltip-legend__value',
        tooltipLegendName: 'tooltip-legend__name'

    },
    light: {
        chartArea: 'chart',
        chartName: 'chart-name',
        axisXLabelsContainer: 'axis-x-container',
        navigationBar: 'navigation-bar',
        navigationForegroundLeft: 'navigation-bar__foreground-left--light',
        navigationForegroundWindow: 'navigation-bar__foreground-window--light',
        navigationForegroundRight: 'navigation-bar__foreground-right--light',
        navigationButton: 'navigation-bar__button',
        tooltip: 'tooltip--light',
        tooltipHeader: 'tooltip-header',
        tooltipLegendContainer: 'tooltip-legend-container',
        tooltipLegend: 'tooltip-legend',
        tooltipLegendValue: 'tooltip-legend__value',
        tooltipLegendName: 'tooltip-legend__name'

    }
};
const diagrams = [];

class Diagram {
    constructor(data, index) {
        this.root = document.createElement('div');
        this.chartArea = document.createElement('div');
        this.chartName = document.createElement('h2');
        this.chartName.innerText = data.name || 'Chart #'+index;
        this.chart = document.createElementNS(svgNS, 'svg');
        this.chartGroup = document.createElementNS(svgNS, 'g');

        this.axisXLabelsContainer = document.createElement('div');

        this.navigationBar = document.createElement('div');
        this.navigationChart = document.createElementNS(svgNS, 'svg');
        this.navigationForegroundLeft = document.createElement('div');
        this.navigationForegroundRight = document.createElement('div');
        this.navigationForegroundWindow = document.createElement('div');
        this.navigationButton = document.createElement('div');

        this.buttonsContainer = document.createElement('div');

        this.tooltip = document.createElement('div');
        this.tooltipHeader = document.createElement('div');
        this.tooltipLegendContainer = document.createElement('div');

        this.toggleThemeButton = document.createElement('button');

        this.axisX = {};
        this.lines = {};
        this.dataLength = 0;
        this.maxValue = 0;
        this.maxVisibleValue = 0;
        this.visibleData = {from: 0, to: 0};
        this.state = {
            navigationWindowWidth: 30,
            navigationWindowPositionLeft: 0,
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
            console.log(elementName);
            const classNames = theme[elementName];
            if (classNames) {
                const element = this[elementName];
                if (element) {
                    console.log(element);
                    element.removeAttribute('class');
                    element.classList.add(classNames);
                }
            }
        })
    }

    changeTheme = () => {
        console.log(theme);
        this.setClassnames(themes[theme]);
    }

    processData = data => {
        this.dataLength = data.columns[0].length;
        this.multiplierX = this.axisXSize / (this.dataLength - 1);
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

        line.tooltipLegend = document.createElement('div');
        line.tooltipLegend.classList.add('tooltip-legend');

        line.tooltipLegendValue = document.createElement('div');
        line.tooltipLegendValue.classList.add('tooltip-legend_value');

        line.tooltipLegendName = document.createElement('div');
        line.tooltipLegendName.classList.add('tooltip-legend_name');
        line.tooltipLegendName.innerText = line.name;

        line.tooltipLegend.appendChild(line.tooltipLegendValue);
        line.tooltipLegend.appendChild(line.tooltipLegendName);
        this.tooltipLegendContainer.appendChild(line.tooltipLegend);

//        this.polylineChart.addEventListener('mousleave', this.touchHandler, false);


    };
    getLineData = line => line.chartData = line.rawData.reduce((result, value, index) =>
        `${result} ${Math.ceil(this.multiplierXChart * index)},${Math.floor(this.multiplierYChart * (this.maxVisibleValue - value))} `, '');

    refreshXLabelsVisibility = () => {
        const axisXLabelsContainerWith = (this.dataLength - 1) * this.multiplierXChart - labelXWith / 2;
        const axisXLabelsRatio = Math.ceil((this.dataLength - 1) / (axisXLabelsContainerWith / labelXWith));

        this.axisXLabelsContainer.style.width = axisXLabelsContainerWith + 'px';
        this.axisX.htmlElements.forEach((element, index) => {
            element.style.left = this.multiplierXChart * index + 'px';
            if (!(index % axisXLabelsRatio)) {
                element.classList.remove('hidden')
            } else element.classList.add('hidden')
        });
    };

    updateCharts = animate => {
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
                this.axisYElements[index].label.setAttribute('class', 'axis-y-label');
                this.axisYElements[index].line.setAttribute('class', 'axis-y-line');
                this.axisYElements[index].label.style.bottom = `calc( ${(100 / axisYLinesCount * (axisYLinesCount - index - 1))}% + 5px )`;
                this.axisYElements[index].line.style.bottom = (100 / axisYLinesCount * index) + '%';
                this.axisYElements[index].label.innerHTML = value;
            } else
            {
                console.log(this.maxYValueChanged);
                if (this.maxYValueChanged) {
                    const transform = this.maxYValueChanged < 0 ? 50 : -50;
                    const element = this.axisYElements[index].label;
                    element.classList.add('axis-y-label--animated');
                    element.style.transform = 'translateY('+transform+'px)';
                    element.style.opacity = 0.1;
                    setTimeout(() => {
                        element.classList.remove('axis-y-label--animated');
                        element.style.transform = 'translateY('+-transform+'px)';
                        element.innerHTML = value;
                        setTimeout( () => {
                            element.classList.add('axis-y-label--animated');
                            element.style.opacity = 1;
                            element.style.transform = 'translateY(1px)';
                        },50);
                    },200);
                } else  this.axisYElements[index].label.innerHTML = value;
            }
        });
        this.maxYValueChanged = null;
        if (animate){
            // this.maxYValueHasChanged = false;
            Object.values(this.lines).forEach(line => {
                if (line.hidden) return;
                if (!line.polyline) this.addLineToChart(line);
                const newLineData = this.getLineData(line);
                line.chartData = newLineData;
                line.animateScale = document.createElementNS(svgNS, 'animate');
                // this.animateScale.setAttribute('id', 'ssssss');
                line.animateScale.setAttribute('dur', '0.3s');
                line.animateScale.setAttribute('attributeName', 'points');
                line.animateScale.setAttribute('to', newLineData);
                line.animateScale.setAttribute('fill', 'freeze');
                line.polyline.appendChild(line.animateScale);
                line.animateScale.beginElement();
                setTimeout(() => {
                    line.polyline.setAttribute('points', line.chartData);
                    line.polyline.removeChild(line.animateScale);
                }, 400 );

                // line.chartData = newLineData;
                // line.polyline.setAttribute('points', line.chartData);
            });
        } else {
            Object.values(this.lines).forEach(line => {
                if (line.hidden) return;
                if (!line.polyline) this.addLineToChart(line);
                const newLineData = this.getLineData(line);

                line.chartData = newLineData;
                line.polyline.setAttribute('points', line.chartData);
            });
        }
        this.refreshXLabelsVisibility();
    };

    refreshMaxValues = () => {
        console.log('refreshMaxValues');
        console.log('multiplierXChart', this.multiplierXChart);
        const oldVisibleValue = this.maxVisibleValue;
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
        if (this.maxVisibleValue !== oldVisibleValue) this.maxYValueChanged = this.maxVisibleValue - oldVisibleValue;
        this.multiplierYNavigation = axisYNavigationSize / this.maxValue;

        const multiplierYChart = axisYSize / this.maxVisibleValue;
        const multiplierXChart = this.multiplierXChart || this.axisXSize / (this.visibleData.to - this.visibleData.from);
        this.multiplierYChart = multiplierYChart;
        this.multiplierXChart = multiplierXChart;
        console.log('multiplierXChart', this.multiplierXChart);

        this.axisYMarks = [...Array(axisYLinesCount)]
            .map((item, index) => Math.ceil((this.maxVisibleValue / axisYLinesCount) * index)).reverse();
    };

    refreshChartViewboxSize() {
        this.chart.setAttribute('viewBox',
            `${0} -10 ${this.state.navigationWindowWidth * this.multiplierXChart * (this.dataLength - 1) / 100} ${axisYSize}`);
    }

    transformChart = mode => {
        this.chartGroup.setAttribute('transform', `translate(${-(this.state.navigationWindowPositionLeft) * this.multiplierXChart * (this.dataLength-1) / 100}, 0)`);
        this.axisXLabelsContainer.style.transform = `translateX(${-(this.state.navigationWindowPositionLeft) * this.multiplierXChart * (this.dataLength -1) / 100}px)`;
    };

    refreshChart() {
        this.refreshMaxValues();
        this.refreshChartViewboxSize();
        this.transformChart();
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

        this.tooltip.appendChild(this.tooltipHeader);
        this.tooltip.appendChild(this.tooltipLegendContainer );

        this.createButtons();

        this.setClassnames(themes[theme]);
        this.root.appendChild(this.chartName);
        this.root.appendChild(this.chartArea);
        this.root.appendChild(this.axisXLabelsContainer);
        this.root.appendChild(this.navigationBar);
        this.root.appendChild(this.buttonsContainer);

        this.chartArea.appendChild(this.tooltip);

        document.getElementById('wrapper').appendChild(this.root);

    }

    createButtons = () => {
        Object.values(this.lines).forEach((line) => {
            if (line.hidden) return;
            line.lineButtonElement = document.createElement('div');
            line.lineButtonElement.classList.add('chart-button');
            line.lineButtonElement.line = line;
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

            checkmarkSVGCheck.setAttribute('d', 'M319.988 0c176.719,0 320.012,143.293 320.012,320 0,176.719 -143.293,320 -320.012,320 -176.695,0 -319.988,-143.281 -319.988,-320 0,-176.707 143.293,-320 319.988,-320zm-181.951 350.591c-15.7797,-13.6419 -17.5042,-37.5005 -3.85044,-53.2802 13.6537,-15.7797 37.5241,-17.5042 53.3038,-3.85044l86.3278 74.8592 176.742 -174.9c14.7876,-14.7049 38.7406,-14.6458 53.4455,0.153545 14.7167,14.7994 14.6577,38.7406 -0.141734,53.4574l-201.688 199.585 -0.0118112 -0.0118112c-13.8781,13.8427 -36.3075,14.823 -51.3668,1.78349l-112.761 -97.7965z');
            checkmarkSVGCheck.setAttribute('fill', line.color);

            checkmarkSVG.appendChild(checkmarkSVGCircle);
            checkmarkSVG.appendChild(checkmarkSVGCheck);
            line.lineButtonElement.appendChild(checkmarkSVG);
            line.lineButtonElement.appendChild(nameBox);
            line.checkmarkSVGCheck = checkmarkSVGCheck;
            line.lineButtonElement.addEventListener('click', this.toggleLineVisibility, true);
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
    };
    toggleLineVisibility = (e) => {
        this.toggleTooltip();
        e.currentTarget.line.hidden = !e.currentTarget.line.hidden;
        e.currentTarget.line.polyline.style.visibility = e.currentTarget.line.hidden ? 'hidden' : 'visible';
        e.currentTarget.line.checkmarkSVGCheck.style.visibility = e.currentTarget.line.hidden ? 'hidden' : 'visible';
        this.updateCharts(true);
    };
    toggleTooltip = (x,y) => {
        if(!x || !y) {
            this.tooltip.style.display = 'none';
            Object.values(this.lines).forEach(line => {
                if (line.circle) {
                    this.chartGroup.removeChild(line.circle);
                    delete (line.circle);
                };
            });
        } else {
            this.tooltip.style.display = 'block';
            this.tooltip.style.left = this.axisXSize/2 > x ? x + 'px' : null;
            this.tooltip.style.right = this.axisXSize/2 > x ? null : (this.axisXSize - x + 'px');
            this.tooltip.style.top = axisYSize/2 > y ? y + 'px' : null;
            this.tooltip.style.bottom = axisYSize/2 > y ? null : (axisYSize - y + 'px');
            const index = Math.floor(x / (this.axisXSize / (this.visibleData.to - this.visibleData.from))) + this.visibleData.from;
            const data = (new Date(this.axisX.data[index])).toDateString().split(' ');
            this.tooltipHeader.innerText=`${data[0]}, ${data[1]} ${data[2]}`;

            Object.values(this.lines).forEach(line => {
                console.log(this.multiplierXChart);
                line.tooltipLegend.style.visibility = line.hidden ? 'hidden' : 'visible';
                line.tooltipLegend.style.color = line.color;
                line.tooltipLegendValue.innerText = line.rawData[index];
                line.circle = line.circle || this.chartGroup.appendChild(document.createElementNS(svgNS, 'circle'));
                line.circle.setAttribute('cx', Math.ceil(this.multiplierXChart * index));
                line.circle.setAttribute('cy', Math.floor(this.multiplierYChart * (this.maxVisibleValue - line.rawData[index])));
                line.circle.setAttribute('r', 5);
                line.circle.setAttribute('class', theme);
                line.circle.setAttribute('stroke', line.color);
                line.circle.setAttribute('stroke-width', 3);
            })
        }
    }
    touchHandler = (e) => {
        const touchX = (e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
        const touchY = (e.type === 'touchstart' ? e.touches[0].clientY : e.clientY);

        this.toggleTooltip(touchX, touchY);
    }
    touchStartHandler = e => {
        this.toggleTooltip();
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
        this.toggleTooltip();
        this.state.pointerCoords = {};
        this.multiplierXChart = null;
        this.refreshMaxValues();
        if (this.state.mode === 'move') this.updateCharts(true);
        this.state.mode = null;
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
                        this.multiplierXChart = null;
                        this.updateNavigationWindowDimensions();
                        this.updateCharts();
                        break;
                    }
                    case 'resizeRight': {
                        this.state.navigationWindowPositionLeft =
                            (windowPositionLeftInPx + this.state.pointerCoords.x - oldX) / this.navigationBar.offsetWidth * 100;
                        this.state.navigationWindowWidth =
                            (windowWithInPx - this.state.pointerCoords.x + oldX) / this.navigationBar.offsetWidth * 100;
                        this.multiplierXChart = null;
                        this.updateNavigationWindowDimensions();
                        this.updateCharts();
                    }
                    //this.chartGroup.setAttribute('transform', `scale(${this.state.navigationWindowWidth / 100}, 1)`);
                }
            }
        }
        e.preventDefault();
    };

    resizeHandler = () => {
        this.toggleTooltip();
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

        this.chart.addEventListener('click', this.touchHandler, false);
        this.tooltip.addEventListener('click', this.toggleTooltip);

        this.toggleThemeButton.addEventListener('click', this.toggleTheme);
        window.addEventListener('resize', this.resizeHandler);
    }
}


function toggleTheme() {
    document.body.classList.remove(theme);
    theme = theme === 'dark' ? 'light' : 'dark';
    document.body.classList.add(theme);
    diagrams.forEach( diagram => diagram.changeTheme());
}

let theme = 'dark';
document.body.classList.add(theme);
diagrams.push (new Diagram(data[1], 1));
document.getElementById('toggleThemeButton').addEventListener('click', toggleTheme);
// new Diagram(data[2]);
// new Diagram(data[3]);
// new Diagram(data[4]);
// new Diagram(data[5]);