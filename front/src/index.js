import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import Payment from "./Home/Payment";
import CanclePay from "./Home/Canclepay";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Payment />
    <CanclePay />
  </React.StrictMode>
);
reportWebVitals();
