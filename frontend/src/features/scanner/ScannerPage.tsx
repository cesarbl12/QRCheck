import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanBadge } from '../attendance/api';

type Feedback =
  | { kind: 'idle' }
  | { kind: 'success'; employeeName: string; type: 'ENTRADA' | 'SALIDA'; timestamp: string }
  | { kind: 'error'; message: string };

const READER_ID = 'qr-reader';
const RESULT_DISPLAY_MS = 3000;

export function ScannerPage() {
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    let cancelled = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1.0 },
        (decodedText) => handleDecoded(decodedText),
        () => {
          // ignore per-frame "no QR found" noise
        },
      )
      .catch((err) => {
        if (!cancelled) {
          setCameraError(
            'No se pudo acceder a la cámara. Verifica los permisos del navegador.',
          );
          console.error(err);
        }
      });

    return () => {
      cancelled = true;
      try {
        if (scanner.isScanning) {
          scanner
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                scanner.clear();
              } catch {
                // ignore
              }
            });
        } else {
          scanner.clear();
        }
      } catch {
        // ignore: scanner was never fully initialized
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDecoded(token: string) {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const result = await scanBadge(token);
      setFeedback({
        kind: 'success',
        employeeName: result.employeeName,
        type: result.type,
        timestamp: result.timestamp,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setFeedback({ kind: 'error', message: 'Gafete no reconocido' });
      } else if (!err?.response) {
        setFeedback({ kind: 'error', message: 'Sin conexión con el servidor' });
      } else {
        setFeedback({ kind: 'error', message: 'No se pudo registrar el escaneo' });
      }
    } finally {
      setTimeout(() => {
        setFeedback({ kind: 'idle' });
        busyRef.current = false;
      }, RESULT_DISPLAY_MS);
    }
  }

  return (
    <div className="scanner-page">
      <div className="scanner-brand">QRCheck</div>

      <div className="scanner-frame">
        <div id={READER_ID} className="scanner-reader" />
        <span className="scanner-frame__corner scanner-frame__corner--tl" />
        <span className="scanner-frame__corner scanner-frame__corner--tr" />
        <span className="scanner-frame__corner scanner-frame__corner--bl" />
        <span className="scanner-frame__corner scanner-frame__corner--br" />
      </div>

      <div className="scanner-hint">
        {cameraError ? cameraError : 'Coloca tu gafete QR dentro del recuadro'}
      </div>

      {feedback.kind === 'success' && (
        <div className="scanner-overlay scanner-overlay--success">
          <span className="scanner-overlay__type">
            {feedback.type === 'ENTRADA' ? 'ENTRADA' : 'SALIDA'}
          </span>
          <span className="scanner-overlay__name">{feedback.employeeName}</span>
          <span className="scanner-overlay__time">
            {new Date(feedback.timestamp).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}

      {feedback.kind === 'error' && (
        <div className="scanner-overlay scanner-overlay--error">{feedback.message}</div>
      )}
    </div>
  );
}
