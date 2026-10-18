import { AppIcon } from '../../../lib/widgets';
import { SAMPLE_LESSONS } from '../../../data/books';
import { LESSON_LANDSCAPE_ART } from '../../../data/lessonLandscapeArt';
import type { useProfileData } from '../hooks/useProfileData';
export const flameArt = new URL('../../../assets/icons/flat/flame.svg', import.meta.url).href;
const wordsArt = new URL('../../../assets/icons/flat/profile-words.svg', import.meta.url).href;
const charactersArt = new URL('../../../assets/icons/flat/profile-characters.svg', import.meta.url).href;
const reviewsArt = new URL('../../../assets/icons/flat/profile-reviews.svg', import.meta.url).href;
const grammarArt = new URL('../../../assets/icons/flat/profile-grammar.svg', import.meta.url).href;
type Data = ReturnType<typeof useProfileData>;

export function ProfileStatistics({ data }: { data: Data }) {
  const tiles = [
    [<img key="words" src={wordsArt} alt="" />, data.known, 'Words known'],
    [<img key="characters" src={charactersArt} alt="" />, data.loading || data.failed ? '—' : data.characters, 'Characters'],
    [<img key="reviews" src={reviewsArt} alt="" />, data.reviews, 'Reviews done'],
    [<img key="grammar" src={grammarArt} alt="" />, data.grammarPages, 'Grammar points'],
  ];
  return <section><h2 className="profile-section-title">Statistics</h2><div className="profile-stats">
    {tiles.map(([icon, value, label]) => <div className="profile-stat" key={String(label)}>{icon}<div><b>{value}</b><span>{label}</span></div></div>)}
  </div></section>;
}
export function ProfileTopics({ data }: { data: Data }) {
  return <section><h2 className="profile-section-title">Topics</h2>
    {data.loading ? <p className="text-ui-muted" role="status">Loading topics…</p> : data.failed ? <div role="alert">Couldn’t load vocabulary. <button type="button" className="focus-ring underline" onClick={data.retry}>Retry</button></div> :
      <div className="profile-topics">{Object.entries(data.progress).map(([id, progress]) => {
        const lesson = SAMPLE_LESSONS.find((item) => item.id === Number(id));
        return <div className="profile-topic" key={id}>
          <img src={LESSON_LANDSCAPE_ART[Number(id)]} alt="" />
          <b>{lesson?.title.split(' · ')[0] ?? `Lesson ${id}`}</b>
          <span>{progress.known} of {progress.total} words</span>
          {progress.known === progress.total ? <span className="profile-all-known"><AppIcon name="check" size={14} />All known</span> :
            <span className="profile-progress" role="progressbar" aria-label={`${lesson?.label ?? id} words known`} aria-valuenow={progress.known} aria-valuemin={0} aria-valuemax={progress.total}><i style={{ width: `${progress.known / progress.total * 100}%` }} /></span>}
        </div>;
      })}</div>}
  </section>;
}
export function ProfileStreak({ data }: { data: Data }) {
  return <section className="profile-card profile-streak" aria-label="Study streak">
    <div className="profile-streak-top"><img src={flameArt} alt="" /><b>{data.streak}</b><div><span>day streak</span><small>{data.studiedToday ? 'Kept today' : `Review today to make it ${data.streak + 1}`}</small></div></div>
    <div className="profile-week">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) =>
      <div key={day} className={`profile-day ${data.week[i] ? 'studied' : ''} ${data.todayIndex === i ? 'today' : ''}`} aria-label={`${day}${data.week[i] ? ', studied' : ''}${data.todayIndex === i ? ', today' : ''}`}>
        <i>{data.week[i] && <AppIcon name="check" size={16} />}</i>{day[0]}
      </div>)}</div>
  </section>;
}
export function ProfileMixups({ data }: { data: Data }) {
  const content = data.loading ? (
    <p role="status" className="text-sm font-extrabold text-ui-muted-strong">Loading mix-ups…</p>
  ) : data.failed ? (
    <p role="alert" className="text-sm font-extrabold text-ui-muted-strong">
      Couldn’t load mix-ups. <button type="button" className="focus-ring underline" onClick={data.retry}>Retry</button>
    </p>
  ) : data.pairs.length === 0 ? (
    <p className="text-sm font-extrabold text-ui-muted-strong">No mix-ups yet</p>
  ) : data.pairs.map(([a, b]) => (
    <div className="profile-pair" key={`${a}:${b}`}>
      <div><span className="profile-hanzi">{data.forms.get(a)}</span><span className="profile-meaning">{data.vocabById.get(a)?.meaning}</span></div>
      <span className="profile-vs">vs</span>
      <div><span className="profile-hanzi">{data.forms.get(b)}</span><span className="profile-meaning">{data.vocabById.get(b)?.meaning}</span></div>
    </div>
  ));

  return (
    <section className="profile-card profile-mixups">
      <h2>Words you mix up</h2>
      {content}
    </section>
  );
}
