import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({ value, height = 40, width = 1.6, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        height,
        width,
        displayValue: false,
        margin: 0,
        background: 'transparent',
        lineColor: '#1E293B',
      });
    } catch {
      // Invalid characters for the barcode format — leave it blank rather than crash the page
    }
  }, [value, height, width]);

  return <svg ref={svgRef} className={className} />;
};
