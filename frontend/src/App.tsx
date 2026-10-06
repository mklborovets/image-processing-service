import { useState } from 'react';
import { ImageGallery } from './components/ImageGallery';
import { ImageUploader } from './components/ImageUploader';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem' }}>
        Image Processing Service
      </h1>
      <ImageUploader onUploadSuccess={handleUploadSuccess} />
      <ImageGallery key={refreshKey} />
    </div>
  );
}

export default App;
