import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router';
import { LoadingScreen } from './lib/widgets/LoadingScreen';
import { useAuth } from './hooks/useAuth';
import { TAB_ROUTES, grammarPageSlugFromPathname, guidePageFromPathname, legalPageFromPathname, lessonPageFromPathname, wordListFromPathname } from './app/routes';
import { LazyLandingPage } from './screens/landing/LazyLandingPage';
import { hasLessonReturn } from './utils/browser/lessonReturn';
import { hasWordListReturn } from './utils/browser/wordListReturn';
import { takeFolderReturn } from './utils/browser/shareLink';

const AppShell = lazy(() => import('./app/AppShell'));
const GuideScreen = lazy(() => import('./screens/guides').then((m) => ({ default: m.GuideScreen })));
const LessonPageScreen = lazy(() => import('./screens/lesson-page').then((m) => ({ default: m.LessonPageScreen })));
const GrammarPageScreen = lazy(() => import('./screens/grammar-page').then((m) => ({ default: m.GrammarPageScreen })));
const WordListScreen = lazy(() => import('./screens/word-list').then((m) => ({ default: m.WordListScreen })));
const LegalScreen = lazy(() => import('./screens/legal').then((m) => ({ default: m.LegalScreen })));
const AgeCheck = lazy(() => import('./screens/auth').then((m) => ({ default: m.AgeCheck })));
const JoinFolderSignIn = lazy(() => import('./screens/join-folder/JoinFolderSignIn').then((m) => ({ default: m.JoinFolderSignIn })));

/** Auth and legal pages never load the study workspace or start cloud sync. */
export default function App() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!currentUser) return;
    const path = takeFolderReturn();
    if (path) navigate(path, { replace: true });
    // Back from sign-in started on a lesson page: Learn opens that lesson (CurriculumLibrary).
    else if (location.pathname === '/' && hasLessonReturn()) navigate(TAB_ROUTES.path, { replace: true });
    // Back from sign-in started on a word list: Library saves the list into a folder (useWordListImport).
    else if (location.pathname === '/' && hasWordListReturn()) navigate(TAB_ROUTES.library, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per sign-in, not on every navigation
  }, [currentUser, navigate]);

  return <Suspense fallback={<LoadingScreen message="Loading Ron's Mandarin…" fullScreen />}>
    <Routes>
      <Route path="/join/:id" element={<JoinFolderEntry />} />
      <Route path="*" element={<RegularApp pathname={location.pathname} />} />
    </Routes>
  </Suspense>;
}

function JoinFolderEntry() {
  const { id = '' } = useParams();
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Opening shared folder…" fullScreen />;
  if (!currentUser) return <JoinFolderSignIn code={id} />;
  return <SignedInApp />;
}

function RegularApp({ pathname }: { pathname: string }) {
  const guidePage = guidePageFromPathname(pathname);
  if (guidePage) return <GuideScreen page={guidePage} />;
  const lessonPage = lessonPageFromPathname(pathname);
  if (lessonPage) return <LessonPageScreen {...lessonPage} />;
  const grammarSlug = grammarPageSlugFromPathname(pathname);
  if (grammarSlug) return <GrammarPageScreen slug={grammarSlug} />;
  const wordList = wordListFromPathname(pathname);
  if (wordList) return <WordListScreen {...wordList} />;
  const legalPage = legalPageFromPathname(pathname);
  return legalPage ? <LegalScreen page={legalPage} /> : <AuthenticatedWorkspace />;
}

function AuthenticatedWorkspace() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen message="Loading Ron's Mandarin…" fullScreen />;
  if (!currentUser && !import.meta.env.DEV) return <LazyLandingPage />;
  return <SignedInApp />;
}

/** A new public account answers the age step before the workspace (or cloud sync) starts. */
function SignedInApp() {
  const { needsAgeCheck } = useAuth();
  return needsAgeCheck ? <AgeCheck /> : <AppShell />;
}
