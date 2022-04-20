<script>
  import { huizhouData } from "./huizhouData.js";
  import { kunmingData } from "./kunmingData.js";
  import { hierarchy } from "d3-hierarchy";
  import { scaleLinear, scalePoint } from "d3-scale";
  import { line, curveBumpX } from "d3-shape";
  import { extent } from "d3-array";

  let keepCentral = true;
  let highlight = false;
  let compact = false;
  const highlightIDs = [1, 2, 3, 10, 14];
  const dehighlightOpacity = 0.2;
  let lineStrokeWidth = 3;
  let backgroundLineStrokeWidth = 0;
  let outerCircleRadius = 9;
  let innerCircleRadius = 6;
  let connectingLineColour = "#cccccc"

  let countyColour = "#DA3B32";
  let countyLevelCityColour = "#000000";
  let districtColour = "#3463da";
  let prefectureLevelCityColour = "#dacc34";
  let autonomousCountyColour = "#a2c6eb";

  const divisionNames = {
    Longmen: "龙门县",
    Boluo: "博罗县",
    Huiyang: "惠阳区",
    Huidong: "惠东县",
    Huicheng: "惠城区",
    Longchuan: "龙川县",
    Heping: "和平县",
    Lianping: "连平县",
    Yuancheng: "源城区",
    Zijin: "紫金县",
    Luhe: "陆河县",
    Haifeng: "海丰县",
    Lufeng: "陆丰市",
    Dongguan: "东莞市",
    "Shanwei urban": "汕尾城区",
    Nanshan: "南山区",
    Dongyuan: "东源县",
    Futian: "福田区",
    Shenzen: "宝安区",
    Luohu: "罗湖区",
    Yantian: "盐田区",
    Longgang: "龙岗区",
  };

  let vizData = huizhouData;
  //let vizData = kunmingData;

  // Extent of the years in the data
  let yearExtent = extent(vizData, (d) => d.year);
  // Add some some padding left and right
  let yearDomain = [yearExtent[0] - 1, yearExtent[1] + 1];
  let pointYearDomain = vizData.map((d) => d.year);

  const width = 800;
  const height = 500;
  $: x = compact
    ? scalePoint()
    .domain(pointYearDomain)
    .range([80, 250])
    : scaleLinear()
    .domain(yearDomain)
    .range([60, width - 120])

  let vizHierarchyData = vizData.map((d) => {
    let obj = {};
    obj.year = d.year;
    obj.divisions = returnDivisions(d, keepCentral);
    return obj;
  });

  function returnDivisions(level, keepcentral) {
    // Create a D3 hierarchy from the data
    let huizhouHierarchy = hierarchy(level.data);
    let secondLevels = huizhouHierarchy.children;

    // This array will hold the divisions data, with their y positions
    let divisions = [];
    let y = 0;

    secondLevels.forEach((d) => {
      let childDivisions = d.children.map((div, divInd) => {
        let divisionObj = {};
        divisionObj.data = div;
        divisionObj.year = div.data.year;
        // The y property of each division contains the index of its vertical position
        // Reposition the first two downwards to keep Huizhou in the middle for 1978 and 1979
        if (level.year === 1978 && keepcentral) {
          divisionObj.y = divInd + y + 2;
        } else if (level.year === 1979 && keepcentral) {
          divisionObj.y = divInd + y + 1;
        } /* Push everything down in 83 and 85 to keep Huizhou in the middle (id's 9 and 11 are the first 2 ones)  */ else if (
          (level.year === 1983 || level.year === 1985) &&
          keepcentral &&
          div.data.divisionID !== 9 &&
          div.data.divisionID !== 11
        ) {
          divisionObj.y = divInd + y + 1;
        } else {
          divisionObj.y = divInd + y;
        }
        return divisionObj;
      });
      divisions = divisions.concat(childDivisions);
      // shift everything 1 y-step further down after each second level
      y += childDivisions.length + 1;
    });
    return divisions;
  }

  // Get the coordinates of a division from its id and the hierarchydata
  // This is one array for each id, with id, year and values.year and values.y properties
  function getCoords(id, hierarchydata) {
    let divisionCoords = hierarchydata.map((yr) => {
      let obj = {};
      obj.year = yr.year;
      obj.id = id;
      let y;
      if (
        typeof yr.divisions.find((d) => d.data.data.divisionID === id) !==
        "undefined"
      ) {
        y = yr.divisions.find((d) => d.data.data.divisionID === id).y;
      } else {
        y = null;
      }
      obj.values = { year: yr.year, y: y };
      return obj;
    });
    return divisionCoords;
  }

  // Get all the data for the lines
  const lineData = Array.from({ length: 16 }, (_, i) => i + 1).map((d) =>
    getCoords(d, vizHierarchyData)
  );

  // Vertical spacing between the nodes
  let vertSpace = 14;

  // Colours
  let cols2 = {
    County: { fill: "#6CDB8B", stroke: "#1D6F1C" },
    countyLevelCity: { fill: "#fde0ef", stroke: "#d973a8" },
    district: { fill: "#e9a3c9", stroke: "#bf3d81" },
    prefectureLevelCity: { fill: "#bf3d81", stroke: "#c51b7d" },
    AutonomousCounty: { fill: "#a2c6eb", stroke: "#2d6196" },
  };
  $: cols = {
    County: { fill: countyColour, stroke: "#ffffff" },
    countyLevelCity: { fill: countyLevelCityColour, stroke: "#ffffff" },
    district: { fill: districtColour, stroke: "#ffffff" },
    prefectureLevelCity: { fill: prefectureLevelCityColour, stroke: "#ffffff" },
    AutonomousCounty: { fill: autonomousCountyColour, stroke: "#2d6196" },
  };

  $: lineGenerator = line()
    .x((d) => x(d.values.year))
    .y((d) => 20 + d.values.y * vertSpace)
    .defined((d) => d.values.y !== null)
    .curve(curveBumpX);

  const splitData = [
    [
      { values: { year: 1985, y: keepCentral ? 8 : 7 } },
      { values: { year: 1988, y: 10 } },
    ],
    [
      { values: { year: 1985, y: keepCentral ? 8 : 7 } },
      { values: { year: 1988, y: 11 } },
    ],
  ];

  const boundaryChanges = [
    { year: 2003, y: 4, status: "district" },
    { year: 2003, y: 5, status: "shrink" },
    { year: 2003, y: 6, status: "shrink" },
  ];

  //fill={cols[division.data.data.status].fill}
  //stroke={cols[division.data.data.status].stroke}
</script>

<label>
  <input type="checkbox" bind:checked={highlight} />
  Highlight
</label>
<label>
  <input type="checkbox" bind:checked={compact} />
  Compact
</label>

<label>
  Connecting lines stroke width
  <input type="number" bind:value={lineStrokeWidth} min="0" max="10" />
  <input type="range" bind:value={lineStrokeWidth} min="0" max="10" />
</label>
<label for="favcolor">Connecting line colour:
  <input type="color" id="favcolor" name="favcolor" bind:value={connectingLineColour}>
</label>
<label>
  Background connecting lines stroke width
  <input type="number" bind:value={backgroundLineStrokeWidth} min="0" max="20" />
  <input type="range" bind:value={backgroundLineStrokeWidth} min="0" max="20" />
</label>
<label>
  Outer circles radius
  <input type="number" bind:value={outerCircleRadius} min="0" max="20" />
  <input type="range" bind:value={outerCircleRadius} min="0" max="20" />
</label>
<label>
  Inner circles radius
  <input type="number" bind:value={innerCircleRadius} min="0" max="20" />
  <input type="range" bind:value={innerCircleRadius} min="0" max="20" />
</label>
<label>
  Vertical spacing
  <input type="number" bind:value={vertSpace} min="0" max="20" />
  <input type="range" bind:value={vertSpace} min="0" max="20" />
</label>
<label for="countycolor">County colour:
  <input type="color" id="countycolor" name="countycolor" bind:value={countyColour}>
</label>
<label for="countycitycolor">County level city colour:
  <input type="color" id="countycitycolor" name="countycitycolor" bind:value={countyLevelCityColour}>
</label>
<label for="countycitycolor">District colour:
  <input type="color" id="districtcolor" name="districtcolor" bind:value={districtColour}>
</label>
<label for="prefecturecolor">Prefecture level city colour:
  <input type="color" id="prefecturecolor" name="prefecturecolor" bind:value={prefectureLevelCityColour}>
</label>
<label for="autonomouscolor">Prefecture level city colour:
  <input type="color" id="autonomouscolor" name="autonomouscolor" bind:value={autonomousCountyColour}>
</label>
<svg {width} {height}>
  {#each lineData as line}
    <path
      d={lineGenerator(line)}
      fill={"none"}
      stroke={"#eeeeee"}
      opacity={!highlight && highlightIDs.includes(line.id)
        ? dehighlightOpacity
        : 1}
      stroke-width={backgroundLineStrokeWidth}
    />
    <path
      d={lineGenerator(line)}
      fill={"none"}
      stroke={connectingLineColour}
      opacity={!highlight && highlightIDs.includes(line.id)
        ? dehighlightOpacity
        : 1}
      stroke-width={lineStrokeWidth}
    />
  {/each}
  {#each splitData as line}
    <path
      d={lineGenerator(line)}
      fill={"none"}
      stroke={"#eeeeee"}
      opacity={!highlight ? 1 : dehighlightOpacity}
      stroke-width={backgroundLineStrokeWidth}
    />
  {/each}
  {#each splitData as line}
    <path
      d={lineGenerator(line)}
      fill={"none"}
      stroke={connectingLineColour}
      opacity={!highlight ? 1 : dehighlightOpacity}
      stroke-width={lineStrokeWidth}
    />
  {/each}
  {#each vizHierarchyData as year}
    <text x={x(year.year)} y={10} text-anchor="middle" font-size={10}
      >{year.year === 1978 || year.year === 1979
        ? year.year.toString().substring(2)
        : year.year}</text
    >
    {#each year.divisions as division}
      <circle
        cx={x(year.year)}
        cy={20 + division.y * vertSpace}
        r={outerCircleRadius}
        fill={"#000000"}
        stroke={"#000000"}
        stroke-width={1}
        opacity={highlightIDs.includes(division.data.data.divisionID)
          ? 1
          : highlight
          ? dehighlightOpacity
          : 1}
      />
    {/each}
    {#each year.divisions as division}
      <circle
        cx={x(year.year)}
        cy={20 + division.y * vertSpace}
        r={innerCircleRadius}
        fill={cols[division.data.data.status].fill}
        stroke={cols[division.data.data.status].stroke}
        stroke-width={1}
        opacity={highlightIDs.includes(division.data.data.divisionID)
          ? 1
          : highlight
          ? dehighlightOpacity
          : 1}
      />
      {#if year.year === yearExtent[0]}
        <text
          x={x(year.year) - 12}
          y={20 + division.y * vertSpace + 4}
          font-size={11}
          text-anchor={"end"}
          fill={cols[division.data.data.status].fill}
          opacity={highlightIDs.includes(division.data.data.divisionID)
            ? 1
            : highlight
            ? dehighlightOpacity
            : 1}>{division.data.data.name}</text
        >
      {/if}
      {#if year.year === yearExtent[1]}
        <text
          x={x(year.year) + 12}
          y={20 + division.y * vertSpace + 4}
          font-size={11}
          fill={cols[division.data.data.status].fill}
          opacity={highlightIDs.includes(division.data.data.divisionID)
            ? 1
            : highlight
            ? dehighlightOpacity
            : 1}>{divisionNames[division.data.data.name]}</text
        >
      {/if}
    {/each}
  {/each}
  {#each boundaryChanges as change}
    <circle
      cx={x(change.year) + 4}
      cy={20 + change.y * vertSpace - 4}
      r={3}
      stroke={change.status === "district" ? "white" : "white"}
      stroke-width={1}
      fill={change.status === "district" ? districtColour : "white"}
    />
  {/each}
  {#each Object.keys(cols) as legendColor, i}
    <circle
      cx={10 + i * 140}
      cy={300}
      r={6}
      fill={cols[legendColor].fill}
      stroke={cols[legendColor].fill}
    />
    <text x={20 + i * 140} y={304} font-size={12} fill={cols[legendColor].fill}
      >{legendColor}</text
    >
  {/each}
</svg>
<label for="countycolor">County colour:
  <input type="color" id="countycolor" name="countycolor" bind:value={countyColour}>
</label>
