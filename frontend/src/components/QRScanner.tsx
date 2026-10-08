import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        setScanResult(decodedText);
        scanner.clear();
        onScanSuccess(decodedText);
      },
      (_error) => {
        // console.warn(error);
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner. ", error));
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-800">Quét mã QR Tài Sản</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 font-bold">&times;</button>
        </div>
        <div className="p-4">
          <div id="reader" className="w-full"></div>
          {scanResult && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md text-center">
              Đã quét: {scanResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
