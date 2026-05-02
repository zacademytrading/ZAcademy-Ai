'use client';

import React, { useEffect, useRef } from 'react';
import * as LightweightCharts from 'lightweight-charts';

interface ChartProps {
  data: any[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
  };
}

export const TradingChart = ({
  data,
  colors: {
    backgroundColor = '#131722',
    textColor = '#d1d4dc',
  } = {},
}: ChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
      },
    });

    // Cek apakah metode ada (untuk debugging)
    if (typeof (chart as any).addCandlestickSeries !== 'function') {
      console.error('Lightweight Charts: addCandlestickSeries is not a function!', chart);
      chart.remove();
      return;
    }

    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#7c3aed',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#7c3aed',
      wickDownColor: '#ef4444',
    });

    const sortedData = [...data]
      .map(d => ({
        ...d,
        // Pastikan time dalam format yang benar (string YYYY-MM-DD atau number)
        time: typeof d.time === 'string' && d.time.includes('T') ? d.time.split('T')[0] : d.time
      }))
      .sort((a, b) => {
        const timeA = typeof a.time === 'number' ? a.time : new Date(a.time).getTime();
        const timeB = typeof b.time === 'number' ? b.time : new Date(b.time).getTime();
        return timeA - timeB;
      })
      .filter((v, i, a) => i === 0 || v.time !== a[i-1].time);

    console.log('📊 [Chart] Rendering with data points:', sortedData.length);
    if (sortedData.length > 0) {
      console.log('📊 [Chart] First point:', sortedData[0]);
      console.log('📊 [Chart] Last point:', sortedData[sortedData.length - 1]);
    }

    try {
      candlestickSeries.setData(sortedData);
      chart.timeScale().fitContent();
    } catch (err) {
      console.error('❌ [Chart] Error setting data:', err);
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, backgroundColor, textColor]);

  return (
    <div 
      ref={chartContainerRef} 
      style={{ 
        width: '100%', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        border: '1px solid #333', 
        background: backgroundColor,
        minHeight: '300px'
      }} 
    />
  );
};
