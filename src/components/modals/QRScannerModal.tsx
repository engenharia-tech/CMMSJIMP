import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function QRScannerModal({ isOpen, onClose, onScan }: Props) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader";

  const startScanner = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
      }

      const qrCodeSuccessCallback = (decodedText: string) => {
        stopScanner().then(() => onScan(decodedText));
      };

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      // Use back camera by default
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        undefined
      );
      
      setIsInitializing(false);
    } catch (err: any) {
      console.error("Error starting QR scanner:", err);
      setError(err?.message || "Failed to start camera");
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping QR scanner:", err);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the container is rendered
      const timeout = setTimeout(() => {
        startScanner();
      }, 500);

      return () => {
        clearTimeout(timeout);
        stopScanner();
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('scan_qrcode', 'Scan QR Code')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">{t('camera_scanner', 'Camera Scanner')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div id={scannerId} className="w-full h-full"></div>
            
            {isInitializing && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 z-10">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <p className="text-sm text-slate-500">{t('initializing_camera', 'Initializing camera...')}</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center z-10">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">{t('camera_error', 'Camera Error')}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
                <button 
                  onClick={startScanner}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  {t('retry', 'Retry')}
                </button>
              </div>
            )}
          </div>
          
          {!error && (
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('position_qr_code', 'Position the QR code inside the box to scan')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
