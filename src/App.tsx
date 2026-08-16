import { useState, useEffect } from "react";
import { bind } from "cuelume";
import { Dropzone } from "./components/Dropzone";
import { Converter } from "./components/Converter";
import { GithubIcon } from "./components/GithubIcon";

function App() {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    bind();
  }, []);

  useEffect(() => {
    const rootEl = document.getElementById("root");
    if (rootEl) {
      if (file) {
        rootEl.style.maxWidth = "1200px";
        rootEl.style.transition = "max-width 0.3s ease";
      } else {
        rootEl.style.maxWidth = "800px";
      }
    }
  }, [file]);

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
          data-cuelume-hover="tick"
        >
          <GithubIcon size={18} />
          Código Aberto no GitHub
        </a>
      </footer>
    </>
  );
}

export default App;
