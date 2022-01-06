<script>
  import { huizhouData } from "./huizhouData.js";
  import { hierarchy } from "d3-hierarchy";
  import { scaleLinear } from "d3-scale";
  import { line, curveBumpX } from "d3-shape";

  let keepCentral = false;
  let highlight = false;
  const highlightIDs = [1, 2, 3, 10, 14];
  const dehighlightOpacity = 0.2;

  const width = 600;
  let x = scaleLinear()
    .domain([1977, 2004])
    .range([60, width - 50]);

  let huizhouHierarchyData = huizhouData.map((d) => {
    let obj = {};
    obj.year = d.year;
    obj.divisions = returnDivisions(d, keepCentral);
    return obj;
  });

  function returnDivisions(level, keepcentral) {
    let huizhouHierarchy = hierarchy(level.data);
    let secondLevels = huizhouHierarchy.children;

    let divisions = [];
    let y = 0;

    secondLevels.forEach((d) => {
      let childDivisions = d.children.map((div, divInd) => {
        let divisionObj = {};
        divisionObj.data = div;
        divisionObj.year = div.data.year;
        if (level.year === 1978 && keepcentral) {
          divisionObj.y = divInd + y + 2;
        } else if (level.year === 1979 && keepcentral) {
          divisionObj.y = divInd + y + 1;
        } else if (
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
      y += childDivisions.length + 1;
    });
    return divisions;
  }

  function getCoords(id, hierarchydata) {
    let divisionCoords = hierarchydata.map((yr) => {
      let obj = {};
      //obj.year = yr.year;
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

  const lineData = Array.from({ length: 16 }, (_, i) => i + 1).map((d) =>
    getCoords(d, huizhouHierarchyData)
  );

  let vertSpace = 14;
  let cols = {
    County: { fill: "#6CDB8B", stroke: "#1D6F1C" },
    countyLevelCity: { fill: "#fde0ef", stroke: "#d973a8" },
    district: { fill: "#e9a3c9", stroke: "#bf3d81" },
    prefectureLevelCity: { fill: "#bf3d81", stroke: "#c51b7d" },
  };

  const lineGenerator = line()
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
</script>

<label>
  <input type="checkbox" bind:checked={highlight} />
  Highlight
</label>

<label>
  <input type="checkbox" bind:checked={keepCentral} />
  Keep Huizhou in the middle
</label>
<svg width={600} height={600}>
  {#each lineData as line}
    <path
      d={lineGenerator(line)}
      fill={"none"}
      stroke={"#eeeeee"}
      opacity={!highlight && highlightIDs.includes(line.id)
        ? dehighlightOpacity
        : 1}
      stroke-width={6}
    />
  {/each}
  {#each splitData as line}
    <path
      d={lineGenerator(line)}
      fill={"none"}
      stroke={"#eeeeee"}
      opacity={!highlight ? 1 : dehighlightOpacity}
      stroke-width={6}
    />
  {/each}
  {#each huizhouHierarchyData as year}
    <text x={x(year.year)} y={10} text-anchor="middle" font-size={10}
      >{year.year === 1978 || year.year === 1979
        ? year.year.toString().substring(2)
        : year.year}</text
    >
    {#each year.divisions as division}
      <circle
        cx={x(year.year)}
        cy={20 + division.y * vertSpace}
        r={6}
        fill={cols[division.data.data.status].fill}
        stroke={cols[division.data.data.status].stroke}
        stroke-width={1}
        opacity={highlightIDs.includes(division.data.data.divisionID)
          ? 1
          : highlight
          ? dehighlightOpacity
          : 1}
      />
      {#if year.year === 1978}
        <text
          x={x(year.year) - 12}
          y={20 + division.y * vertSpace + 4}
          font-size={11}
          text-anchor={"end"}
          fill={cols[division.data.data.status].stroke}
          opacity={highlightIDs.includes(division.data.data.divisionID)
            ? 1
            : highlight
            ? dehighlightOpacity
            : 1}>{division.data.data.name}</text
        >
      {/if}
      {#if year.year === 2003}
        <text
          x={x(year.year) + 8}
          y={20 + division.y * vertSpace + 4}
          font-size={11}
          fill={cols[division.data.data.status].stroke}
          opacity={highlightIDs.includes(division.data.data.divisionID)
            ? 1
            : highlight
            ? dehighlightOpacity
            : 1}>{division.data.data.name}</text
        >
      {/if}
      <!--text x={x(year.year)} y={20 + division.y * vertSpace}
        >{division.data.data.divisionID}</text-->
    {/each}
  {/each}
</svg>
