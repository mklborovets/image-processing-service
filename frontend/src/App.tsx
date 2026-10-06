import React from 'react';
import { ImageGallery } from './components/ImageGallery';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem' }}>
        Antigravity Image Service
      </h1>
      <ImageGallery />
    </div>
  );
}

export default App;
