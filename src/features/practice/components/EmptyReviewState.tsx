import { ActionButton } from '../../../lib/widgets';

interface EmptyReviewStateProps {
  onClose?: () => void;
  accentBg: string;
  buttonEdge: string;
  title?: string;
  message?: string;
}

export function EmptyReviewState({ onClose, accentBg, buttonEdge, title = "You're all caught up!", message = "No cards are due for review right now." }: EmptyReviewStateProps) {
  return (
    <div className="absolute inset-0 w-full h-full bg-ui-canvas flex flex-col justify-center items-center overflow-hidden overscroll-none">
      <div className="px-6 py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-white shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-[#E5E5E5] flex items-center justify-center mb-6">
          <span className="text-5xl">✨</span>
        </div>
        <h2 className="text-2xl font-extrabold text-ui-ink tracking-tight">{title}</h2>
        <p className="text-[#AFB6BB] text-[15px] font-bold mt-2">
          {message}
        </p>
        <div className="mt-12 flex flex-col gap-4 w-full max-w-xs px-4">
          {onClose && (
            <ActionButton
              variant="primary"
              size="lg"
              fullWidth
              className={`text-white uppercase tracking-widest ${accentBg} ${buttonEdge}`}
              onClick={onClose}
            >
              BACK TO PROFILE
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}
