import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ActionButton, AppIcon, BrandWordmark, LoadingScreen, WorkspaceWindow } from '../../lib/widgets';
import { useAuth } from '../../hooks/useAuth';
import { useSharedFolder } from './hooks/useSharedFolder';
import { FolderSvg } from '../../lib/widgets';
import { resolveFolderColor } from '../../utils/folderColors';
import { shareFolderLink, rememberFolderReturn } from '../../utils/browser/shareLink';

export function SharedFolderSignIn({ shareId, returnPath }: { shareId: string; returnPath?: string }) {
  const { loginWithGoogle, isLoading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSignIn = async () => {
    setError(null);
    setSigningIn(true);
    rememberFolderReturn(returnPath ?? `/s/${shareId}`);
    try {
      await loginWithGoogle();
    } catch {
      setSigningIn(false);
      setError('Sign-in could not start. Please try again.');
    }
  };

  return (
    <WorkspaceWindow style={{ paddingLeft: 0 }}>
      <header className="flex justify-center px-5 py-6 sm:justify-start sm:px-8">
        <BrandWordmark />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-14 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-feature bg-brand-primary-soft text-brand-primary">
            <AppIcon name="share" size={28} />
          </div>
          <h1 className="text-2xl font-black text-ui-ink-strong">Sign in to open this shared folder</h1>
          <p className="mt-2 text-sm font-bold text-ui-muted-strong">Your sign-in will bring you back here.</p>
          {error && <p role="alert" className="mt-4 text-sm font-bold text-feedback-danger-edge">{error}</p>}
          <ActionButton className="mt-6" size="lg" fullWidth loading={signingIn || isLoading} loadingLabel="Opening Google" onClick={() => void startSignIn()}>
            <AppIcon name="signIn" size={19} />
            <span>Continue with Google</span>
          </ActionButton>
        </div>
      </main>
    </WorkspaceWindow>
  );
}

export function SharedFolderScreen({ shareId }: { shareId: string }) {
  const { folder, loadState, saveError, saving, skippedCount, cardCount, libraryReady, savedFolderId, addToLibrary, openFolder } = useSharedFolder(shareId);

  if (loadState === 'loading') {
    return <WorkspaceWindow><LoadingScreen message="Opening shared folder…" tone="canvas" /></WorkspaceWindow>;
  }
  if (loadState === 'missing') {
    return <WorkspaceWindow><PreviewMessage title="This folder isn't shared anymore" /></WorkspaceWindow>;
  }
  if (loadState === 'error' || !folder) {
    return <WorkspaceWindow><PreviewMessage title="Could not open this folder" detail={saveError ?? 'Check your connection and try again.'} /></WorkspaceWindow>;
  }

  const tone = resolveFolderColor(folder.color ?? undefined);
  const byline = folder.ownerDisplayName ? `by ${folder.ownerDisplayName}` : 'by a learner';
  const saved = savedFolderId !== null;

  return (
    <WorkspaceWindow contentClassName="overflow-y-auto">
      <header className="sticky top-0 z-40 bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent px-4 py-4 backdrop-blur-[2px] sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <BrandWordmark />
          <ActionButton variant="quiet" size="sm" onClick={() => void shareFolderLink(folder.name, folder.id)}>
            <AppIcon name="share" size={17} />
            <span>Share</span>
          </ActionButton>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        <section className="flex flex-col items-center pt-4 text-center">
          <div className="mb-3 aspect-[25/21] w-28 sm:w-36">
            <FolderSvg colorFront={tone.front} colorBack={tone.back} />
          </div>
          <h1 className="max-w-full break-words text-3xl font-black leading-tight text-ui-ink-strong">{folder.name}</h1>
          <p className="mt-2 text-sm font-bold text-ui-muted-strong">{byline} · Saved by {folder.saveCount}</p>
          <p className="mt-1 text-xs font-bold text-ui-muted">{cardCount} {cardCount === 1 ? 'card' : 'cards'}</p>
        </section>

        <ul className="mt-7 grid gap-2 sm:grid-cols-2">
          {folder.cards.map((card, index) => (
            <li key={`${card.simplified}-${index}`} className="min-w-0 rounded-control bg-ui-surface px-4 py-3">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="min-w-0 break-words font-chinese text-2xl font-bold text-ui-ink-strong">{card.traditional || card.simplified}</span>
                {card.pinyin && <span className="shrink-0 text-sm font-bold text-ui-muted">{card.pinyin}</span>}
              </div>
              {card.translation && <p className="mt-1 break-words text-sm font-bold text-ui-muted-strong">{card.translation}</p>}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-8 max-w-md">
          {saved ? (
            <>
              <p className="mb-3 text-center text-base font-black text-ui-ink-strong">Added to your library</p>
              {skippedCount > 0 && <p className="mb-3 text-center text-sm font-bold text-ui-muted-strong">{skippedCount} {skippedCount === 1 ? 'card was' : 'cards were'} skipped because your library is full.</p>}
              {saveError && <p role="status" className="mb-3 text-center text-sm font-bold text-ui-muted-strong">{saveError}</p>}
              <ActionButton size="lg" fullWidth onClick={() => openFolder(savedFolderId!)}>
                <AppIcon name="folder" size={19} />
                <span>Open in library</span>
              </ActionButton>
            </>
          ) : (
            <>
              {!libraryReady && <LoadingScreen inline message="Preparing your library…" />}
              {saveError && <p role="alert" className="mb-3 text-center text-sm font-bold text-feedback-danger-edge">{saveError}</p>}
              <ActionButton size="lg" fullWidth loading={saving} loadingLabel="Adding to your library" disabled={!libraryReady} onClick={() => void addToLibrary()}>
                <AppIcon name="plus" size={19} />
                <span>Add to my library</span>
              </ActionButton>
            </>
          )}
        </div>
      </main>
    </WorkspaceWindow>
  );
}

function PreviewMessage({ title, detail }: { title: string; detail?: string }) {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-black text-ui-ink-strong">{title}</h1>
      {detail && <p className="mt-2 text-sm font-bold text-ui-muted-strong">{detail}</p>}
      <ActionButton className="mt-6" variant="secondary" onClick={() => navigate('/library')}>Go to Library</ActionButton>
    </main>
  );
}
