import { SettingsToggleRow } from '../../practice';
import { useAppStore } from '../../../store/useAppStore';
import { UsernameSetting } from './UsernameSetting';

const friends = () => import('../friendsController');

/**
 * Who can see me in Study together: Show me online, Show my profile, Username and Let classmates find me. The same
 * rows in Settings and in Edit profile, so both always show the same choices.
 */
export function StudyTogetherSettings() {
  const showOnline = useAppStore((state) => state.showOnline);
  const setShowOnline = useAppStore((state) => state.setShowOnline);
  const showProfile = useAppStore((state) => state.showProfile);
  const setShowProfile = useAppStore((state) => state.setShowProfile);
  const username = useAppStore((state) => state.socialUsername);
  // With both switches off nobody can find you, whatever this switch says.
  const visible = showOnline || showProfile;
  return <>
    <SettingsToggleRow checked={showOnline} onClick={() => setShowOnline(!showOnline)} label="Show me online" />
    <SettingsToggleRow checked={showProfile} onClick={() => setShowProfile(!showProfile)} label="Show my profile" className={username ? undefined : 'border-b-0'} />
    {username && <>
      <UsernameSetting />
      <SettingsToggleRow checked={username.findable} onClick={() => { void friends().then((module) => module.setFindable(!username.findable)); }}
        label="Let classmates find me" description={!visible ? 'Turn on Show me online or Show my profile first' : username.findable ? 'By your name or @username in Add friends' : 'Only your friends can see your profile'}
        disabled={!visible} className="border-b-0" />
    </>}
  </>;
}
