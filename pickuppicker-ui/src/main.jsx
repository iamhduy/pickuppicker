import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Note: Make sure the file names here exactly match your actual files (case-sensitive!)
import PickupPicker from './picker.jsx'
import Home from './home.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* The default home page */}
        <Route path="/" element={<Home />} />

        {/* The dynamic session page that loads your drag-and-drop board */}
        <Route path="/sessions/:sessionId" element={<PickupPicker />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)