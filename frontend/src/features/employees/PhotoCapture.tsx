import { useEffect, useRef, useState } from 'react';

interface PhotoCaptureProps {
  previewUrl: string | null;
  onCapture: (blob: Blob) => void;
}

export function PhotoCapture({ previewUrl, onCapture }: PhotoCaptureProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
          setCameraOpen(false);
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
    e.target.value = '';
  }

  function handleOpenCamera() {
    setCameraError(null);
    setCameraOpen(true);
  }

  function handleCancelCamera() {
    setCameraOpen(false);
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
        setCameraOpen(false);
      },
      'image/jpeg',
      0.9,
    );
  }

  return (
    <div className="photo-capture">
      {cameraOpen ? (
        <div className="photo-capture__camera">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay playsInline muted className="photo-capture__video" />
          <div className="form-actions">
            <button type="button" onClick={handleCapture}>
              Capturar
            </button>
            <button type="button" className="button-secondary" onClick={handleCancelCamera}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="photo-capture__preview">
            {previewUrl ? (
              <img src={previewUrl} alt="Foto del empleado" />
            ) : (
              <span className="photo-capture__placeholder">Sin foto</span>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="button-secondary" onClick={() => fileInputRef.current?.click()}>
              Subir archivo
            </button>
            <button type="button" className="button-secondary" onClick={handleOpenCamera}>
              Tomar foto
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="visually-hidden"
            onChange={handleFileChange}
          />
          {cameraError && <p className="error-text">{cameraError}</p>}
        </>
      )}
    </div>
  );
}
