import React, { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Loader2, Download, Video, ArrowRight } from "lucide-react";

interface ConverterProps {
  videoFile: File;
  onReset: () => void;
}

export const Converter: React.FC<ConverterProps> = ({ videoFile, onReset }) => {
  const [loaded, setLoaded] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [fps, setFps] = useState(10);
  const [scale, setScale] = useState(100);
  const [colors, setColors] = useState(64);
  const [loop, setLoop] = useState(true);

  const ffmpegRef = useRef(new FFmpeg());

  const load = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    const ffmpeg = ffmpegRef.current;

    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });
      setLoaded(true);
    } catch (e) {
      console.error("Erro ao carregar ffmpeg", e);
      alert("Erro ao inicializar o conversor. Verifique o console.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const convertToGif = async () => {
    setIsConverting(true);
    const ffmpeg = ffmpegRef.current;

    try {
      const name = videoFile.name.toLowerCase();
      let ext = ".mp4";
      if (name.endsWith(".webm")) ext = ".webm";
      else if (name.endsWith(".mov")) ext = ".mov";

      const inputName = `input${ext}`;

      // Escreve o arquivo na memória virtual do Wasm
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Executa o comando de conversão usando a escala percentual exata do Swift
      // Usamos trunc( ... / 2 ) * 2 para garantir que a resolução sempre seja um número par (exigência de muitos codecs e para evitar bugs)
      const filter = `fps=${fps},scale='trunc(iw*(${scale}/100)/2)*2':'trunc(ih*(${scale}/100)/2)*2':flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${colors}:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`;

      await ffmpeg.exec([
        "-i",
        inputName,
        "-filter_complex",
        filter,
        "-loop",
        loop ? "0" : "-1",
        "-c:v",
        "gif",
        "output.gif",
      ]);

      const data = await ffmpeg.readFile("output.gif");
      const url = URL.createObjectURL(
        new Blob([(data as Uint8Array).buffer as ArrayBuffer], {
          type: "image/gif",
        }),
      );
      setGifUrl(url);
    } catch (e) {
      console.error("Erro na conversão", e);
      alert("Falha ao converter o arquivo.");
    } finally {
      setIsConverting(false);
    }
  };

  if (!loaded) {
    return (
      <div
        className="flex-center"
        style={{ flexDirection: "column", gap: "1rem", padding: "2rem" }}
      >
        <Loader2
          className="dropzone-icon"
          style={{ animation: "spin 2s linear infinite" }}
        />
        <p>Inicializando processador de vídeo...</p>
      </div>
    );
  }

  return (
    <div className="converter-container">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <Video size={32} color="var(--accent-1)" />
        <span style={{ fontWeight: 600 }}>{videoFile.name}</span>
      </div>

      {!gifUrl ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              marginBottom: "1.5rem",
              width: "100%",
              maxWidth: "400px",
              background: "rgba(255,255,255,0.03)",
              padding: "1.5rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <h3
              style={{
                marginBottom: "1.5rem",
                fontSize: "1.1rem",
                color: "var(--text-primary)",
              }}
            >
              Configurações
            </h3>

            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
                >
                  FPS
                </span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {fps}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
                disabled={isConverting}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
                >
                  Escala
                </span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {scale}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-1)" }}
                disabled={isConverting}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
                >
                  Cores
                </span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {colors}
                </span>
              </div>
              <select
                value={colors}
                onChange={(e) => setColors(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "6px",
                  border: "1px solid var(--card-border)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                  outline: "none",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
                disabled={isConverting}
              >
                <option value={256} style={{ color: "black" }}>
                  256 (Máxima qualidade)
                </option>
                <option value={128} style={{ color: "black" }}>
                  128 (Equilíbrio)
                </option>
                <option value={64} style={{ color: "black" }}>
                  64 (Tamanho menor)
                </option>
                <option value={32} style={{ color: "black" }}>
                  32 (Menor tamanho)
                </option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "1rem",
                borderTop: "1px solid var(--card-border)",
              }}
            >
              <span
                style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
              >
                Loop Infinito
              </span>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  style={{
                    width: "20px",
                    height: "20px",
                    accentColor: "var(--accent-1)",
                    cursor: "pointer",
                  }}
                  disabled={isConverting}
                />
              </label>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={convertToGif}
            disabled={isConverting}
          >
            {isConverting ? (
              <>
                <Loader2 style={{ animation: "spin 2s linear infinite" }} />{" "}
                Convertendo...
              </>
            ) : (
              <>
                <ArrowRight /> Iniciar Conversão
              </>
            )}
          </button>

          {isConverting && (
            <p
              style={{
                textAlign: "center",
                marginTop: "1.5rem",
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
              }}
            >
              Processando vídeo, por favor aguarde...
            </p>
          )}
        </div>
      ) : (
        <div className="result-section">
          <h3 style={{ marginBottom: "1rem", color: "var(--accent-2)" }}>
            Pronto! 🎉
          </h3>
          <img src={gifUrl} alt="Converted GIF" className="result-image" />

          <div style={{ display: "flex", gap: "1rem" }}>
            <a
              href={gifUrl}
              download={`${videoFile.name.replace(".mp4", "")}.gif`}
              className="btn-primary"
              style={{ flex: 1, textDecoration: "none" }}
            >
              <Download size={20} /> Baixar GIF
            </a>
            <button
              className="btn-primary"
              onClick={onReset}
              style={{ flex: 1, background: "rgba(255,255,255,0.1)" }}
            >
              Novo Vídeo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
