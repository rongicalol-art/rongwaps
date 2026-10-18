import { AppIcon, IconActionButton } from '../../../lib/widgets';
import type { ProfileSettings } from '../../../store/slices/profileSlice';
import { CoverGlyphs, coverStyle, ProfileAvatar } from './ProfileAppearance';

export function ProfileHeroCard({ profile, name, handle, firstReview, bookTitle, avatar, cover, onEdit }: {
  profile: ProfileSettings; name: string; handle?: string; firstReview: string | null;
  bookTitle: string; avatar?: string; cover?: string; onEdit: () => void;
}) {
  return <section className="profile-hero">
    <div className="profile-cover" style={coverStyle(profile.coverPreset, cover)}>
      {!cover && profile.coverPreset !== 'plain' && <CoverGlyphs />}
      <IconActionButton
        variant="surface"
        icon={<AppIcon name="pencil" size={18} />}
        label="Edit profile"
        onClick={onEdit}
        className="absolute right-3.5 top-3.5 text-ui-muted-strong hover:text-ui-ink-strong"
      />
    </div>
    <div className="profile-identity">
      <button type="button" className="relative shrink-0 rounded-full focus-ring" onClick={onEdit} aria-label="Edit photo">
        <ProfileAvatar name={name} color={profile.avatarColor} image={avatar} />
        <span className="profile-camera"><AppIcon name="camera" size={16} /></span>
      </button>
      <div className="profile-who">
        <div className="min-w-0"><h1>{name}</h1><p>{handle}{handle && firstReview ? ' · ' : ''}{firstReview && `learning since ${firstReview}`}</p></div>
        <span className="profile-book"><i aria-hidden="true" />{bookTitle}</span>
      </div>
    </div>
  </section>;
}
