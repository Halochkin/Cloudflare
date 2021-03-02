import React, {useState, useEffect} from "react";
import {Provider} from "./React-Redux";
import ReactDOM from 'react-dom';

function Hooks() {

  let [key, setKey] = useState("");
  let [someProperty, setSomeProperty] = useState("hello world");

  window.addEventListener("keypress", (e) => setKey(e.key))
  window.addEventListener("contextmenu", (e) => setSomeProperty("boo"))

  useEffect(() => {
    observeAllProperties({key, someProperty})
  });

  useEffect(() => {
    observeParticularProperty(someProperty)
  }, [someProperty]);


  function observeParticularProperty(newValue) {
    console.log("someValue has been changed to : " + newValue);
  }

  function observeAllProperties(newValue) {
    console.log("Either key or someValue has been changed to : " + JSON.stringify(newValue))
  }

  return (<div>Last pressed key is: {key}</div>)
}

ReactDOM.render(
  <Hooks/>,
  document.getElementById('root')
);