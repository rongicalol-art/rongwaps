import { Fragment } from 'react';

const HAN_RUN = /([⺀-⿟㐀-鿿豈-﫿]+)/u;

/** English text with its Chinese runs in the study font, so the learner's chosen font applies. */
export function HanText({ text }: { text: string }) {
  return (
    <>
      {text.split(HAN_RUN).map((run, index) => (
        index % 2 === 1 ? <span key={index} className="font-chinese font-normal">{run}</span> : <Fragment key={index}>{run}</Fragment>
      ))}
    </>
  );
}
