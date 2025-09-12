import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import test data generator for development
if (process.env.NODE_ENV === 'development') {
  import('./utils/testDataGenerator').then(({ testDataGenerator }) => {
    (window as any).testData = testDataGenerator;
    console.log('🧪 Test data generator available at: window.testData');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
