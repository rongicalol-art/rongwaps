import dictionaryHeroLandscape from '../../../assets/images/dictionary-hero-mountains.webp';
import { Card3D, SearchBar3D } from '../../../lib/widgets';

interface DictionaryHeroProps {
  onSearch: (query: string) => void;
}

export function DictionaryHero({ onSearch }: DictionaryHeroProps) {
  return (
    <div className="mb-[42px] sm:mb-[46px]">
      <Card3D
        depth="lg"
        edgeColor="border-ui-border"
        className="h-[230px] overflow-visible bg-brand-primary/10 bg-[length:auto_68%] bg-[position:70%_24px] bg-no-repeat p-0 shadow-none sm:h-[250px] sm:bg-cover sm:bg-top lg:h-[270px] xl:h-[280px]"
        style={{ backgroundImage: `url(${dictionaryHeroLandscape})` }}
      >
        <div className="relative flex h-full items-start overflow-hidden rounded-[21px] px-4 pb-12 pt-7 sm:px-7 sm:pt-9">
          <div className="relative z-10 max-w-[78%] rounded-[18px] bg-white p-3 sm:max-w-[60%] sm:bg-transparent sm:p-0">
            <p className="mb-3 inline-flex rounded-[10px] bg-feedback-warning px-3 py-1 text-[10px] font-black uppercase text-ui-ink sm:text-[11px]">
              Chinese dictionary
            </p>
            <h2 className="max-w-[540px] text-[clamp(24px,3vw,36px)] font-black leading-[1.04] text-ui-ink-strong">
              Find the Chinese you need
            </h2>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-0 z-20 translate-y-1/2 sm:inset-x-7">
          <SearchBar3D
            placeholder="Type a character, pinyin, or English..."
            onSubmit={onSearch}
            showSubmit={false}
            className="mx-auto max-w-[1080px] border-ui-border"
            aria-label="Search the Chinese dictionary"
          />
        </div>
      </Card3D>
    </div>
  );
}
