import React, { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { ThinkingOrb } from "thinking-orbs";
import { Download, Video, ArrowRight, AlertTriangle } from "lucide-react";
import {
  getEstimate,
  isAv1WebM,
  extractFramesWithBrowser,
} from "../utils/videoUtils";
import { play } from "cuelume";

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
  const [videoMeta, setVideoMeta] = useState<{
    width: number;
    height: number;
    duration: number;
  } | null>(null);

  const ffmpegRef = useRef(new FFmpeg());

  // Carrega dimensões e duração do vídeo para estimar o tamanho do GIF
  useEffect(() => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(videoFile);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      setVideoMeta({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: isFinite(video.duration) ? video.duration : 0,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      setVideoMeta(null);
      URL.revokeObjectURL(url);
    };
    video.src = url;
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const estimate = getEstimate(videoMeta, scale, fps, colors);

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

      // Remove output.gif se existir de uma conversão anterior para evitar ler lixo
      try {
        await ffmpeg.deleteFile("output.gif");
      } catch (e) {}

      let ret: number;

      if (ext === ".webm" && (await isAv1WebM(videoFile))) {
        // Caminho AV1: o core do ffmpeg.wasm não tem decoder AV1,
        // então decodificamos com o navegador e montamos o GIF a partir dos frames PNG
        const frameCount = await extractFramesWithBrowser(
          ffmpeg,
          videoFile,
          fps,
        );
        if (frameCount === 0) {
          throw new Error("Nenhum frame foi extraído do vídeo AV1.");
        }

        // Os frames já estão no FPS desejado, então o filtro não precisa de fps=
        const av1Filter = `scale='trunc(iw*(${scale}/100)/2)*2':'trunc(ih*(${scale}/100)/2)*2':flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${colors}:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;

        ret = await ffmpeg.exec([
          "-framerate",
          `${fps}`,
          "-i",
          "frame%04d.png",
          "-filter_complex",
          av1Filter,
          "-loop",
          loop ? "0" : "-1",
          "-c:v",
          "gif",
          "output.gif",
        ]);

        for (let i = 0; i < frameCount; i++) {
          try {
            await ffmpeg.deleteFile(`frame${String(i).padStart(4, "0")}.png`);
          } catch (e) {}
        }
      } else {
        // Escreve o arquivo na memória virtual do Wasm
        await ffmpeg.writeFile(
          inputName,
          new Uint8Array(await videoFile.arrayBuffer()),
        );

        // Executa o comando de conversão usando a escala percentual exata do Swift
        // Usamos trunc( ... / 2 ) * 2 para garantir que a resolução sempre seja um número par (exigência de muitos codecs e para evitar bugs)
        const filter = `fps=${fps},scale='trunc(iw*(${scale}/100)/2)*2':'trunc(ih*(${scale}/100)/2)*2':flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${colors}:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`;

        ret = await ffmpeg.exec([
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

        if (ret !== 0) {
          console.warn(
            "Conversão complexa falhou, tentando fallback simples...",
          );
          const simpleFilter = `fps=${fps},scale='trunc(iw*(${scale}/100)/2)*2':'trunc(ih*(${scale}/100)/2)*2'`;
          ret = await ffmpeg.exec([
            "-i",
            inputName,
            "-vf",
            simpleFilter,
            "-loop",
            loop ? "0" : "-1",
            "-c:v",
            "gif",
            "output.gif",
          ]);
        }
      }

      if (ret !== 0) {
        throw new Error(`FFmpeg falhou com código de erro: ${ret}`);
      }

      const data = await ffmpeg.readFile("output.gif");
      const uint8Data = data as Uint8Array;

      if (uint8Data.length === 0) {
        throw new Error(
          "O arquivo gerado está vazio (0 bytes). O formato do vídeo pode não ser suportado.",
        );
      }

      const url = URL.createObjectURL(
        new Blob([uint8Data.buffer as ArrayBuffer], {
          type: "image/gif",
        }),
      );
      setGifUrl(url);
      play("success");
    } catch (e) {
      console.error("Erro na conversão", e);
      play("error");
      alert(
        e instanceof Error
          ? e.message
          : "Falha ao converter o arquivo. Verifique se o formato/codec do vídeo é suportado.",
      );
    } finally {
      setIsConverting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex-center" style={styles.loadingContainer}>
        <ThinkingOrb className="dropzone-icon" size={64} state="working" />
        <p>Inicializando processador de vídeo...</p>
      </div>
    );
  }

  return (
    <div className="converter-container">
      <div style={styles.header}>
        <Video size={32} color="var(--accent-1)" />
        <span style={styles.headerText}>{videoFile.name}</span>
      </div>

      {videoFile.name.toLowerCase().endsWith(".webm") && !gifUrl && (
        <div style={styles.warningContainer}>
          <AlertTriangle size={20} style={styles.warningIcon} />
          <span>
            <strong>Aviso:</strong> Arquivos .webm com codec AV1 são
            decodificados pelo próprio navegador (Chrome, Firefox ou Edge). A
            conversão pode ser um pouco mais lenta que o normal.
          </span>
        </div>
      )}

      {!gifUrl ? (
        <div style={styles.mainContainer}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Configurações</h3>

            <div style={styles.settingGroup}>
              <div style={styles.settingRow}>
                <span style={styles.settingLabel}>FPS</span>
                <span style={styles.settingValue}>{fps}</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                style={styles.slider}
                disabled={isConverting}
              />
            </div>

            <div style={styles.settingGroupLast}>
              <div style={styles.settingRow}>
                <span style={styles.settingLabel}>Escala</span>
                <span style={styles.settingValue}>{scale}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                style={styles.slider}
                disabled={isConverting}
              />
            </div>

            {estimate && (
              <div style={styles.resolutionBox}>
                <span style={styles.resolutionText}>
                  Resolução de saída: {estimate.outW}×{estimate.outH}
                </span>
              </div>
            )}

            <div style={styles.settingGroupLast}>
              <div style={styles.settingRow}>
                <span style={styles.settingLabel}>Cores</span>
                <span style={styles.settingValue}>{colors}</span>
              </div>
              <select
                value={colors}
                onChange={(e) => setColors(Number(e.target.value))}
                style={styles.select}
                disabled={isConverting}
              >
                <option value={256} style={styles.selectOption}>
                  256 (Máxima qualidade)
                </option>
                <option value={128} style={styles.selectOption}>
                  128 (Equilíbrio)
                </option>
                <option value={64} style={styles.selectOption}>
                  64 (Tamanho menor)
                </option>
                <option value={32} style={styles.selectOption}>
                  32 (Menor tamanho)
                </option>
                <option value={16} style={styles.selectOption}>
                  16 (Cores limitadas)
                </option>
                <option value={8} style={styles.selectOption}>
                  8 (Estilo retrô)
                </option>
              </select>
            </div>

            <div style={styles.checkboxRow}>
              <span style={styles.settingLabel}>Loop Infinito</span>
              <label style={styles.checkboxLabelWrapper}>
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  style={styles.checkbox}
                  disabled={isConverting}
                  data-cuelume-toggle="true"
                />
              </label>
            </div>
          </div>

          <div className="actions-container">
            <button
              className="btn-primary"
              onClick={onReset}
              disabled={isConverting}
              style={styles.btnSecondary}
              data-cuelume-press="true"
              data-cuelume-release="true"
            >
              Voltar
            </button>
            <button
              className="btn-primary"
              onClick={convertToGif}
              disabled={isConverting}
              style={styles.btnPrimary}
              data-cuelume-press="true"
              data-cuelume-release="true"
            >
              {isConverting ? (
                <>
                  <ThinkingOrb size={20} state="solving" /> Convertendo...
                </>
              ) : (
                <>
                  <ArrowRight /> Iniciar Conversão
                </>
              )}
            </button>
          </div>

          {isConverting && (
            <p style={styles.processingText}>
              Processando vídeo, por favor aguarde...
            </p>
          )}
        </div>
      ) : (
        <div className="result-section">
          <h3 style={styles.successTitle}>Pronto! 🎉</h3>
          <img src={gifUrl} alt="Converted GIF" className="result-image" />

          <div style={styles.successActions}>
            <a
              href={gifUrl}
              download={`${videoFile.name.replace(".mp4", "")}.gif`}
              className="btn-primary"
              style={styles.btnHalf}
              data-cuelume-press="true"
              data-cuelume-release="true"
            >
              <Download size={20} /> Baixar GIF
            </a>
            <button
              className="btn-primary"
              onClick={onReset}
              style={styles.btnSecondary}
              data-cuelume-press="true"
              data-cuelume-release="true"
            >
              Novo Vídeo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: { flexDirection: "column", gap: "1rem", padding: "2rem" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    marginBottom: "1rem",
  },
  headerText: { fontWeight: 600 },
  warningContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    background: "rgba(255, 165, 0, 0.1)",
    border: "1px solid rgba(255, 165, 0, 0.3)",
    borderRadius: "var(--radius-lg)",
    color: "#ffa500",
    fontSize: "0.85rem",
    margin: "0 auto 1.5rem auto",
    maxWidth: "400px",
    width: "100%",
    textAlign: "left",
    lineHeight: "1.4",
  },
  warningIcon: { flexShrink: 0 },
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  card: {
    marginBottom: "1.5rem",
    width: "100%",
    maxWidth: "400px",
    background: "rgba(255,255,255,0.03)",
    padding: "1.5rem",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--card-border)",
  },
  cardTitle: {
    marginBottom: "1.5rem",
    fontSize: "1.1rem",
    color: "var(--text-primary)",
  },
  settingGroup: { marginBottom: "1.25rem" },
  settingGroupLast: { marginBottom: "1.5rem" },
  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
  },
  settingLabel: { fontSize: "0.9rem", color: "var(--text-secondary)" },
  settingValue: { fontSize: "0.9rem", fontWeight: 600 },
  slider: { width: "100%", accentColor: "var(--accent-1)" },
  select: {
    width: "100%",
    padding: "0.5rem",
    borderRadius: "6px",
    border: "1px solid var(--card-border)",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    outline: "none",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  selectOption: { color: "black" },
  resolutionBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "1.5rem",
    padding: "0.75rem 1rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    fontSize: "0.85rem",
  },
  resolutionText: { color: "var(--text-secondary)", fontWeight: 500 },
  checkboxRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "1rem",
    borderTop: "1px solid var(--card-border)",
  },
  checkboxLabelWrapper: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  },
  checkbox: {
    width: "20px",
    height: "20px",
    accentColor: "var(--accent-1)",
    cursor: "pointer",
  },

  btnSecondary: { flex: 1, background: "rgba(255,255,255,0.1)" },
  btnPrimary: { flex: 2 },
  btnHalf: { flex: 1, textDecoration: "none" },
  processingText: {
    textAlign: "center",
    marginTop: "1.5rem",
    fontSize: "0.95rem",
    color: "var(--text-secondary)",
  },
  successTitle: { marginBottom: "1rem", color: "var(--accent-2)" },
  successActions: { display: "flex", gap: "1rem" },
};
