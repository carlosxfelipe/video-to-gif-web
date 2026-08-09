import React, { useCallback } from "react";
import { UploadCloud } from "lucide-react";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const name = file.name.toLowerCase();
        const isWebM = file.type === "video/webm" || name.endsWith(".webm");
        const isMP4 = file.type === "video/mp4" || name.endsWith(".mp4");
        const isMOV = file.type === "video/quicktime" || name.endsWith(".mov");

        if (isMP4 || isWebM || isMOV) {
          onFileSelect(file);
        } else {
          alert("Por favor, selecione um arquivo de vídeo MP4, WebM ou MOV.");
        }
      }
    },
    [onFileSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect],
  );

  return (
    <div
      className="dropzone"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById("fileInput")?.click()}
    >
      <UploadCloud className="dropzone-icon" />
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
