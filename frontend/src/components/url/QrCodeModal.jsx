import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import Modal from '../common/Modal';

export default function QrCodeModal({ isOpen, onClose, url, label }) {
  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `shortly-${label || 'qr'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR Code" maxWidth="max-w-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-white rounded-2xl">
          <QRCodeSVG
            id="qr-code-svg"
            value={url || 'https://shortly.app'}
            size={220}
            level="H"
            includeMargin={false}
          />
        </div>
        <p className="text-sm text-ink-400 text-center font-mono break-all px-4">
          {url}
        </p>
        <button onClick={handleDownload} className="btn-primary w-full">
          <Download className="w-4 h-4" /> Download PNG
        </button>
      </div>
    </Modal>
  );
}