import { useRef, useEffect } from 'react';

interface DoorDrawingExportData {
  openingNumber: string;
  imageData: string;
  annotations: Record<string, unknown>;
  timestamp: string;
}

interface DoorDrawingEmbedProps {
  openingNumber: string;
  width: number;
  height: number;
  handing: 'LH' | 'RH' | 'LHR' | 'RHR';
  projectId: string;
  onExport?: (data: DoorDrawingExportData) => void;
  onReady?: () => void;
}

function DoorDrawingEmbed({ 
  openingNumber,
  width,
  height,
  handing,
  projectId,
  onExport,
  onReady
}: DoorDrawingEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const embedUrl = new URL('https://door-configurator-pro--westvalleycoupl.replit.app/embed');
  embedUrl.searchParams.set('opening', openingNumber);
  embedUrl.searchParams.set('width', width.toString());
  embedUrl.searchParams.set('height', height.toString());
  embedUrl.searchParams.set('handing', handing);
  embedUrl.searchParams.set('projectId', projectId);
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DOOR_DRAWING_READY') {
        onReady?.();
      }
      
      if (event.data?.type === 'DOOR_DRAWING_EXPORT') {
        onExport?.(event.data.data);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onExport, onReady]);
  
  const sendConfig = () => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'DOOR_DRAWING_INIT',
      config: { openingNumber, width, height, handing, projectId }
    }, '*');
  };
  
  return (
    <iframe
      ref={iframeRef}
      src={embedUrl.toString()}
      onLoad={sendConfig}
      className="w-full h-[500px] border-0 rounded-lg"
      title="Door Opening Drawing"
      data-testid="iframe-door-drawing"
    />
  );
}

export default DoorDrawingEmbed;
