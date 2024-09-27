import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./components/SignUp";
import Login from "./components/Login";
import TodoList from "./components/ToDoList";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/todolist" element={<TodoList />} />
      </Routes>
    </Router>
  );
};

export default App;