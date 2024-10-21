import { BrowserRouter, Route, Routes } from "react-router-dom";
import Signup from "./components/Signup";
import Signin from "./components/Signin";
import Landing from "./components/Landing";


export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing/>}/>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
        </Routes>
      </BrowserRouter>
  );
}