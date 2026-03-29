import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

async function drawChapter1() {
    const popUrl = "data/raw data/China-Population-Population-2026-03-23-01-48.csv";
    const fertUrl = "data/raw data/China-Fertility-Rate-Births-per-Woman-2026-03-23-00-48.csv";

    // Fetch both datasets concurrently
    const [popDataRaw, fertDataRaw] = await Promise.all([
        d3.dsv(";", popUrl),
        d3.dsv(";", fertUrl)
    ]);

    // Parse Population
    const popData = popDataRaw.map(d => {
        const yearStr = d[''] || Object.values(d)[0];
        return {
            year: +yearStr,
            val: +d['Population']
        };
    }).filter(d => !isNaN(d.year) && !isNaN(d.val));

    // Parse Fertility
    const fertData = fertDataRaw.map(d => {
        const yearStr = d[''] || Object.values(d)[0];
        return {
            year: +yearStr,
            val: +d['Fertility Rate']
        };
    }).filter(d => !isNaN(d.year) && !isNaN(d.val));

    // Subsets
    const popData1979 = popData.filter(d => d.year >= 1979);
    const fertBefore1979 = fertData.filter(d => d.year <= 1979);
    const fertAfter1979 = fertData.filter(d => d.year >= 1979);

    const container = d3.select("#chart-mount-1");
    container.html(""); // clear placeholder

    // Adjust right margin carefully to fit the secondary Y-axis label
    const margin = { top: 40, right: 60, bottom: 50, left: 60 };
    const node = container.node();
    const width = node.clientWidth - margin.left - margin.right;
    const height = node.clientHeight - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Base Clip paths: Prevents the lines drawing outside chart bounds safely
    const defs = svg.append("defs");
    defs.append("clipPath")
        .attr("id", "main-clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    // Draw Clip path: starts at 0, builds to width during transition to fake drawing natively
    defs.append("clipPath")
        .attr("id", "draw-clip")
        .append("rect")
        .attr("width", 0)
        .attr("height", height);

    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(popData1979, d => d.year))
        .range([0, width]);

    const yScalePop = d3.scaleLinear()
        .domain([400000000, 1600000000])
        .range([height, 0]);

    // Right Scale for Fertility    
    const yScaleFert = d3.scaleLinear()
        .domain([0, 8])
        .range([height, 0]);

    const lineGenPop = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScalePop(d.val));

    const lineGenFert = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScaleFert(d.val));

    // Number Formatters (Convert default 'G' locally to 'B' for billion)
    const popFormat = d => d3.format(".2s")(d).replace(/G/g, "B");
    const fertFormat = d3.format(".1f");

    // Prepare the standard dynamic axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxisPop = d3.axisLeft(yScalePop).tickFormat(popFormat);
    const yAxisFert = d3.axisRight(yScaleFert).tickFormat(fertFormat);

    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    const yAxisPopGroup = svg.append("g")
        .call(yAxisPop);

    const yAxisFertGroup = svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .style("opacity", 0)
        .call(yAxisFert);

    // y axis labels
    svg.append("text")
        .attr("x", -margin.left + 15)
        .attr("y", -15)
        .attr("fill", "darkblue")
        .style("font-family", "'Noto Serif', serif")
        .style("font-size", "0.7rem")
        .text("Population");

    const fertLabel = svg.append("text")
        .attr("x", width - margin.right + 15)
        .attr("y", -15)
        .attr("fill", "red")
        .style("opacity", 0)
        .style("font-family", "'Noto Serif', serif")
        .style("font-size", "0.7rem")
        .text("Fertility Rate");

    // Container linking to structural clip rects
    const graphArea = svg.append("g").attr("clip-path", "url(#main-clip)");

    // Shadings
    const shade1960s = graphArea.append("rect")
        .attr("x", xScale(1960))
        .attr("y", 0)
        .attr("width", Math.max(0, xScale(1970) - xScale(1960)))
        .attr("height", height)
        .attr("fill", "#767373b2")
        .style("opacity", 0);

    const shade1970s = graphArea.append("rect")
        .attr("x", xScale(1970))
        .attr("y", 0)
        .attr("width", Math.max(0, xScale(1980) - xScale(1970)))
        .attr("height", height)
        .attr("fill", "#767373b2")
        .style("opacity", 0);

    const fertDrawArea = graphArea.append("g").attr("clip-path", "url(#draw-clip)");

    // Draw Population Base Line
    const linePop = graphArea.append("path")
        .datum(popData)
        .attr("fill", "none")
        .attr("stroke", "darkblue")
        .attr("stroke-width", 1.5)
        .attr("d", lineGenPop);

    // Draw Fertility lines. Natively visible BUT trapped inside #draw-clip which has width=0 at start
    const lineFertRed = fertDrawArea.append("path")
        .datum(fertBefore1979)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 1.5)
        .attr("d", lineGenFert);

    const lineFertBlack = fertDrawArea.append("path")
        .datum(fertAfter1979)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr("d", lineGenFert);

    // 1979 Vertical Reference Line (hidden until fertility is shown)
    const group1979 = graphArea.append("g")
        .attr("transform", `translate(${xScale(1979)}, 0)`)
        .style("opacity", 0);

    group1979.append("line")
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "var(--muted)")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4");

    group1979.append("rect")
        .attr("x", -24)
        .attr("y", 3)
        .attr("width", 48)
        .attr("height", 24)
        .attr("fill", "white")
        .attr("rx", 4)
        .attr("stroke", "var(--muted)")
        .attr("stroke-width", 1);

    group1979.append("text")
        .attr("y", 20)
        .attr("x", 0)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--ink)")
        .style("font-family", "'Noto Serif', serif")
        .style("font-weight", "bold")
        .style("font-size", "0.95rem")
        .text("1979");


    // === TOOLTIP SETUP ===
    const bisectYear = d3.bisector(d => d.year).left;

    const focus = graphArea.append("g")
        .style("display", "none")
        .style("pointer-events", "none");

    focus.append("circle")
        .attr("r", 6)
        .attr("fill", "var(--bg)")
        .attr("stroke", "currentColor")
        .attr("stroke-width", 1.5);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "var(--card)")
        .style("border", "1px solid var(--border)")
        .style("padding", "10px 14px")
        .style("border-radius", "8px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("font-family", "'Noto Serif', serif")
        .style("box-shadow", "var(--shadow)")
        .style("font-size", "0.95rem")
        .style("z-index", 100);

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", () => {
            focus.style("display", null);
            tooltip.style("opacity", 1);
        })
        .on("mouseout", () => {
            focus.style("display", "none");
            tooltip.style("opacity", 0);
        })
        .on("mousemove", (event) => {
            const mCoords = d3.pointer(event);
            const mX = mCoords[0];
            const mY = mCoords[1];
            const x0 = xScale.invert(mX);

            // Helper function to get nearest data point safely
            function getClosestPoint(dataset) {
                if (!dataset || dataset.length === 0) return null;
                const i = bisectYear(dataset, x0, 1);
                const d0 = dataset[i - 1];
                const d1 = dataset[i];
                if (d0 && d1) {
                    return x0 - d0.year > d1.year - x0 ? d1 : d0;
                }
                return d1 || d0;
            }

            // Decide datasets available
            const popDataset = isHovered ? popData : popData1979;
            const popPoint = getClosestPoint(popDataset);

            let fertPoint = null;
            if (isHovered) {
                fertPoint = getClosestPoint(fertData);
            }

            let activeType = "pop";
            let activePoint = popPoint;

            // Distance-based logic to snap to the physically closest line graph
            if (isHovered && popPoint && fertPoint) {
                const popX = xScale(popPoint.year);
                const popY = yScalePop(popPoint.val);
                const distPop = Math.sqrt(Math.pow(popX - mX, 2) + Math.pow(popY - mY, 2));

                const fertX = xScale(fertPoint.year);
                const fertY = yScaleFert(fertPoint.val);
                const distFert = Math.sqrt(Math.pow(fertX - mX, 2) + Math.pow(fertY - mY, 2));

                if (distFert < distPop) {
                    activeType = "fert";
                    activePoint = fertPoint;
                }
            }

            if (!activePoint) return;

            const currentX = xScale(activePoint.year);
            let currentY;

            if (activeType === "fert") {
                currentY = yScaleFert(activePoint.val);
                const color = activePoint.year < 1979 ? "red" : "black";
                focus.select("circle").attr("stroke", color);
                tooltip.html(`<strong>Year:</strong> ${activePoint.year}<br><strong>Fertility Rate:</strong> ${activePoint.val.toFixed(2)}`);
            } else {
                currentY = yScalePop(activePoint.val);
                focus.select("circle").attr("stroke", "darkblue");
                tooltip.html(`<strong>Year:</strong> ${activePoint.year}<br><strong>Population:</strong> ${popFormat(activePoint.val)}`);
            }

            focus.attr("transform", `translate(${currentX},${currentY})`);

            tooltip
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 30) + "px");
        });
    // === END TOOLTIP SETUP ===

    let isHovered = false;

    // Export scrollama actions
    return {
        showFertility: () => {
            if (isHovered) return;
            isHovered = true;

            // Expand horizontal chart constraints backward cleanly to 1950
            xScale.domain(d3.extent(popData, d => d.year));

            // Glide Axes smoothly out
            xAxisGroup.transition().duration(1000).call(xAxis);
            yAxisFertGroup.transition().duration(1000).style("opacity", 1);
            fertLabel.transition().duration(1000).style("opacity", 1);

            // Glide lines smoothly rightwards
            linePop.transition().duration(1000).attr("d", lineGenPop);
            lineFertRed.transition().duration(1000).attr("d", lineGenFert);
            lineFertBlack.transition().duration(1000).attr("d", lineGenFert);

            // Show and glide the 1979 vertical line so it stays anchored to 1979
            group1979.transition().duration(1000)
                .style("opacity", 1)
                .attr("transform", `translate(${xScale(1979)}, 0)`);

            // Update shade element position mapping 
            shade1960s.transition().duration(1000)
                .attr("x", xScale(1960))
                .attr("width", Math.max(0, xScale(1970) - xScale(1960)));

            shade1970s.transition().duration(1000)
                .attr("x", xScale(1970))
                .attr("width", Math.max(0, xScale(1980) - xScale(1970)));

            // Expanding drawing window dynamically reveals fertility drawing logic perfectly rightwards
            d3.select("#draw-clip rect").transition().duration(1000).attr("width", width);
        },
        showPopulation: () => {
            if (!isHovered) return;
            isHovered = false;

            // Restore domain correctly to 1979 limits exactly 
            xScale.domain(d3.extent(popData1979, d => d.year));

            // Retract axes
            xAxisGroup.transition().duration(1000).call(xAxis);
            yAxisFertGroup.transition().duration(1000).style("opacity", 0);
            fertLabel.transition().duration(1000).style("opacity", 0);

            // Sync lines backwards hiding out of bounds segments structurally 
            linePop.transition().duration(1000).attr("d", lineGenPop);
            lineFertRed.transition().duration(1000).attr("d", lineGenFert);
            lineFertBlack.transition().duration(1000).attr("d", lineGenFert);

            // Hide and glide the 1979 vertical line back
            group1979.transition().duration(1000)
                .style("opacity", 0)
                .attr("transform", `translate(${xScale(1979)}, 0)`);

            // Sync shade back 
            shade1960s.transition().duration(1000)
                .attr("x", xScale(1960))
                .attr("width", Math.max(0, xScale(1970) - xScale(1960)));

            // Collapse the line clip visually "erasing" it accurately
            d3.select("#draw-clip rect").transition().duration(1000).attr("width", 0);
        },
        toggleShade1960s: (show) => {
            shade1960s.transition().duration(1000)
                .attr("x", xScale(1960))
                .attr("width", Math.max(0, xScale(1970) - xScale(1960)))
                .style("opacity", show ? 0.25 : 0);
        },
        toggleShade1970s: (show) => {
            shade1970s.transition().duration(1000)
                .attr("x", xScale(1970))
                .attr("width", Math.max(0, xScale(1980) - xScale(1970)))
                .style("opacity", show ? 0.25 : 0);
        }
    };
}

async function drawPyramid() {
    const pyramidData = await d3.json("manifest.json");
    const years = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2024];
    const ageGroups = ['0-4','5-9','10-14','15-19','20-24','25-29','30-34','35-39',
                       '40-44','45-49','50-54','55-59','60-64','65-69','70-74','75-79',
                       '80-84','85-89','90-94','95-99','100+'];

    const container = d3.select("#chart-mount-pyramid");
    container.html("")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("justify-content", "flex-start")
        .style("align-items", "stretch");

    const node = container.node();
    const totalWidth = node.clientWidth;
    const totalHeight = node.clientHeight;

    const sliderAreaHeight = 82;
    const svgHeight = totalHeight - sliderAreaHeight;
    const svgWidth = totalWidth;

    const margin = { top: 30, right: 14, bottom: 6, left: 14 };
    const innerWidth = svgWidth - margin.left - margin.right;
    const innerHeight = svgHeight - margin.top - margin.bottom;

    const centerWidth = 56;
    const barAreaWidth = (innerWidth - centerWidth) / 2;

    // Fixed global scale so shape comparisons are consistent across years
    const maxVal = d3.max(years, yr => d3.max(ageGroups, ag => pyramidData[yr][ag]));

    const xScale = d3.scaleLinear()
        .domain([0, maxVal])
        .range([0, barAreaWidth]);

    const yScale = d3.scaleBand()
        .domain(ageGroups)
        .range([innerHeight, 0])
        .padding(0.09);

    const svg = container.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .style("flex-shrink", "0");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Subtle gridlines + top tick labels
    const tickVals = xScale.ticks(4).filter(v => v > 0);
    const fmtM = v => `${(v / 1000).toFixed(0)}M`;

    tickVals.forEach(v => {
        const lx = barAreaWidth - xScale(v);
        const rx = barAreaWidth + centerWidth + xScale(v);

        g.append("line").attr("x1", lx).attr("x2", lx).attr("y1", 0).attr("y2", innerHeight)
            .style("stroke", "var(--border)").style("stroke-width", 0.5).style("stroke-dasharray", "3,3");
        g.append("line").attr("x1", rx).attr("x2", rx).attr("y1", 0).attr("y2", innerHeight)
            .style("stroke", "var(--border)").style("stroke-width", 0.5).style("stroke-dasharray", "3,3");

        g.append("text").attr("x", lx).attr("y", 10).attr("text-anchor", "middle")
            .style("font-family", "'Noto Serif', serif").style("font-size", "0.7rem")
            .style("fill", "var(--muted)").text(fmtM(v));
        g.append("text").attr("x", rx).attr("y", 10).attr("text-anchor", "middle")
            .style("font-family", "'Noto Serif', serif").style("font-size", "0.7rem")
            .style("fill", "var(--muted)").text(fmtM(v));
    });

    // Center axis line
    g.append("line")
        .attr("x1", barAreaWidth + centerWidth / 2).attr("x2", barAreaWidth + centerWidth / 2)
        .attr("y1", 0).attr("y2", innerHeight)
        .style("stroke", "var(--border)").style("stroke-width", 1);

    // Age group labels in center
    const bw = yScale.bandwidth();
    ageGroups.forEach(age => {
        g.append("text")
            .attr("x", barAreaWidth + centerWidth / 2)
            .attr("y", yScale(age) + bw / 2 + 4)
            .attr("text-anchor", "middle")
            .style("font-family", "'Noto Serif', serif")
            .style("font-size", Math.min(bw * 0.62, 10) + "px")
            .style("fill", "var(--ink)")
            .text(age);
    });

    // header labels
    g.append("text").attr("x", barAreaWidth + centerWidth/2).attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-family", "'Noto Serif', serif").style("font-size", "0.7rem")
        .style("fill", "var(--ink)").text("Age Group");

    g.append("text").attr("x", barAreaWidth / 2).attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-family", "'Noto Serif', serif").style("font-size", "0.7rem")
        .style("fill", "var(--ink)").text("← Population");

    g.append("text").attr("x", barAreaWidth + centerWidth + barAreaWidth / 2).attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-family", "'Noto Serif', serif").style("font-size", "0.7rem")
        .style("fill", "var(--ink)").text("Population →");


    // Left bars (extend left from barAreaWidth)
    const leftGroup = g.append("g").attr("transform", `translate(${barAreaWidth},0)`);
    const leftBars = leftGroup.selectAll("rect")
        .data(ageGroups).join("rect")
        .attr("y", d => yScale(d)).attr("height", bw)
        .attr("x", 0).attr("width", 0)
        .attr("fill", "#a71616").attr("rx", 1.5).attr("opacity", 0.82);

    // Right bars (extend right from barAreaWidth + centerWidth)
    const rightGroup = g.append("g").attr("transform", `translate(${barAreaWidth + centerWidth},0)`);
    const rightBars = rightGroup.selectAll("rect")
        .data(ageGroups).join("rect")
        .attr("y", d => yScale(d)).attr("height", bw)
        .attr("x", 0).attr("width", 0)
        .attr("fill", "#a71616").attr("rx", 1.5).attr("opacity", 0.82);

    function update(year, animate = true) {
        const data = pyramidData[year];
        const dur = animate ? 650 : 0;

        leftBars.transition().duration(dur).ease(d3.easeCubicInOut)
            .attr("x", d => -xScale(data[d]))
            .attr("width", d => xScale(data[d]));

        rightBars.transition().duration(dur).ease(d3.easeCubicInOut)
            .attr("width", d => xScale(data[d]));
    }

    // Slider area
    const sliderDiv = container.append("div")
        .style("flex", "none")
        .style("height", sliderAreaHeight + "px")
        .style("padding", "10px 20px 6px")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("align-items", "center")
        .style("box-sizing", "border-box")
        .style("border-top", "1px solid var(--border)");

    const yearDisplay = sliderDiv.append("div")
        .style("font-family", "'Noto Serif', serif")
        .style("font-size", "1.5rem")
        .style("font-weight", "700")
        .style("color", "var(--ink)")
        .style("line-height", "1")
        .style("margin-bottom", "3px")
        .text("Chinese Population in 1950");

    const sliderWrap = sliderDiv.append("div").style("width", "100%");

    sliderWrap.append("input")
        .attr("type", "range").attr("min", 0).attr("max", years.length - 1)
        .attr("value", 0).attr("step", 1)
        .style("width", "100%").style("cursor", "pointer").style("accent-color", "#a71616")
        .on("input", function () {
            const yr = years[+this.value];
            yearDisplay.text(`Chinese Population in ${yr}`);
            update(yr);
        });

    const ticksRow = sliderWrap.append("div")
        .style("display", "flex").style("justify-content", "space-between")
        .style("margin-top", "-8px");
    years.forEach(yr => {
        ticksRow.append("span")
            .style("font-family", "'Noto Serif', serif")
            .style("font-size", "0.58rem").style("color", "var(--muted)").text(yr);
    });

    update(1950, false);

    return {
        show: () => {
            d3.select("#chart-mount-pyramid").transition().duration(500)
                .style("opacity", 1).style("pointer-events", "all");
            d3.select("#chart-mount-1").transition().duration(500)
                .style("opacity", 0).style("pointer-events", "none");
        },
        hide: () => {
            d3.select("#chart-mount-pyramid").transition().duration(500)
                .style("opacity", 0).style("pointer-events", "none");
            d3.select("#chart-mount-1").transition().duration(500)
                .style("opacity", 1).style("pointer-events", "all");
        }
    };
}

async function initScrollyTelling() {
    // Generate Chapter 1 logic and pull animation interfaces
    const chapter1Actions = await drawChapter1();
    const pyramidActions = await drawPyramid();

    const scroller = scrollama();

    scroller
        .setup({
            step: ".step",
            offset: 0.5,
            debug: false
        })
        .onStepEnter((response) => {
            d3.select(response.element).classed("is-active", true);

            const index = +d3.select(response.element).attr("data-index");

            if (index === 0 || index === 1) {
                chapter1Actions.showPopulation();
                chapter1Actions.toggleShade1960s(false);
                chapter1Actions.toggleShade1970s(false);
                pyramidActions.hide();
            } else if (index === 2) {
                chapter1Actions.showFertility();
                chapter1Actions.toggleShade1960s(false);
                chapter1Actions.toggleShade1970s(false);
                pyramidActions.hide();
            } else if (index === 3) {
                chapter1Actions.showFertility();
                chapter1Actions.toggleShade1960s(true);
                pyramidActions.hide();
            } else if (index === 4) {
                chapter1Actions.showFertility();
                chapter1Actions.toggleShade1960s(false);
                chapter1Actions.toggleShade1970s(true);
                pyramidActions.hide();
            } else if (index >= 5) {
                chapter1Actions.showFertility();
                chapter1Actions.toggleShade1960s(false);
                chapter1Actions.toggleShade1970s(false);
                pyramidActions.show();
            }
        })
        .onStepExit((response) => {
            d3.select(response.element).classed("is-active", false);

            const index = +d3.select(response.element).attr("data-index");

            if ((index === 0 || index === 1) && response.direction === 'up') {
                chapter1Actions.showPopulation();
            }
            if (index === 3 && response.direction === 'up') {
                chapter1Actions.toggleShade1960s(false);
            }
            if (index === 4 && response.direction === 'up') {
                chapter1Actions.toggleShade1970s(false);
            }
            if (index === 5 && response.direction === 'up') {
                pyramidActions.hide();
            }
        });

    window.addEventListener("resize", scroller.resize);
}

document.addEventListener("DOMContentLoaded", () => {
    initScrollyTelling();
});
