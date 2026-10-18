import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/useAppStore';
import { StickyWorkspaceHeader, type StickyWorkspaceHeaderMenuToggle } from '../../lib/widgets';
import { SAMPLE_BOOKS } from '../../data/books';
import { ProfileHeroCard } from './components/ProfileHeroCard';
import { ProfileSkeleton } from './components/ProfileSkeleton';
import { SignOutButton } from './components/SignOutButton';
import { EditProfilePanel } from './components/EditProfilePanel';
import { ProfileMixups, ProfileStatistics, ProfileStreak, ProfileTopics } from './components/ProfileLearning';
import { useProfileData } from './hooks/useProfileData';
import { useProfileMedia } from './hooks/useProfileMedia';
import { useProfileEditor } from './hooks/useProfileEditor';
import './profile.css';

export function ProfileScreen({ menuToggle }: { menuToggle?: StickyWorkspaceHeaderMenuToggle }) {
  const { currentUser, isLoading, logout, isAuthActionLoading } = useAuth();
  const [accountError, setAccountError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const userSnapshot = useAppStore((s) => s.currentUser);
  const profile = useAppStore(useShallow((s) => ({ displayName: s.displayName, avatarColor: s.avatarColor, coverPreset: s.coverPreset, avatarPath: s.avatarPath, coverPath: s.coverPath })));
  const bookId = useAppStore((s) => s.activeBookId);
  const syncError = useAppStore((s) => s.syncError);
  const data = useProfileData();
  const media = useProfileMedia(currentUser?.id, profile.avatarPath, profile.coverPath, revision);
  const editor = useProfileEditor(currentUser?.id, () => setRevision((value) => value + 1));
  const emailPrefix = currentUser?.email?.split('@')[0];
  const fallbackName = userSnapshot?.fullName || userSnapshot?.name || emailPrefix || 'Learner';
  const shownProfile = editor.draft?.settings ?? profile;
  const name = shownProfile.displayName || fallbackName;
  const googleAvatar = userSnapshot?.avatarUrl || userSnapshot?.avatar_url;
  const avatar = editor.draft ? editor.draft.avatar : media.avatar || googleAvatar;
  const cover = editor.draft ? editor.draft.cover : media.cover;
  const book = SAMPLE_BOOKS.find((item) => item.id === bookId);
  const handleSignOut = async () => {
    setAccountError(null);
    try { await logout(); }
    catch { setAccountError("Couldn't sign you out. Check your connection and try again."); }
  };
  return <div className="profile-screen relative flex w-full flex-1 flex-col text-ui-ink-strong">
    <StickyWorkspaceHeader className="profile-header" title="Profile" menuToggle={menuToggle} />
    {isLoading ? <div className="mx-auto w-full max-w-3xl px-4"><ProfileSkeleton /></div> :
      <div className="profile-layout">
        <div className="profile-main">
          <ProfileHeroCard profile={shownProfile} name={name} handle={emailPrefix ? `@${emailPrefix}` : undefined} firstReview={data.firstReview} bookTitle={book?.title || `Modern Chinese ${bookId}`} avatar={avatar} cover={cover} onEdit={() => editor.open({ ...profile, displayName: profile.displayName || fallbackName }, media.avatar || googleAvatar, media.cover)} />
          {(accountError || syncError) && <p role="alert" className="text-sm text-feedback-danger-edge">{accountError || syncError}</p>}
          <div className="profile-mobile-streak"><ProfileStreak data={data} /></div>
          <ProfileStatistics data={data} />
          <ProfileTopics data={data} />
          <div className="profile-mobile-mixups"><ProfileMixups data={data} /></div>
          {currentUser && <SignOutButton onSignOut={handleSignOut} isSigningOut={isAuthActionLoading} />}
        </div>
        <aside className="profile-side"><ProfileStreak data={data} /><ProfileMixups data={data} /></aside>
      </div>}
    <EditProfilePanel editor={editor} name={fallbackName} canUpload={Boolean(currentUser)} googleAvatar={googleAvatar} />
  </div>;
}
