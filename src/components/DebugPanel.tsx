import { useState, useEffect } from 'react';

export function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState({
    tailwindLoaded: false,
    flexWorks: false,
    gridWorks: false,
    colorsWork: false,
    paddingWorks: false,
    displayValue: '',
    bgColor: '',
    padding: '',
    gridDisplay: '',
  });

  useEffect(() => {
    setTimeout(() => {
      // Test 1: Flex
      const flexDiv = document.createElement('div');
      flexDiv.className = 'flex items-center justify-center bg-secondary p-4';
      flexDiv.style.position = 'absolute';
      flexDiv.style.top = '-9999px';
      document.body.appendChild(flexDiv);
      
      const flexStyle = window.getComputedStyle(flexDiv);
      const flexWorks = flexStyle.display === 'flex';
      const colorsWork = flexStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const paddingWorks = flexStyle.padding !== '0px';
      
      // Test 2: Grid
      const gridDiv = document.createElement('div');
      gridDiv.className = 'grid grid-cols-2 gap-4';
      gridDiv.style.position = 'absolute';
      gridDiv.style.top = '-9999px';
      document.body.appendChild(gridDiv);
      
      const gridStyle = window.getComputedStyle(gridDiv);
      const gridWorks = gridStyle.display === 'grid';
      
      setDebugInfo({
        tailwindLoaded: flexWorks && colorsWork && paddingWorks,
        flexWorks,
        gridWorks,
        colorsWork,
        paddingWorks,
        displayValue: flexStyle.display,
        bgColor: flexStyle.backgroundColor,
        padding: flexStyle.padding,
        gridDisplay: gridStyle.display,
      });
      
      console.log('🔍 Tailwind Debug Info:');
      console.log('  Flex display:', flexStyle.display);
      console.log('  Background:', flexStyle.backgroundColor);
      console.log('  Padding:', flexStyle.padding);
      console.log('  Grid display:', gridStyle.display);
      console.log('  ✅ Flex works:', flexWorks);
      console.log('  ✅ Grid works:', gridWorks);
      console.log('  ✅ Colors work:', colorsWork);
      console.log('  ✅ Padding works:', paddingWorks);
      
      document.body.removeChild(flexDiv);
      document.body.removeChild(gridDiv);
    }, 500);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono shadow-2xl border border-white/20 max-w-sm z-50">
      <div className="font-bold mb-2 text-yellow-400">🔍 Tailwind Debug</div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={debugInfo.tailwindLoaded ? 'text-green-400' : 'text-red-400'}>
            {debugInfo.tailwindLoaded ? '✅' : '❌'}
          </span>
          <span>Tailwind: {debugInfo.tailwindLoaded ? 'Loaded' : 'Partial/Failed'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={debugInfo.flexWorks ? 'text-green-400' : 'text-red-400'}>
            {debugInfo.flexWorks ? '✅' : '❌'}
          </span>
          <span>Flex: {debugInfo.displayValue || 'N/A'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={debugInfo.gridWorks ? 'text-green-400' : 'text-red-400'}>
            {debugInfo.gridWorks ? '✅' : '❌'}
          </span>
          <span>Grid: {debugInfo.gridDisplay || 'N/A'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={debugInfo.colorsWork ? 'text-green-400' : 'text-red-400'}>
            {debugInfo.colorsWork ? '✅' : '❌'}
          </span>
          <span>Colors: {debugInfo.bgColor ? 'OK' : 'FAIL'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={debugInfo.paddingWorks ? 'text-green-400' : 'text-red-400'}>
            {debugInfo.paddingWorks ? '✅' : '❌'}
          </span>
          <span>Padding: {debugInfo.padding || 'N/A'}</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-white/20 text-[10px] opacity-70">
        Open Console (F12) for details
      </div>
    </div>
  );
}