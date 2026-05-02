'use client';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportButtonProps {
  elementId: string;
  filename: string;
}

export const ExportPDFButton: React.FC<ExportButtonProps> = ({ elementId, filename }) => {
  const exportToPDF = async () => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#131314', // Match theme background
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
    }
  };

  return (
    <button
      onClick={exportToPDF}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 8,
        background: 'rgba(124, 58, 237, 0.1)',
        border: '1px solid rgba(124, 58, 237, 0.2)',
        color: '#a78bfa',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: 12,
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)')}
      onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)')}
    >
      <FileText size={14} />
      Export Trading Plan
    </button>
  );
};
