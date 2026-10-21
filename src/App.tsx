import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router';
import { LoadingScreen } from './lib/widgets/LoadingScreen';
import { useAuth } from './hooks/useAuth';
import { legalPageFromPathname } from './app/routes';
import { SignInWindow } from './screens/auth';

const AppShell = lazy(() => import('./app/AppShell'));
const LegalScreen = lazy(() => import('./screens/legal').then((m) => ({ default: m.LegalScreen })));

/** Auth and legal pages never load the study workspace or start cloud sync. */
export default function App() {
  const legalPage = legalPageFromPathname(useLocation().pathname);
  return <Suspense fallback={<LoadingScreen message="Loading Ron's Mandarin…" fullScreen />}>
    {legalPage ? <LegalScreen page={legalPage} /> : <AuthenticatedWorkspace />}
  </Suspense>;
}

function AuthenticatedWorkspace() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Loading Ron's Mandarin…" fullScreen />;
  if (!currentUser && !import.meta.env.DEV) return <SignInWindow />;
  return <AppShell />;
}
