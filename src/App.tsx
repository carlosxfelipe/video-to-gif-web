import { useState } from "react";
import { Dropzone } from "./components/Dropzone";
import { Converter } from "./components/Converter";
import { GithubIcon } from "./components/GithubIcon";

function App() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <div className="glass-card">
        <h1>Video2Gif</h1>
        <p className="subtitle">
          Converta seus vídeos para GIF direto no navegador, com total
          privacidade e velocidade.
        </p>

        {!file ? (
          <Dropzone onFileSelect={setFile} />
        ) : (
          <Converter videoFile={file} onReset={() => setFile(null)} />
        )}
      </div>

      <footer
        style={{
          marginTop: "3rem",
          textAlign: "center",
          color: "var(--text-secondary)",
          fontSize: "0.95rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <a
          href="https://github.com/carlosxfelipe/video-to-gif-web"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
        >
          <GithubIcon size={18} />
          Código Aberto no GitHub
        </a>
      </footer>
    </>
  );
}

export default App;
