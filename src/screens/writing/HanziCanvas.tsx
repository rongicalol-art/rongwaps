import React, { useRef, useEffect, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';

const hanziCache = new Map<string, any>();

export function HanziCanvas({ 
  char, 
  status, 
  onComplete,
  size = 280,
  showOutline = true,
  accentHex = '#1CB0F6',
  accentBorder = 'border-[#1CB0F6]',
  bgAccent
}: { 
  char: string; 
  status: 'idle' | 'quizzing' | 'completed'; 
  onComplete: () => void;
  size?: number;
  showOutline?: boolean;
  accentHex?: string;
  accentBorder?: string;
  bgAccent?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    
    // Fallback/dummy writer if not hanzi, though we filter it in parent usually.
    const writer = HanziWriter.create(containerRef.current, char, {
      renderer: 'svg',
      width: size,
      height: size,
      padding: size * 0.08,
      showCharacter: status === 'completed',
      showHintAfterMisses: 1,
      showOutline: showOutline,
      strokeColor: accentHex, 
      highlightColor: '#ff4b4b',
      outlineColor: '#E5E5E5',
      drawingWidth: Math.max(10, size * 0.08),
      charDataLoader: (char, onLoad, onError) => {
        if (hanziCache.has(char)) {
            onLoad(hanziCache.get(char));
            return;
        }

        const encodedChar = encodeURIComponent(char);
        // Try jsdelivr first, fallback to unpkg, then github
        fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encodedChar}.json`)
          .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
          })
          .then(data => {
            hanziCache.set(char, data);
            onLoad(data);
          })
          .catch(() => {
            fetch(`https://unpkg.com/hanzi-writer-data@2.0.1/${encodedChar}.json`)
              .then(res => {
                if (!res.ok) throw new Error('Not found');
                return res.json();
              })
              .then(data => {
                hanziCache.set(char, data);
                onLoad(data);
              })
              .catch(() => {
                fetch(`https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/data/${encodedChar}.json`)
                  .then(res => {
                    if (!res.ok) throw new Error('Not found');
                    return res.json();
                  })
                  .then(data => {
                    hanziCache.set(char, data);
                    onLoad(data);
                  })
                  .catch(onError);
              });
          });
      }
    });
    writerRef.current = writer;

    return () => {
      // Clean up
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
      }
    };
  }, [char, size]); // recreate on size/char change

  useEffect(() => {
    if (!writerRef.current) return;
    if (showOutline) {
      writerRef.current.showOutline();
    } else {
      writerRef.current.hideOutline();
    }
  }, [showOutline]);

  useEffect(() => {
    if (!writerRef.current) return;
    
    if (status === 'quizzing') {
      writerRef.current.hideCharacter();
      writerRef.current.quiz({
        onComplete: onComplete,
      });
    } else if (status === 'completed') {
      writerRef.current.cancelQuiz();
      writerRef.current.showCharacter();
    } else {
      // idle
      writerRef.current.cancelQuiz();
      writerRef.current.hideCharacter();
    }
  }, [status, onComplete]);

  return (
    <div className="relative mx-auto rounded-[32px] md:rounded-[40px] shadow-sm transform-none" style={{ width: size, height: size }}>
      <div 
        className={`absolute inset-0 bg-[#F7F7F7] border-[3px] border-b-[8px] md:border-[4px] md:border-b-[10px] rounded-[32px] md:rounded-[40px] overflow-hidden transition-all duration-300 ${status === 'completed' ? `${accentBorder} ${bgAccent}` : (status === 'quizzing' ? `${accentBorder} bg-white shadow-xl` : 'border-[#E5E5E5] opacity-70')}`}
      >
        {/* Background Grid Lines (Tiánzìgé format) */}
        <div className="absolute inset-x-0 inset-y-0 pointer-events-none flex items-center justify-center opacity-30">
          <div className="w-full h-[2px] border-t-2 border-dashed border-[#AFB6BB]" />
          <div className="absolute h-full w-[2px] border-l-2 border-dashed border-[#AFB6BB]" />
        </div>
      </div>
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-10" 
        style={{ touchAction: 'none' }} // Prevents browser scroll while drawing
      />
    </div>
  );
}

export function SingleChar({ char, status, onComplete, size = 280, showOutline = true, accentHex, accentBorder, textAccent, bgAccent }: { char: string; status: 'idle' | 'quizzing' | 'completed'; onComplete: () => void; size?: number; showOutline?: boolean; accentHex?: string; accentBorder?: string; textAccent?: string; bgAccent?: string; }) {
  const isHanzi = /[\u4e00-\u9fa5\u3400-\u4dbf\u2e80-\u2fdf]/.test(char);
  
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  if (!isHanzi) {
    useEffect(() => {
      if (status === 'quizzing') {
        const t = setTimeout(() => {
          handleComplete();
        }, 300);
        return () => clearTimeout(t);
      }
    }, [status, handleComplete]);

    return (
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <div 
          className={`absolute inset-0 flex items-center justify-center font-chinese transition-all duration-300 bg-[#F7F7F7] border-[3px] border-b-[8px] md:border-[4px] md:border-b-[10px] rounded-[32px] md:rounded-[40px] ${status === 'completed' ? `${textAccent} ${accentBorder} ${bgAccent}` : 'text-[#E5E5E5] border-[#E5E5E5]'}`}
        >
          <span style={{ fontSize: size * 0.5 }}>{char}</span>
        </div>
      </div>
    );
  }

  return <HanziCanvas char={char} status={status} onComplete={handleComplete} size={size} showOutline={showOutline} accentHex={accentHex} accentBorder={accentBorder} bgAccent={bgAccent} />;
}
