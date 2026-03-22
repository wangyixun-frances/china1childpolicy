import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

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
        
    // Initial Scales (Focuses on Population data past 1979 first)
    const xScale = d3.scaleLinear()
        .domain(d3.extent(popData1979, d => d.year))
        .range([0, width]);
        
    const yScalePop = d3.scaleLinear()
        .domain([0, d3.max(popData, d => d.val)])
        .range([height, 0]);
        
    // Auxiliary Right Scale for Fertility    
    const yScaleFert = d3.scaleLinear()
        .domain([0, d3.max(fertData, d => d.val)])
        .range([height, 0]);
        
    const lineGenPop = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScalePop(d.val));
        
    const lineGenFert = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScaleFert(d.val));
        
    // Number Formatters
    const popFormat = d3.format(".2s");
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
        
    // Static Labels configured
    svg.append("text")
        .attr("x", -margin.left)
        .attr("y", -10)
        .attr("fill", "darkblue")
        .style("font-family", "'Noto Serif', serif")
        .style("font-weight", "bold")
        .text("Population");
        
    const fertLabel = svg.append("text")
        .attr("x", width - margin.right)
        .attr("y", -10)
        .attr("fill", "black")
        .style("opacity", 0)
        .style("font-family", "'Noto Serif', serif")
        .style("font-weight", "bold")
        .text("Fertility Rate");
        
    // Container linking to structural clip rects
    const graphArea = svg.append("g").attr("clip-path", "url(#main-clip)");
    const fertDrawArea = graphArea.append("g").attr("clip-path", "url(#draw-clip)");
    
    // Draw Population Base Line. Feeds FULL pop array, relying on clip-path hides left segments
    const linePop = graphArea.append("path")
        .datum(popData) 
        .attr("fill", "none")
        .attr("stroke", "darkblue")
        .attr("stroke-width", 3)
        .attr("d", lineGenPop);
        
    // Draw Fertility lines. Natively visible BUT trapped inside #draw-clip which has width=0 at start
    const lineFertRed = fertDrawArea.append("path")
        .datum(fertBefore1979)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 3)
        .attr("d", lineGenFert);

    const lineFertBlack = fertDrawArea.append("path")
        .datum(fertAfter1979)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("d", lineGenFert);

    let isHovered = false;

    // Orchestrate hover animation safely
    container.on("mouseenter", () => {
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
        
        // Expanding drawing window dynamically reveals fertility drawing logic perfectly rightwards
        d3.select("#draw-clip rect").transition().duration(1000).attr("width", width);
    })
    .on("mouseleave", () => {
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
        
        // Collapse the line clip visually "erasing" it accurately
        d3.select("#draw-clip rect").transition().duration(1000).attr("width", 0);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    drawChapter1();
});
