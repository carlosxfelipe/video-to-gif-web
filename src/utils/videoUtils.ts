import { FFmpeg } from "@ffmpeg/ffmpeg";

export const formatBytes = (bytes: number): string => {
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
};

// Estimativa empírica: ~0.4 bytes por pixel por frame com 64 cores,
// ajustada pela profundidade da paleta (log2 das cores)
export const getEstimate = (
  videoMeta: { width: number; height: number; duration: number } | null,
  scale: number,
  fps: number,
  colors: number,
) => {
  if (!videoMeta || videoMeta.width === 0) return null;
  const outW = Math.trunc((videoMeta.width * (scale / 100)) / 2) * 2;
  const outH = Math.trunc((videoMeta.height * (scale / 100)) / 2) * 2;
  const frames = Math.max(1, Math.ceil(videoMeta.duration * fps));
  const bytesPerPixel = 0.4 * (Math.log2(colors) / 6);
  const bytes = outW * outH * frames * bytesPerPixel;
  return { outW, outH, bytes };
};

// Detecta se um .webm usa o codec AV1 procurando o CodecID "V_AV1" no cabeçalho
export const isAv1WebM = async (file: File): Promise<boolean> => {
  const header = new Uint8Array(await file.slice(0, 262144).arrayBuffer());
  const target = [0x56, 0x5f, 0x41, 0x56, 0x31]; // "V_AV1"
  for (let i = 0; i <= header.length - target.length; i++) {
    let found = true;
    for (let j = 0; j < target.length; j++) {
      if (header[i + j] !== target[j]) {
        found = false;
        break;
      }
    }
    if (found) return true;
  }
  return false;
};

export const seekTo = (video: HTMLVideoElement, time: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Erro ao buscar frame do vídeo."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });

// Decodifica AV1 com o decoder nativo do navegador e grava os frames como PNG no FS do ffmpeg
export const extractFramesWithBrowser = async (
  ffmpeg: FFmpeg,
  file: File,
  frameRate: number,
): Promise<number> => {
  const video = document.createElement("video");

  if (!video.canPlayType('video/webm; codecs="av01.0.05M.08"')) {
    throw new Error(
      "Este navegador não suporta decodificação de AV1. Tente no Chrome ou Firefox.",
    );
  }

  const url = URL.createObjectURL(file);
  try {
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () =>
        reject(new Error("Não foi possível carregar o vídeo AV1."));
    });

    let duration = video.duration;
    if (!isFinite(duration)) {
      await seekTo(video, 1e7);
      duration = video.currentTime;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível criar o canvas.");

    const step = 1 / frameRate;
    let frameIndex = 0;

    for (let t = 0; t < duration; t += step) {
      await seekTo(video, Math.min(t, Math.max(duration - 0.001, 0)));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Falha ao capturar frame.")),
          "image/png",
        ),
      );
      await ffmpeg.writeFile(
        `frame${String(frameIndex).padStart(4, "0")}.png`,
        new Uint8Array(await blob.arrayBuffer()),
      );
      frameIndex++;
    }

    return frameIndex;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
};
