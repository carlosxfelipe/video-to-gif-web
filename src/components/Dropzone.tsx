import React, { useCallback, useState } from "react";
import { UploadCloud } from "lucide-react";
import { play } from "cuelume";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) {
        setIsDragging(true);
        play("ready");
      }
    },
    [isDragging],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Verifica se estamos realmente saindo da área (e não de um filho)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const name = file.name.toLowerCase();
        const isWebM = file.type === "video/webm" || name.endsWith(".webm");
        const isMP4 = file.type === "video/mp4" || name.endsWith(".mp4");
        const isMOV = file.type === "video/quicktime" || name.endsWith(".mov");

        if (isMP4 || isWebM || isMOV) {
          play("arrival");
          onFileSelect(file);
        } else {
          play("error");
          alert("Por favor, selecione um arquivo de vídeo MP4, WebM ou MOV.");
        }
      }
    },
    [onFileSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        play("arrival");
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect],
  );

  return (
    <div
      className={`dropzone ${isDragging ? "dragging" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById("fileInput")?.click()}
      data-cuelume-press="true"
      data-cuelume-release="true"
      style={{
        transform: isDragging ? "scale(1.02)" : "scale(1)",
        transition: "all 0.2s ease",
        borderColor: isDragging ? "var(--accent-1)" : undefined,
        background: isDragging ? "rgba(255,255,255,0.08)" : undefined,
      }}
    >
      <UploadCloud
        className="dropzone-icon"
        style={{
          color: isDragging ? "var(--accent-1)" : undefined,
          transform: isDragging ? "scale(1.1)" : "scale(1)",
          transition: "all 0.2s ease",
        }}
      />
      <h3>Arraste e solte o seu vídeo (MP4/WebM/MOV) aqui</h3>
      <p className="subtitle" style={{ marginBottom: 0 }}>
        ou clique para selecionar
      </p>
      <input
        type="file"
        id="fileInput"
        accept="video/mp4,video/webm,video/quicktime,.mov"
        onChange={handleFileInput}
        style={{ display: "none" }}
      />
    </div>
  );
};
