import React from 'react';
import { loadPyodide } from "pyodide";

async function processCsv(idToStructureCsv: File, idToNameCsv: File, parts: string, classifications: string) {
    const idToStructureURL = await idToStructureCsv.text();
    const idToNameURL = await idToNameCsv.text();
    const pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.22.1/full/' });
    const script = `
import csv
import re
import json
import io

def process_chunk(c):
    res = []
    i = 0
    while i < len(c):
        end = i+1
        if c[i].isupper():
            end = end+1
        if end < len(c) and c[end].isdigit():
            end = end+1
        res.append(c[i:end])
        i = end
    return res

def process_row(row):
    s = row[3]
    s = re.split("\\.|,|;| ", s)
    s = [si for si in s if len(si)]
    s = sum([process_chunk(si) for si in s], start=[])
    return s

classificationsDict = {
    'DOUBLEJIG': 'Double Jig',
    'SINGLEJIG': 'Single Jig',
    'HOPSLIPJIG': 'Hop or Slip Jig',
    'REEL': 'Reel',
    'HORNPIPE': 'Hornpipe Etc.',
    'DANCE': 'Long Dance, Set Dance, Etc.',
    'MISC': 'Miscellaneous',
    'ALL': 'All'
}

dictList = []
idToStructureCsv = csv.reader(io.StringIO(structure_csv, newline=''), delimiter=',', quotechar='"')
idToNameCsv = csv.reader(io.StringIO(name_csv, newline=''), delimiter=',', quotechar='"')

parts = "${parts}"
classifications = "${classifications}"
classifications = classifications.split()
for i in range(0, len(classifications)):
  if bool(classificationsDict.get(classifications[i])) == False:
    output = "Error"
    quit()
  classifications[i] = classificationsDict[classifications[i]]
counter = 0
for row in idToStructureCsv:
  processedRow = process_row(row)
  rowlast = len(processedRow)
  if row[2] in list(parts) and len(processedRow) == 8:
    if row[0] in classifications or classifications[0] == 'All':
      tempDict = {'name': row[1], 'structure': processedRow}
      dictList.append(tempDict)
      counter = counter + 1

for row in idToNameCsv:
    for dict in dictList:
      if dict['name'] == row[1]:
        dict['name'] = row[3]
dictList.append({'parts': parts, 'classifications': classifications, 'count': counter})
output = json.dumps(dictList)
        `;

    pyodide.globals.set('structure_csv', idToStructureURL)
    pyodide.globals.set('name_csv', idToNameURL)
    await pyodide.runPythonAsync(script);
    const json_output = pyodide.globals.get('output');
    return json_output;
}

export default function CsvDialog({ drawGraph, setShowDialog }) {
    let idToStructureFile, idToNameFile;
    let parts, classifications;

    return (
        <>
            <div style={{ width: '100%', height: '100%', position: 'fixed', zIndex: '2', backgroundColor: 'antiquewhite' }}>
                <div style={{ display: 'grid' }}>
                    <input type="text" id="parts" placeholder="Parts, e.g. A, AB, CDE" onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                        parts = e.target.value;
                    }} />

                    <input type="text" id="classifications" placeholder="Classifications: ALL, SINGLEJIG, DOUBLEJIG, HOPSLIPJIG, REEL, HORNPIPE, DANCE, MISC   E.g: MISC DANCE REEL gives all three classes" onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                        classifications = e.target.value;
                    }} />


                    <label htmlFor='idToStructure' style={{ justifySelf: 'left' }}>CSV mapping tune IDs to their structures</label>
                    <input type='file' id='idToStructure' accept=".csv" onChange={async (e) => {
                        idToStructureFile = e.target.files[0];
                    }} />

                    <label htmlFor='idToName' style={{ justifySelf: 'left' }}>CSV mapping tune IDs to their names</label>
                    <input type='file' id='idToName' accept=".csv" onChange={async (e) => {
                        idToNameFile = e.target.files[0];
                    }} />

                    <button onClick={async () => {
                        const result = await processCsv(idToStructureFile, idToNameFile, parts, classifications);
                        console.log(result)
                        drawGraph(result);
                        setShowDialog(false);
                    }}>
                        Create Graph
                    </button>
                </div>
            </div>
        </>
    );
}