import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface ScannerProps {
  onScan: (uri: string) => void;
}

export function Scanner({ onScan }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [currentDeviceLabel, setCurrentDeviceLabel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Enumerate devices once
  useEffect(() => {
    async function getDevices() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(videoDevices);

        // Stop the initial prompt stream immediately
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        // Ignored, fallback to generic constraint
      }
    }
    void getDevices();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let isMounted = true;

    async function start() {
      try {
        setError(null);
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: "environment" },
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Extract label from the actual selected track
        if (stream.getVideoTracks().length > 0) {
          const track = stream.getVideoTracks()[0];
          setCurrentDeviceLabel(track.label);
        }

        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scan();
        }
      } catch {
        if (isMounted) {
          setError("Camera access denied or not available");
        }
      }
    }

    function scan() {
      if (!isMounted) return;

      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            onScan(code.data);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(scan);
    }

    start();

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onScan, selectedDeviceId]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {devices.length > 1 && !error && (
        <select
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="w-full bg-bg p-2 rounded border border-border text-sm text-text outline-none focus:border-accent"
        >
          <option value="">Default Camera</option>
          {devices.map((device, idx) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${idx + 1}`}
            </option>
          ))}
        </select>
      )}

      <div className="rounded-xl overflow-hidden bg-black aspect-video relative w-full shrink-0 min-h-[240px] flex items-center justify-center">
        {error ? (
          <p className="text-text-muted text-sm text-center px-4">{error}</p>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover absolute inset-0"
              playsInline
              muted
              autoPlay
            />
            <div className="absolute inset-0 border-2 border-accent m-8 rounded-xl opacity-50 pointer-events-none" />

            {currentDeviceLabel && (
              <div className="absolute top-2 left-2 right-2 flex justify-center pointer-events-none">
                <div className="bg-black/60 text-white text-[0.625rem] px-2 py-0.5 rounded-full backdrop-blur-sm max-w-[80%] truncate">
                  {currentDeviceLabel}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
