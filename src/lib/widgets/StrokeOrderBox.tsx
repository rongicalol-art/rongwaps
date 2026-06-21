import React, { useRef, useEffect } from 'react';
import HanziWriter from 'hanzi-writer';

const hanziCache = new Map<string, any>();

interface StrokeOrderBoxProps {
  char: string;
  size?: number;
  accentHex?: string;
}

export function StrokeOrderBox({ char, size = 140, accentHex = '#1CB0F6' }: StrokeOrderBoxProps) {
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
      showCharacter: false, 
      showOutline: true,
      strokeColor: accentHex, 
      outlineColor: '#E5E5E5',
      strokeAnimationSpeed: 2,
      delayBetweenStrokes: 100,
      delayBetweenLoops: 1500,
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
    
    writer.loopCharacterAnimation();

    return () => {
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
      }
    };
  }, [char, size, accentHex]);

  return (
     <div 
       className="relative rounded-[24px] overflow-hidden cursor-pointer active:scale-95 transition-transform"
       style={{ width: size, height: size }}
       onClick={() => writerRef.current?.loopCharacterAnimation?.()}
     >
        <div ref={containerRef} className="absolute inset-0 z-10" />
     </div>
  );
}
