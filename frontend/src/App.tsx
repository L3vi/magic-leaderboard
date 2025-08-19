import React from "react";
import "./styles/global.css";
import Header from "./components/Header/Header";

function App() {
  return (
    <>
      <Header />
      <div style={{ textAlign: "center", marginTop: "1rem" }}>
        <p>Welcome to the Commander tournament tracker!</p>
      </div>
    </>
  );
}

export default App;
