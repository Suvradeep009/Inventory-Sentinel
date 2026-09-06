import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import SentimentPage from './pages/SentimentPage';
import DemandPage from './pages/DemandPage';
import RagPage from './pages/RagPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/"         element={<HomePage />}     />
          <Route path="/sentiment"element={<SentimentPage />}/>
          <Route path="/demand"   element={<DemandPage />}   />
          {/* /insights is the primary route; /rag kept as alias */}
          <Route path="/insights" element={<RagPage />}      />
          <Route path="/rag"      element={<RagPage />}      />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
