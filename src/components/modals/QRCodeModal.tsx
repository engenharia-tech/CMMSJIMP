import React, { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Equipment } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
}

export function QRCodeModal({ isOpen, onClose, equipment }: Props) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !equipment) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const windowPrint = window.open('', '', 'width=600,height=600');
    if (windowPrint) {
      windowPrint.document.write(`
        <html>
          <head>
            <title>QR Code - ${equipment.equipment_name}</title>
            <style>
              body { 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0;
                font-family: sans-serif;
              }
              .container { text-align: center; border: 2px solid #000; padding: 40px; border-radius: 20px; }
              h1 { margin-top: 20px; font-size: 24px; }
              p { font-size: 18px; color: #666; margin: 5px 0; }
              .registration { font-weight: bold; font-size: 20px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              ${printContent.innerHTML}
              <h1>${equipment.equipment_name}</h1>
              <p>${equipment.sector} - ${equipment.type}</p>
              <p class="registration">${equipment.registration_number}</p>
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      windowPrint.document.close();
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById('equipment-qrcode');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1024, 1024);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${equipment.registration_number}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 transition-colors">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('equipment_qrcode')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center">
          <div ref={printRef} className="p-4 bg-white rounded-2xl shadow-inner border border-slate-100">
            <QRCodeSVG 
              id="equipment-qrcode"
              value={`cmms-jimp://equipment/${equipment.id}`} 
              size={256} 
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="mt-6 text-center">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{equipment.equipment_name}</h4>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{equipment.registration_number}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{equipment.sector} • {equipment.type}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full mt-8">
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              <Printer className="w-5 h-5" />
              {t('print')}
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              <Download className="w-5 h-5" />
              {t('download')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
