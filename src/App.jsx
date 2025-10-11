import { useState, useEffect  } from 'react'
import './App.css'
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router, Route, Switch  } from "react-router-dom";
import LeeABV from "./Component/LeeABV/LeeABV";
import FormABVIA2 from "./Component/FormABV1/FormABVIA2"

function App() {

  
  return (
    <div className="container">
    <Router>
     <Switch>
        <Route exact path="/">
          <FormABVIA2 />
        </Route>
        <Route exact path="/FormABVIA2">
          <FormABVIA2 />
        </Route>
        <Route exact path="/datastorage">
          <LeeABV />
        </Route>
     </Switch>
     </Router>
    </div>
  )
}

export default App
