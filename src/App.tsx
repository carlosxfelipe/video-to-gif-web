import { useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { Converter } from './components/Converter';

function App() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <div className="glass-card">
        <h1>Video2Gif</h1>
        <p className="subtitle">Converta seus vídeos MP4 para GIF direto no navegador, com total privacidade e velocidade.</p>
        
        {!file ? (
          <Dropzone onFileSelect={setFile} />
        ) : (
          <Converter videoFile={file} onReset={() => setFile(null)} />
        )}
      </div>

      <footer style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Desenvolvido por <a href="https://github.com/carlosxfelipe" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-1)', textDecoration: 'none', fontWeight: 500 }}>Carlos Felipe Araújo</a>
      </footer>
    </>
  );
}

export default App;
