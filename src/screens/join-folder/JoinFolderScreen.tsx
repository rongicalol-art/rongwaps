import { useNavigate } from 'react-router';
import { ActionButton, BrandWordmark, FolderSvg, LoadingScreen, WorkspaceWindow } from '../../lib/widgets';
import { resolveFolderColor } from '../../utils/folderColors';
import { useJoinFolder } from './hooks/useJoinFolder';

export function JoinFolderScreen({ code }: { code: string }) {
  const { folder, state, error, joining, join, retry } = useJoinFolder(code);
  const navigate = useNavigate();
  if (state === 'loading') return <WorkspaceWindow><LoadingScreen message="Opening folder invite…" tone="canvas" /></WorkspaceWindow>;
  const tone = resolveFolderColor(folder?.color);
  return <WorkspaceWindow>
    <header className="px-4 py-6 sm:px-6 lg:px-10"><BrandWordmark /></header>
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-14 text-center">
      <div className="w-full max-w-sm">
        {state === 'ready' && folder ? <>
          <div className="mx-auto mb-5 aspect-[25/21] w-36"><FolderSvg colorFront={tone.front} colorBack={tone.back} /></div>
          <h1 className="break-words text-3xl font-black text-ui-ink-strong">{folder.name}</h1>
          <p className="mt-3 break-words text-sm font-bold text-ui-muted-strong">{folder.owner_display_name || 'A learner'} shared this folder with you</p>
          <p className="mt-1 text-sm font-bold text-ui-muted">{folder.card_count} {folder.card_count === 1 ? 'card' : 'cards'} · {folder.member_count} {folder.member_count === 1 ? 'person' : 'people'}</p>
          {error && <p role="alert" className="mt-4 text-sm font-bold text-feedback-danger-text">{error}</p>}
          <ActionButton className="mt-6" size="lg" fullWidth loading={joining} disabled={joining} loadingLabel="Opening folder…" onClick={() => void join()}>
            {folder.already_member ? 'Open folder' : 'Add to my library'}
          </ActionButton>
        </> : <>
          <h1 className="text-2xl font-black text-ui-ink-strong">{state === 'missing' ? "This invite link isn't valid anymore" : 'Could not open this invite'}</h1>
          {error && <p role="alert" className="mt-3 text-sm font-bold text-ui-muted-strong">{error}</p>}
          {state === 'error' && <ActionButton className="mt-6" onClick={retry}>Try again</ActionButton>}
          <ActionButton className="mt-6" variant="secondary" onClick={() => navigate('/library')}>Go to Library</ActionButton>
        </>}
      </div>
    </main>
  </WorkspaceWindow>;
}
