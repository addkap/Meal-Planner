// Camera barcode scanner. Uses the ZXing library bundled with the app (not loaded from the internet), because
// Safari on iPhone does not have the browser's built-in barcode reader. Camera access needs https, which GitHub
// Pages provides (and localhost while testing).
import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onResult, onCancel, onTypeInstead }: { onResult: (code: string) => void; onCancel: () => void; onTypeInstead: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let stop: (() => void) | undefined;
    let done = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera');
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
      const reader = new BrowserMultiFormatReader(hints);
      const controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (result) => {
        if (result && !done) {
          done = true;
          controls.stop();
          if (navigator.vibrate) navigator.vibrate(60);
          onResult(result.getText());
        }
      });
      stop = () => controls.stop();
      if (done) controls.stop();
    })().catch((e: unknown) => {
      const name = e instanceof Error ? e.name || e.message : '';
      setProblem(
        name === 'NotAllowedError' ? 'The camera is blocked for this app. You can allow it in the iPhone Settings app (Safari > Camera), or type the barcode number instead.'
          : name === 'no-camera' || name === 'NotFoundError' ? 'No camera is available here. Type the barcode number instead.'
            : 'The camera could not start. Type the barcode number instead.',
      );
    });
    return () => { done = true; stop?.(); };
  }, [onResult]);

  return (
    <div className="scanner">
      {problem ? (
        <p className="warn-line">{problem}</p>
      ) : (
        <>
          <div className="viewfinder">
            <video ref={video} playsInline muted autoPlay />
            <span className="aim" aria-hidden />
          </div>
          <p className="muted center">Point the camera at the barcode and hold still.</p>
        </>
      )}
      <button className="btn" onClick={onTypeInstead}>Type the barcode number instead</button>
      <button className="btn" onClick={onCancel}>Cancel</button>
    </div>
  );
}
