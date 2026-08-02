import courseSceneDesktop from '../../../assets/images/course-library-landscape.png';
import courseSceneMobile from '../../../assets/images/course-library-mobile.png';

export function ResponsiveCourseBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 select-none">
      <picture className="block">
        <source media="(min-width: 1280px)" srcSet={courseSceneDesktop} />
        <source media="(min-width: 640px)" srcSet={courseSceneDesktop} />
        <img
          src={courseSceneMobile}
          alt=""
          className="block h-auto w-full max-w-none"
          draggable={false}
        />
      </picture>
      <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-b from-transparent via-ui-surface/70 to-ui-surface" />
    </div>
  );
}
