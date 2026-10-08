import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const removeVietnameseTones = (str: string) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

export const generateTransferPDF = (transfer: any) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('BIEN BAN BAN GIAO TAI SAN', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Ma ban giao: TR-${transfer.id}`, 20, 40);
  doc.text(`Ngay ban giao: ${new Date(transfer.transferDate).toLocaleString('vi-VN')}`, 20, 50);
  
  // Asset info
  doc.text('1. Thong tin tai san:', 20, 70);
  autoTable(doc, {
    startY: 75,
    head: [['Ten Tai San', 'Ma QR', 'Serial']],
    body: [
      [
        removeVietnameseTones(transfer.asset?.name || 'N/A'), 
        removeVietnameseTones(transfer.asset?.assetTag || 'N/A'), 
        removeVietnameseTones(transfer.asset?.serial || 'N/A')
      ]
    ],
  });
  
  // Parse notes to extract sender and receiver
  let sender = 'Khong ro';
  let receiver = 'Khong ro';
  let realNotes = transfer.notes || '';

  if (realNotes.includes('Người giao:')) {
    const lines = realNotes.split('\n');
    sender = lines.find((l: string) => l.startsWith('Người giao:'))?.replace('Người giao:', '').trim() || '-';
    receiver = lines.find((l: string) => l.startsWith('Người nhận:'))?.replace('Người nhận:', '').trim() || '-';
    realNotes = lines.filter((l: string) => !l.startsWith('Người giao:') && !l.startsWith('Người nhận:')).join('\n').replace('Ghi chú:', '').trim();
  }

  // User info
  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  doc.text('2. Thong tin cac ben:', 20, finalY + 15);
  doc.text(`Dai dien ben Giao: ${removeVietnameseTones(sender)}`, 20, finalY + 25);
  doc.text(`Dai dien ben Nhan: ${removeVietnameseTones(receiver)}`, 20, finalY + 35);
  
  const splitNotes = doc.splitTextToSize(`Ghi chu them: ${removeVietnameseTones(realNotes) || 'Khong co'}`, 170);
  doc.text(splitNotes, 20, finalY + 45);
  
  // Signature
  doc.text('3. Chu ky xac nhan (Ben nhan):', 20, finalY + 65);
  if (transfer.signatureData) {
    try {
      doc.addImage(transfer.signatureData, 'PNG', 20, finalY + 70, 80, 40);
    } catch (e) {
      doc.text('(Loi hien thi chu ky)', 20, finalY + 80);
    }
  } else {
    doc.text('(Chua ky)', 20, finalY + 80);
  }
  
  doc.save(`BienBanBanGiao_${transfer.id}.pdf`);
};
