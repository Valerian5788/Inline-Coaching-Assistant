import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const DrawPlay: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/live')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Live Tracking</span>
        </button>
        <h1 className="text-2xl font-bold">Draw Play</h1>
        <div></div>
      </div>
      
      <div className="text-center mt-20">
        <h2 className="text-xl font-semibold mb-4">Tactical Board</h2>
        <p className="text-gray-600">Drawing and play design interface - Coming soon</p>
      </div>
    </div>
  );
};

export default DrawPlay;