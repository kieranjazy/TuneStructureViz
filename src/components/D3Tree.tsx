//@ts-nocheck

import * as d3 from "d3";
import React, { useEffect, useState, useRef } from 'react';

const dimensions = {
  width: 6000,
  height: 18000,
  margin: { top: 20, right: 10, bottom: -40, left: 10 }
};

function structureStringToStringArray(structureString: string, nStrings: number) {
  return Array.from(String(structureString).split(',')).slice(0, nStrings);
}

function joinStringArray(stringArray: string[]): string {
  return Array.from(stringArray).join();
}

function compareTwoArrays(largerArray: string[], smallerArray: string[]): boolean {
  let i = 0;
  for (i = 0; i != smallerArray.length; i++) {
    if (smallerArray[i] !== largerArray[i]) {
      return false;
    }
  }
  return true;
}

function D3Tree() {
  const svgRef = useRef(null);
  const { width, height, margin } = dimensions;
  const svgWidth = width + margin.left + margin.right;
  const svgHeight = height + margin.top + margin.bottom;

  const processData = async (dataURI: string): Promise<{}> => {
    const response = await fetch(window.location.href + dataURI);
    const nodes = await response.json();

    const finalNodes: { "name": string, "children": {}[] } = {
      "name": "a",
      "children": []
    };

    // 9th level is individual tunes, 8th and before is structure labels
    for (let i = 8; i !== 1; i--) {
      const nodeLevel: {}[] = [];
      const fullStructures: { [key: string]: string[] } = {};

      if (i === 8) {
        nodes.forEach((node: { structure: string, name: string }) => {
          if (node.structure in fullStructures) {
            fullStructures[node.structure].push(node.name);
          } else {
            fullStructures[node.structure] = [node.name];
          }
        })

        Object.keys(fullStructures).forEach((key) => {
          const newNode: { "name": string, "children": { "name": string }[] } = {
            "name": key,
            "children": []
          };

          Object.values(fullStructures[key]).forEach((k) => {
            // Set leaf values
            newNode["children"].push({
              "name": k
            })
          })

          nodeLevel.push(newNode);
        })

        finalNodes.children = nodeLevel;
      } else {
        nodes.forEach((node: { structure: string, name: string }) => {
          let concatStructure = joinStringArray(structureStringToStringArray(node.structure, i));
          if (concatStructure in fullStructures) {
            fullStructures[concatStructure].push(node.name);
          } else {
            fullStructures[concatStructure] = [node.name];
          }
        })

        Object.keys(fullStructures).forEach((key) => {
          const newNode: { "name": string, "children": { "name": string }[] } = {
            "name": key,
            "children": []
          };

          let i = 0;
          for (i = 0; i != finalNodes.children.length; i++) {
            const pred = compareTwoArrays(structureStringToStringArray(finalNodes.children[i].name, finalNodes.children[i].name.length), structureStringToStringArray(key, key.length));
            const pred2 = structureStringToStringArray(finalNodes.children[i].name, finalNodes.children[i].name.length).length > structureStringToStringArray(newNode.name, newNode.name.length).length;
            // Length of every child structureStringToStringArray must be larger than parent length

            if (pred && pred2) {
              newNode["children"].push(finalNodes.children[i]);
            }
          }

          nodeLevel.push(newNode);
        })

        finalNodes.children = nodeLevel;
      }
    }

    return finalNodes;
  }

  const updateTree = (source, root, tree, svg, gNode, treeLink, gLink) => {
    const duration = 250;
    const nodes = root.descendants().reverse();
    const links = root.links();

    tree(root);

    let left = root, right = root;
    root.eachBefore(node => {
      if (node.x < left.x) left = node;
      if (node.x > right.x) right = node;
    });

    const height = right.x - left.x + margin.top + margin.bottom;

    const transition = svg.transition()
      .duration(duration)
      .attr("viewBox", [-margin.left, left.x - margin.top, width, height])
      .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

    const node = gNode.selectAll("g")
      .data(nodes);

    const nodeEnter = node.enter().append("g")
      .attr("transform", d => `translate(${source.y0},${source.x0})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event, d) => {
        d.children = d.children ? null : d._children;
        update(d, root, tree, svg, gNode);
      });

    nodeEnter.append("circle")
      .attr("r", 2.5)
      .attr("fill", d => d._children ? "#555" : '#999')
      .attr("stroke-width", 10);

    nodeEnter.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d._children ? -6 : 6)
      .attr("text-anchor", d => d._children ? "end" : "start")
      .text(d => d.data.name)
    .clone(true).lower()
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "white");

    const nodeUpdate = node.merge(nodeEnter).transition(transition)
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1)

    const nodeExit = node.exit().transition(transition).remove()
      .attr("transform", d => `translate(${source.y},${source.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)

    const link = gLink.selectAll("path")
      .data(links, d => d.target.id);

    const linkEnter = link.enter().append("path")
      .attr("d", d => {
        const o = {x: source.x0, y: source.y0};
        return treeLink({source: o, target: o});
      });

    root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  useEffect(() => {
    const svgElement = d3.select(svgRef.current).attr("viewBox", [-margin.left, -margin.top, 1024, 10]);
    const width = +svgElement.attr("width");
    const height = +svgElement.attr("height");
    const g = svgElement.append("g").attr("transform", "translate(50,15)");
    const tree = d3.tree().nodeSize([20, 60]);

    const treeLink = d3.linkHorizontal().x(d => d.y).y(d => d.x);

    function handleZoom(e) {
      d3.select("svg g")
        .attr('transform', e.transform);
    }

    const zoom = d3.zoom()
      .scaleExtent([.5, 10])
      .on('zoom', handleZoom);
      
    svgElement.call(zoom);

    const data = processData("assets/data.json").then((data) => {
      let root = d3.hierarchy(data);

      root.descendants().forEach((d, i) => {

        //d._children = d.children;
        if (d.depth >= 2) {
          d.children = null;
        }
      })

      root.sort((a: any, b: any) => {
        if (!/^\d+$/.test(a.data.name) && !/^\d+$/.test(b.data.name)) {
          const aArray: String[] = structureStringToStringArray(a.data.name, a.data.name.length);
          const bArray: String[] = structureStringToStringArray(b.data.name, b.data.name.length);

          if (aArray.length > bArray.length || bArray.length > aArray.length) return 0;

          for (let i = 0; (i !== aArray.length || i !== bArray.length); i++) {
            if (aArray[i] == bArray[i]) {
              continue;
            }

            if (aArray[i].charAt(0) === bArray[i].charAt(0)) {
              if (isNaN(Number(bArray[i].charAt(1)))) {
                bArray[i] = bArray[i].charAt(0) + '0';
              }

              if (Number(aArray[i].charAt(1)) > Number(bArray[i].charAt(1))) {
                return 1;
              } else {
                return -1;
              }
            }

            if (aArray[i].charAt(0) > bArray[i].charAt(0)) {
              return 1;
            } else {
              return -1;
            }
          }
        }

        return 0;
      })

      const link = g.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(tree(root).links())
        .join("path")
        .attr("stroke", true)
        .attr("stroke-opacity", 1)
        .attr("d", treeLink);

      const gNode = svgElement.attr("cursor", "pointer")
        .attr("pointer-events", "all");

      let node = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", function (d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
        .attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; });

      node.append("circle")
        .attr("r", 5)

      node.append("text")
        .attr("dy", function (d) { return d.children ? -15 : 2; })
        .attr("dx", function (d) { return isNaN(d.data.name) ? 20 : 10; })
        .attr("x", function (d) { return d.children ? -8 : 8; })
        .style("text-anchor", function (d) { return d.children ? "end" : "start"; })
        .text(function (d) { return d.data.name; });

      svgElement.selectAll('text').on('click', data => {
        console.log(data.srcElement.__data__._children);

        data.srcElement.__data__.children = data.srcElement.__data__._children;
      })

      //updateTree(root.copy(), root, tree, svgElement, gNode, treeLink, link);

    });
  }, []);

  return (
    <div id='svgContainer' style={{backgroundColor: 'antiquewhite'}}>
      <svg ref={svgRef} height={768} width={1024} style={{margin: 'auto', display: 'block', borderStyle: 'double', borderWidth: '5px'}}></svg>
    </div>
  )
}

export default D3Tree;