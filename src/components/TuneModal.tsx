import React, { useEffect, useState } from "react";
import { renderAbc } from "abcjs";
import * as ABCJS from "abcjs";

export default function TuneModal({ sessionId, tuneTitle, setSelectedSessionId, setSelectedTuneTitle, structure }) {
    let visualObject;
    let synth = new ABCJS.synth.CreateSynth();
    let pageJson;

    useEffect(() => {
        const url = "https://thesession.org/tunes/" + sessionId + "?format=json";
        const fetchData = async () => {
            pageJson = await fetch(url);
            pageJson = await pageJson.json();
            const abc = pageJson.settings[0].abc;

            const list = abc.split('|');
            let longestEntry = 0;

            list.forEach((string) => {
                string = string.replace(/"([^"]*)"/g, "");
                if (string.length > longestEntry) {
                    longestEntry = string.length;
                }
            })

            let i;
            for (i = list.length - 1; i >= 0; i--) {
                if (list[i].length < longestEntry / 2) {
                    list.splice(i, 1);
                }
            }

            if (list.slice(0, 8).length < 8) {
                setSelectedTuneTitle("thesession.org data is invalid")
                renderAbc("main", "")
            } else {
                for (let i = 0; i != 8; i++) {
                    list[i] = "\"" + structure[i] + "\"" + list[i];
                }

                const abcString = "K: " + pageJson.settings[0].key + "\n" + list.slice(0, 8).join("|").replaceAll(":", "")
                .replaceAll("!", "")
                .replaceAll("|1 ", "|")
                .replaceAll("|2 ", "|")

                const tunes = renderAbc("main", abcString);
                visualObject = tunes[0];
            }
        }

        fetchData();
    }, [sessionId]);


    return (
        <div style={{
            position: 'fixed',
            left: '25%',
            top: '25%',
            background: 'burlywood',
            width: 'fit-content',
            zIndex: 2,
            borderStyle: 'double'
        }}>
            <h2>{tuneTitle}</h2>
            <a href={"https://thesession.org/tunes/" + sessionId}>{"https://thesession.org/tunes/" + sessionId}</a>
            <div id="main"></div>
            <button id="play" onClick={() => {
                let myContext = new AudioContext();
                synth.init({
                    audioContext: myContext,
                    visualObj: visualObject,
                    millisecondsPerMeasure: 2000,
                    options: {
                        pan: [-0.3, 0.3],
                        soundFontVolumeMultiplier: 0.45
                    }
                }).then(function (results) {
                    synth.prime().then((res) => {
                        synth.start();
                    })
                }).catch(function (reason) {
                    console.log(reason)
                });
            }}>Play
            </button>
            <button id='close' onClick={() => {
                setSelectedSessionId(-1);
                setSelectedTuneTitle("");
            }}>Close</button>
        </div>
    );
}