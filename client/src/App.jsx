import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/register";

function Home() {
  return (
    <div>
      <h1>NexTo</h1>
      <p>Welcome to NexTo Marketplace</p>

      <Link to="/login">Login</Link>
      {" | "}
      <Link to="/register">Register</Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;