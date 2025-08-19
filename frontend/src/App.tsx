import React from "react";
import "./styles/global.css";
import Header from "./components/Header/Header";
import NavBar from "./components/NavBar/NavBar";

function App() {
  return (
    <>
      <Header />
      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <p>Welcome to the Commander tournament tracker!</p>
      </div>
      <div className="nav-bar-mobile">
        <NavBar />
      </div>
    </>
  );
}

export default App;
