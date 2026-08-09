import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Loader2, Download, Video, ArrowRight } from 'lucide-react';

interface ConverterProps {
  videoFile: File;
  onReset: () => void;
}

export const Converter: React.FC<ConverterProps> = ({ videoFile, onReset }) => {
  const [loaded, setLoaded] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  
  const ffmpegRef = useRef(new FFmpeg());


  const load = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpeg = ffmpegRef.current;
    
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(progress * 100);
    });

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setLoaded(true);
    } catch (e) {
      console.error('Erro ao carregar ffmpeg', e);
      alert('Erro ao inicializar o conversor. Verifique o console.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const convertToGif = async () => {
    setIsConverting(true);
    setProgress(0);
    const ffmpeg = ffmpegRef.current;

    try {
      const name = videoFile.name.toLowerCase();
      let ext = '.mp4';
      if (name.endsWith('.webm')) ext = '.webm';
      else if (name.endsWith('.mov')) ext = '.mov';
      
      const inputName = `input${ext}`;

      // Escreve o arquivo na memória virtual do Wasm
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      
      // Executa o comando de conversão
      // -t 10 (limita a 10s caso seja muito grande)
      // -vf "fps=10,scale=320:-1:flags=lanczos" (reduz o tamanho para não travar o browser)
      await ffmpeg.exec([
        '-i', inputName,
        '-vf', 'fps=10,scale=480:-1:flags=lanczos',
        '-c:v', 'gif',
        'output.gif'
      ]);

      const data = await ffmpeg.readFile('output.gif');
      const url = URL.createObjectURL(
        new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: 'image/gif' })
      );
      setGifUrl(url);
    } catch (e) {
      console.error('Erro na conversão', e);
      alert('Falha ao converter o arquivo.');
    } finally {
      setIsConverting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <Loader2 className="dropzone-icon" style={{ animation: 'spin 2s linear infinite' }} />
        <p>Inicializando processador de vídeo...</p>
      </div>
    );
  }

  return (
    <div className="converter-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Video size={32} color="var(--accent-1)" />
        <span style={{ fontWeight: 600 }}>{videoFile.name}</span>
      </div>

      {!gifUrl ? (
        <>
          <button 
            className="btn-primary" 
            onClick={convertToGif} 
            disabled={isConverting}
          >
            {isConverting ? (
              <><Loader2 style={{ animation: 'spin 2s linear infinite' }} /> Convertendo...</>
            ) : (
              <><ArrowRight /> Iniciar Conversão</>
            )}
          </button>

          {isConverting && (
            <div>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
              <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="result-section">
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent-2)' }}>Pronto! 🎉</h3>
          <img src={gifUrl} alt="Converted GIF" className="result-image" />
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <a 
              href={gifUrl} 
              download={`${videoFile.name.replace('.mp4', '')}.gif`}
              className="btn-primary"
              style={{ flex: 1, textDecoration: 'none' }}
            >
              <Download size={20} /> Baixar GIF
            </a>
            <button 
              className="btn-primary" 
              onClick={onReset}
              style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}
            >
              Novo Vídeo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
