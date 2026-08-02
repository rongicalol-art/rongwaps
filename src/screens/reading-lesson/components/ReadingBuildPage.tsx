import type { ChangeEvent } from 'react';
import { ActionButton, AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import type { InteractiveReadingPart, ReadingLessonChoice } from '../../../types/models';

interface ReadingBuildPageProps {
  part: InteractiveReadingPart;
  characterPreference: 'traditional' | 'simplified';
  name: string;
  countryId: string;
  likeId: string;
  foodId: string;
  drinkId: string;
  onNameChange: (name: string) => void;
  onCountryChange: (id: string) => void;
  onLikeChange: (id: string) => void;
  onFoodChange: (id: string) => void;
  onDrinkChange: (id: string) => void;
}

interface ChoiceFieldProps {
  label: string;
  value: string;
  choices: ReadingLessonChoice[];
  onChange: (id: string) => void;
}

function ChoiceField({ label, value, choices, onChange }: ChoiceFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.06em] text-ui-muted">{label}</span>
      <select
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        className="h-12 w-full rounded-[15px] border-2 border-ui-border bg-ui-surface px-3 font-chinese text-base font-bold text-ui-ink outline-none transition focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15"
      >
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>{choice.traditional} · {choice.english}</option>
        ))}
      </select>
    </label>
  );
}

export function buildIntroduction(
  part: InteractiveReadingPart,
  characterPreference: 'traditional' | 'simplified',
  name: string,
  countryId: string,
  likeId: string,
  foodId: string,
  drinkId: string,
) {
  const pick = (choices: ReadingLessonChoice[], id: string) => choices.find((choice) => choice.id === id) ?? choices[0];
  const text = (choice: ReadingLessonChoice) => characterPreference === 'simplified' ? choice.simplified : choice.traditional;
  const country = pick(part.countries, countryId);
  const like = pick(part.likes, likeId);
  const food = pick(part.foods, foodId);
  const drink = pick(part.drinks, drinkId);
  const safeName = name.trim() || '友美';

  return `大家好！我叫${safeName}，我是${text(country)}人。我喜歡${text(like)}。我愛吃${text(food)}，愛喝${text(drink)}。謝謝大家！`;
}

export function ReadingBuildPage({
  part,
  characterPreference,
  name,
  countryId,
  likeId,
  foodId,
  drinkId,
  onNameChange,
  onCountryChange,
  onLikeChange,
  onFoodChange,
  onDrinkChange,
}: ReadingBuildPageProps) {
  const introduction = buildIntroduction(part, characterPreference, name, countryId, likeId, foodId, drinkId);

  return (
    <section className="mx-auto w-full max-w-5xl" aria-labelledby="build-title">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-primary">Make it yours</p>
      <h2 id="build-title" className="mt-1 text-[28px] font-black leading-tight text-ui-ink-strong sm:text-[36px]">Build your first introduction</h2>
      <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-ui-muted sm:text-base">
        Choose only what you are comfortable sharing. This stays on your device as your private practice copy.
      </p>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
        <div className="rounded-[20px] border border-ui-divider bg-ui-surface p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.06em] text-ui-muted">Given name or nickname</span>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              maxLength={20}
              placeholder="友美"
              className="h-12 w-full rounded-[15px] border-2 border-ui-border bg-ui-canvas px-3 font-chinese text-base font-bold text-ui-ink outline-none transition placeholder:text-ui-muted focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15"
            />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <ChoiceField label="I am from" value={countryId} choices={part.countries} onChange={onCountryChange} />
            <ChoiceField label="I like" value={likeId} choices={part.likes} onChange={onLikeChange} />
            <ChoiceField label="I love eating" value={foodId} choices={part.foods} onChange={onFoodChange} />
            <ChoiceField label="I love drinking" value={drinkId} choices={part.drinks} onChange={onDrinkChange} />
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border-2 border-brand-primary bg-ui-surface">
          <div className="flex items-center justify-between gap-4 bg-[#EAF7FF] px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-brand-primary">My introduction</p>
              <p className="mt-0.5 text-sm font-black text-ui-ink">Ready to rehearse</p>
            </div>
            <span className="rounded-full bg-brand-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.07em] text-white">Private</span>
          </div>
          <div className="px-5 py-6 sm:px-7 sm:py-8">
            <p className="font-chinese text-[24px] font-bold leading-[1.9] text-ui-ink-strong sm:text-[28px]">{introduction}</p>
            <ActionButton
              variant="secondary"
              onClick={() => audioService.speakText(introduction, characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN', 0.78)}
              className="mt-6 border-brand-primary text-brand-primary hover:bg-brand-primary/10"
            >
              <AppIcon name="audio" size={18} />
              Hear my introduction
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  );
}
