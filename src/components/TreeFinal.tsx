//@ts-nocheck

import * as d3 from "d3";
import React, { useEffect, useState, useRef } from 'react';
import CsvDialog from "./CsvDialog";
import TuneModal from "./TuneModal";

const width = 2100;
const dx = 14, dy = width / 9;
const margin = { top: 10, right: 120, bottom: 10, left: 20 };
const tree = d3.tree().nodeSize([dx, dy]);
const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

function structureStringToStringArray(structureString: string, nStrings: number) {
    return Array.from(String(structureString).split(',')).slice(0, nStrings);
}

function joinStringArray(stringArray: string[]): string {
    return Array.from(stringArray).join();
}

// Compares two arrays, one larger and one smaller. Iterate through the smaller array and return false if
// any element does not equal the element at the same index in the larger array
function compareTwoArrays(largerArray: string[], smallerArray: string[]): boolean {
    let i = 0;
    for (i = 0; i != smallerArray.length; i++) {
        if (smallerArray[i] !== largerArray[i]) {
            return false;
        }
    }
    return true;
}

export default function TreeFinal() {
    const svgRef = useRef(null);
    const divRef = useRef(null);
    const infoRef = useRef(null);

    let searchElement = [];
    let root;
    let i = 0;
    let sessionMapping;
    let nameToIdMapping;

    const [info, setInfo] = useState({ 'parts': '', 'classifications': [""], 'count': 0 });
    const [showDialog, setShowDialog] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState(-1);
    const [selectedTuneTitle, setSelectedTuneTitle] = useState("");
    const [selectedTuneStructure, setSelectedTuneStructure] = useState([]);

    document.body.style.backgroundColor = 'antiquewhite';

    const drawGraph = async (processedCsv, nameToIdJson) => {
        sessionMapping = await fetch('/assets/sessionMapping.json', {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        sessionMapping = await sessionMapping.json();
        nameToIdMapping = await JSON.parse(nameToIdJson);

        const nodes = await JSON.parse(processedCsv);
        const info = nodes.splice(nodes.length - 1);
        setInfo(info[0]); // Get info element

        const data = await processData(nodes);
        makeChart(data, 9);
    }

    const processData = async (nodes): {} => {
        const finalNodes: { "name": string, "children": {}[] } = { // Initial node doesn't have to hold for B, C, D, ...
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

    function makeChart(data, level) {
        root = d3.hierarchy(data);

        root.x0 = dy / 2;
        root.y0 = 0;
        root.descendants().forEach((d, i) => {
            d.id = i;
            d._children = d.children;
            if (d.depth >= level) d.children = null;
        });

        const svg = d3.select(svgRef.current)
            .attr("viewBox", [-margin.left, -margin.top, width, dx])
            .style("font", "14px sans-serif")
            .style("user-select", "none");

        svg.selectAll("*").remove();

        // Sort structures in logical order
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

        const gLink = svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5);

        const gNode = svg.append("g")
            .attr("cursor", "pointer")
            .attr("pointer-events", "all")

        const update = (source) => {
            const duration = 100 * (9 - source.depth);
            const nodes = root.descendants().reverse();
            const links = root.links();

            tree(root);

            let left = root;
            let right = root;
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
                .data(nodes, d => d.id);

            const nodeEnter = node.enter().append("g")
                .attr("class", function (d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
                .attr("transform", d => `translate(${source.y0},${source.x0})`)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0)
                .on("click", (event, d) => {
                    if (d.depth !== 8) {
                        if (d.children) {
                            d._children = d.children;
                            d.children = null;
                        } else {
                            d.children = d._children;
                        }

                        update(d);
                    } else {
                        setSelectedSessionId(sessionMapping[nameToIdMapping[d.data.name]]);
                        setSelectedTuneTitle(d.data.name)
                        setSelectedTuneStructure(d.parent.data.name.split(','));
                    }
                });

            nodeEnter.append("circle")
                .attr("r", 2.5)
                .attr("fill", d => d._children ? "#555" : "#999")
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
                .attr("stroke-opacity", 1);

            const nodeExit = node.exit().transition(transition).remove()
                .attr("transform", d => `translate(${source.y},${source.x})`)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0);

            const link = gLink.selectAll("path")
                .data(links, d => d.target.id);

            const linkEnter = link.enter().append("path")
                .attr("d", d => {
                    const o = { x: source.x0, y: source.y0 };
                    return diagonal({ source: o, target: o });
                });

            link.merge(linkEnter).transition(transition)
                .attr("d", diagonal);

            link.exit().transition(transition).remove()
                .attr("d", d => {
                    const o = { x: source.x, y: source.y };
                    return diagonal({ source: o, target: o });
                });

            root.eachBefore(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // Set expandAll and contractAll handler here
        document.getElementById('expand').onclick = () => {
            const descendants = root.descendants();
            const maxDepth = descendants[0].height;

            root.descendants().forEach((d, i) => {
                if (d.depth != maxDepth) {
                    if (!d.children && d._children) {
                        d.children = d._children;
                    }
                }
            });

            update(root.descendants()[0]);
        }

        document.getElementById('contract').onclick = () => {
            root.descendants().forEach((d, i) => {
                if (d.depth > 0) {
                    let pred = true;
                    d.parent.children && d.parent.children.forEach((c) => {
                        if (c.children) pred = false;
                    });

                    if (!d.children && d.parent.depth !== 0 && pred) {
                        if (d.parent.children != null) {
                            d.parent._children = d.parent.children
                            d.parent.children = null;
                        }
                    }
                }
            });

            update(root.descendants()[0]);
        }

        document.getElementById('search').onkeyup = (e) => {
            if (e.key === 'Enter') {
                if (searchElement.length) {
                    const boundingRect = searchElement[i].getBoundingClientRect();
                    window.scrollTo(0, boundingRect.top + window.scrollY - 500);

                    i = (i + 2) % searchElement.length;
                }
            }
        }

        document.getElementById('search').oninput = (e) => {
            if (e.target.value.length === 0) {
                if (searchElement.length) {
                    searchElement.forEach((e) => {
                        e.style.fontWeight = '';
                        e.style.fontSize = '';
                    })

                    searchElement = [];
                    i = 0;

                }
                console.log('!')

                const resultsElement = document.getElementById('results');
                resultsElement.innerHTML = "";
                resultsElement.style.display = "contents";
                return;
            }

            if (searchElement.length) {
                searchElement.forEach((e) => {
                    e.style.fontWeight = '';
                    e.style.fontSize = '';
                })

                searchElement = [];
                i = 0;
            }

            if (e.target.value.length >= 4 && !e.target.value.includes(',')) {
                document.querySelectorAll('.node--leaf').forEach((query) => {
                    for (let child of query.children) {
                        if (child.innerHTML.includes(e.target.value)) {
                            query.style.fontWeight = 'bold'
                            query.style.fontSize = 'medium'
                            searchElement = [...searchElement, query];
                            continue;
                        }
                    }
                })
            }

            if (e.target.value.endsWith(',')) {
                const resultSet = new Set();
                const resultLength = e.target.value.split(',').length;

                root.descendants().forEach((d, i) => {
                    if (d.data.name.split(',').length === resultLength) {
                        if (d.data.name.startsWith(e.target.value)) {
                            resultSet.add(d.data.name);
                        }
                    }
                })

                const resultsElement = document.getElementById('results');
                resultsElement.style.display = "block";
                for (const result of resultSet) {
                    resultsElement.innerHTML += "<div>" + result + "</div>";
                }
            } else {
                const resultsElement = document.getElementById('results');
                resultsElement.innerHTML = "";
                resultsElement.style.display = "contents";

                document.querySelectorAll("text").forEach((query) => {
                    if (query.textContent.toLowerCase().replace(/\s+/g, '') === e.target.value.toLowerCase().replace(/\s+/g, '')) {
                        const boundingRect = query.getBoundingClientRect();
                        window.scrollTo(0, boundingRect.top + window.scrollY - 500);

                        query.style.fontWeight = 'bold'
                        query.style.fontSize = 'large'

                        searchElement = [...searchElement, query];
                    }
                })
            }
        }

        update(root);
    }

    useEffect(() => {
        if (infoRef.current) {
            if (info.parts === "") return;
            infoRef.current.innerHTML = "Part: " + info.parts + " | Classifications: " + info.classifications.join(", ") + " | Tune Count: " + info.count;
        }
    }, [info])

    return (
        <>
            <div id='control-bar' style={{ position: "sticky", top: 0 }}>
                <div ref={divRef} style={{
                    zIndex: 3000,
                    top: "2px",
                    left: "2px",
                    backgroundColor: "white",
                    borderStyle: "groove",
                    display: "flex"
                }}>
                    <button id='expand'>
                        Expand Level
                    </button>

                    <button id='contract'>
                        Collapse Level
                    </button>

                    <div style={{ display: 'flex' }}>
                        <input type="text" id="search" placeholder="Search for structures or tunes" autoComplete="off"/>
                        <ul id="results" style={{
                            display: 'contents',
                            backgroundColor: 'white',
                            borderStyle: 'groove',
                            position: 'absolute',
                            top: '33px',
                            paddingRight: '16px',
                            paddingLeft: '0px'
                        }}></ul>
                    </div>

                    <button onClick={() => {
                        setShowDialog(true);
                    }}>
                        Prepare Graph..
                    </button>
                    <div ref={infoRef} style={{ marginTop: '3px' }} />
                </div>
            </div>

            {showDialog && (
                <CsvDialog drawGraph={drawGraph} setShowDialog={setShowDialog} />
            )}

            <svg ref={svgRef} style={{
                backgroundColor: 'antiquewhite',
                zIndex: "-1",
            }}>
            </svg>

            {selectedSessionId >= 0 && (
                <TuneModal sessionId={selectedSessionId}
                    setSelectedSessionId={setSelectedSessionId}
                    tuneTitle={selectedTuneTitle}
                    setSelectedTuneTitle={setSelectedTuneTitle}
                    structure={selectedTuneStructure}
                />
            )}
        </>
    );
}

