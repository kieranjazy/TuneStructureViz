import React, { useEffect, useState } from 'react';
import D3Tree from './D3Tree';


const sampleData = [
    'aba1cabde',
    'abacaba1e',
    'abcdabce',
    'abcdab1ef',
    'aa1aa2aa3ba1'
]

const initialNodes = [
    {
        id: '1', 
        data: { label: 'a'},
        position: {x: 0, y: 0}, 
        type: 'input',
    }
]

const isNumber = (x: String): boolean => {
    if (x >= '0' && x <= '9') {
        return true;
    } else {
        return false;
    }
}

function NodeDashboard() {

    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState();

    const nodifyProcessedData = (processedData: string[][]) => {
        const xMultiplier = 120;
        const yMultiplier = 80;

        const newNodes = [];

        // Each input is expected to be 8 bars in length, so 8 logical segments
        // First segment will always be 'a'
        for (let i = 1; i != 8; i++) {
            const uniques: Set<string> = new Set();

            processedData.forEach((datum) => {
                uniques.add(datum[i]);
            })

            const uniquesArray: string[] = Array.from(uniques);

            // If odd uniques, one node will be on y-axis
            if (uniquesArray.length % 2 === 1) {
                for (let j = 0; j != uniques.size; j++) {
                    newNodes.push({
                        id: uniquesArray[j] + String(i),
                        data: { label: uniquesArray[j] },
                        position: {
                            x: i * xMultiplier,
                            y: (Math.floor(uniquesArray.length / 2) - j) * yMultiplier,
                        },
                        type: 'default'
                    })
                    
                }
            } else {
                for (let j = 0; j != uniques.size; j++) {
                    newNodes.push({
                        id: uniquesArray[j] + String(i),
                        data: { label: uniquesArray[j] },
                        position: {
                            x: i * xMultiplier,
                            y: (uniquesArray.length / 2) - j !== 0 ? ((uniquesArray.length / 2) - j) * (yMultiplier/1) : -j * (yMultiplier/1),
                        }, 
                        type: 'default',
                    })
                }
            }
        }

        setNodes(newNodes.concat(initialNodes));
    }

    const processDataAlt = (): string[][] => {
        let processedData: string[][] = [];

        sampleData.forEach((datum) => {
            let processedArray: string[] = [];
            let i = 0;

            while (i !== datum.length) {
                if (!isNumber(datum[i+1]) && datum[i+1] !== null) {
                    processedArray.push(datum.substring(0, i+1));
                    i++;
                } else {
                    processedArray.push(datum.substring(0, i+2));
                    i += 2;
                }
            }
            console.log(processedArray)
            processedData.push(processedArray);
        })

        return processedData;
    }

    const processData = (): string[][] => {
        let processedData: string[][] = [];

        sampleData.forEach((datum) => {
            let processedArray: string[] = [];
            let i = 0;

            while (i !== datum.length) {
                if (datum[i+1] === null || !isNumber(datum[i+1])) {
                    processedArray.push(datum[i]);
                    i++;
                } else {
                    processedArray.push(datum.substring(i, i+2));
                    i += 2;
                }
            }

            processedData.push(processedArray);
        })

        return processedData;
    }

    useEffect(() => {
        //nodifyProcessedData(processDataAlt());
    }, [])

    return (
        <D3Tree/>
    )
}

export default NodeDashboard;