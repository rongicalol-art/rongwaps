import { useEffect, useState } from 'react';
import { ActionButton, AppIcon, Drawer, IconActionButton } from '../../../lib/widgets';
import { AVATAR_COLORS, COVER_PRESETS } from '../../../store/slices/profileSlice';
import type { ProfileImageCrop } from '../../../services/profileMedia';
import type { useProfileEditor } from '../hooks/useProfileEditor';
import { ProfileImageCropper } from './ProfileImageCropper';
import { avatarStyle, CoverGlyphs, coverStyle, ProfileAvatar } from './ProfileAppearance';

type Editor = ReturnType<typeof useProfileEditor>;
type CropKind = 'avatar' | 'cover';
export function EditProfilePanel({ editor, name, canUpload, googleAvatar }: {
  editor: Editor; name: string; canUpload: boolean; googleAvatar?: string;
}) {
  const draft = editor.draft;
  const [cropTarget, setCropTarget] = useState<{ kind: CropKind; file: File } | null>(null);
  const [cropSelection, setCropSelection] = useState<ProfileImageCrop | null>(null);
  const [cropFiles, setCropFiles] = useState<Partial<Record<CropKind, File>>>({});

  useEffect(() => {
    if (!draft) {
      setCropTarget(null);
      setCropSelection(null);
      setCropFiles({});
    }
  }, [draft]);

  const chooseImage = (kind: CropKind, file?: File) => {
    if (!file) return;
    setCropSelection(null);
    setCropTarget({ kind, file });
  };
  const cancelCrop = () => {
    setCropTarget(null);
    setCropSelection(null);
  };
  const applyCrop = () => {
    if (!cropTarget || !cropSelection) return;
    const { kind, file } = cropTarget;
    void editor.upload(kind, file, cropSelection).then((applied) => {
      if (!applied) return;
      setCropFiles((previous) => ({ ...previous, [kind]: file }));
      cancelCrop();
    });
  };

  return <Drawer.Root open={Boolean(draft)} onClose={editor.close} tone="surface" workspaceBound>
    <Drawer.Backdrop className="bg-ui-ink-strong/20" />
    <Drawer.Content size="full" mdPlacement="side" heightClassName="max-h-[88dvh] md:max-h-full" className="profile-edit-panel" dragToDismiss={false}>
      <div className="profile-panel-header"><IconActionButton variant="surface" label="Close edit profile" icon={<AppIcon name="close" size={18} />} onClick={editor.close} /><Drawer.Title>{cropTarget ? `Crop ${cropTarget.kind === 'avatar' ? 'photo' : 'cover'}` : 'Edit profile'}</Drawer.Title></div>
      {draft && <>
        {cropTarget ? <>
          <Drawer.Body className="profile-panel-body profile-crop-body">
            <ProfileImageCropper file={cropTarget.file} kind={cropTarget.kind} busy={editor.busy} onCropChange={setCropSelection} />
            {editor.error && <p role="alert" className="text-sm text-feedback-danger-edge">{editor.error}</p>}
          </Drawer.Body>
          <div className="profile-panel-footer flex gap-3">
            <ActionButton variant="secondary" onClick={cancelCrop} disabled={editor.busy}>Cancel</ActionButton>
            <ActionButton fullWidth className="normal-case tracking-normal text-base" onClick={applyCrop} disabled={!cropSelection || editor.busy} loading={editor.busy} loadingLabel="Preparing crop…">Use crop</ActionButton>
          </div>
        </> : <>
          <Drawer.Body className="profile-panel-body"><fieldset inert={editor.busy} className="contents">
            <section><h3>Photo</h3><div className="flex items-center gap-4">
              <ProfileAvatar name={draft.settings.displayName || name} color={draft.settings.avatarColor} image={draft.avatar} className="profile-avatar-preview" />
              {canUpload && <div className="flex flex-wrap items-center gap-2">
                <label className="profile-upload focus-ring-inline"><AppIcon name="upload" size={16} />Upload photo<input type="file" accept="image/*" className="sr-only" onChange={(e) => { chooseImage('avatar', e.target.files?.[0]); e.target.value = ''; }} /></label>
                {(draft.settings.avatarPath || editor.hasAvatarUpload) && <button type="button" onClick={() => { editor.removeAvatar(googleAvatar); setCropFiles((previous) => ({ ...previous, avatar: undefined })); }} className="focus-ring p-2 text-sm font-black text-ui-muted-strong">Remove</button>}
                {editor.hasAvatarUpload && cropFiles.avatar && <button type="button" onClick={() => chooseImage('avatar', cropFiles.avatar)} className="focus-ring p-2 text-sm font-black text-ui-muted-strong">Adjust crop</button>}
              </div>}
            </div>
            {!draft.avatar && <div className="profile-avatar-swatches">{AVATAR_COLORS.map((color) => <button type="button" key={color} aria-label={`${color} initial colour`} aria-pressed={draft.settings.avatarColor === color} style={avatarStyle(color)} onClick={() => editor.change({ avatarColor: color })}>{(draft.settings.displayName || name)[0]?.toUpperCase()}</button>)}</div>}
            </section>
            <section><h3>Cover</h3><div className="profile-cover-swatches">
              {COVER_PRESETS.map((preset) => <button type="button" key={preset} aria-label={`${preset} cover`} aria-pressed={!draft.cover && draft.settings.coverPreset === preset} style={coverStyle(preset)} onClick={() => { editor.chooseCover(preset); setCropFiles((previous) => ({ ...previous, cover: undefined })); }}>{preset !== 'plain' && <CoverGlyphs />}</button>)}
              {draft.cover && <div className="profile-uploaded-cover" aria-label="Your cover image" style={coverStyle(draft.settings.coverPreset, draft.cover)} />}
              {canUpload && <label className="profile-cover-upload focus-ring-inline"><AppIcon name="upload" size={16} />Upload<input type="file" accept="image/*" className="sr-only" onChange={(e) => { chooseImage('cover', e.target.files?.[0]); e.target.value = ''; }} /></label>}
            </div>
            {editor.hasCoverUpload && cropFiles.cover && <button type="button" onClick={() => chooseImage('cover', cropFiles.cover)} className="focus-ring mt-2 p-2 text-sm font-black text-ui-muted-strong">Adjust crop</button>}
            </section>
            <section><label htmlFor="profile-name" className="profile-field-label">Name</label><input id="profile-name" className="profile-name-input" value={draft.settings.displayName} maxLength={30} autoComplete="off" onChange={(e) => editor.change({ displayName: e.target.value })} /></section>
            {editor.error && <p role="alert" className="text-sm text-feedback-danger-edge">{editor.error}</p>}
          </fieldset></Drawer.Body>
          <div className="profile-panel-footer">{editor.busy ? <p role="status" className="py-3 text-center font-black">Saving image…</p> : <ActionButton fullWidth className="normal-case tracking-normal text-base" onClick={() => void editor.save()}>Save</ActionButton>}</div>
        </>}
      </>}
    </Drawer.Content>
  </Drawer.Root>;
}
