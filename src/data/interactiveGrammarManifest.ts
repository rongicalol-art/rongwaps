import { isLessonLocked } from './books';

export interface GrammarManifestPage {
  id: string;
}

export interface GrammarManifestPart {
  id: string;
  bookId: number;
  lessonId: number;
  partId: number;
  title: string;
  grammarPages: GrammarManifestPage[];
}

export const INTERACTIVE_GRAMMAR_MANIFEST: GrammarManifestPart[] = [
  {
    "id": "B1L01-P01-D01",
    "bookId": 1,
    "lessonId": 1,
    "partId": 1,
    "title": "Grammar 1–3 · Pages 38–40",
    "grammarPages": [
      {
        "id": "B1L01-G01-P38"
      },
      {
        "id": "B1L01-G02-P39"
      },
      {
        "id": "B1L01-G03-P40"
      }
    ]
  },
  {
    "id": "B1L01-P02-D02",
    "bookId": 1,
    "lessonId": 1,
    "partId": 2,
    "title": "Grammar 4–5 · Pages 44–45",
    "grammarPages": [
      {
        "id": "B1L01-G04-P44"
      },
      {
        "id": "B1L01-G05-P45"
      }
    ]
  },
  {
    "id": "B1L02-P01-D01",
    "bookId": 1,
    "lessonId": 2,
    "partId": 1,
    "title": "Grammar 1–3 · Pages 54–56",
    "grammarPages": [
      {
        "id": "B1L02-G01-P54"
      },
      {
        "id": "B1L02-G02-P55"
      },
      {
        "id": "B1L02-G03-P56"
      }
    ]
  },
  {
    "id": "B1L02-P02-D02",
    "bookId": 1,
    "lessonId": 2,
    "partId": 2,
    "title": "Grammar 4–6 · Pages 60–62",
    "grammarPages": [
      {
        "id": "B1L02-G04-P60"
      },
      {
        "id": "B1L02-G05-P61"
      },
      {
        "id": "B1L02-G06-P62"
      }
    ]
  },
  {
    "id": "B1L03-P01-D01",
    "bookId": 1,
    "lessonId": 3,
    "partId": 1,
    "title": "Grammar 1–2 · Pages 73–75",
    "grammarPages": [
      {
        "id": "B1L03-G01-P73"
      },
      {
        "id": "B1L03-G02-P74"
      }
    ]
  },
  {
    "id": "B1L03-P02-D02",
    "bookId": 1,
    "lessonId": 3,
    "partId": 2,
    "title": "Grammar 3–5 · Pages 81–85",
    "grammarPages": [
      {
        "id": "B1L03-G03-P81"
      },
      {
        "id": "B1L03-G04-P82"
      },
      {
        "id": "B1L03-G05-P84"
      }
    ]
  },
  {
    "id": "B1L04-P01-D01",
    "bookId": 1,
    "lessonId": 4,
    "partId": 1,
    "title": "Grammar 1–3 · Pages 95–99",
    "grammarPages": [
      {
        "id": "B1L04-G01-P95"
      },
      {
        "id": "B1L04-G02-P97"
      },
      {
        "id": "B1L04-G03-P98"
      }
    ]
  },
  {
    "id": "B1L04-P02-D02",
    "bookId": 1,
    "lessonId": 4,
    "partId": 2,
    "title": "Grammar 4–5 · Pages 104–107",
    "grammarPages": [
      {
        "id": "B1L04-G04-P104"
      },
      {
        "id": "B1L04-G05-P105"
      }
    ]
  },
  {
    "id": "B1L05-P01-D01",
    "bookId": 1,
    "lessonId": 5,
    "partId": 1,
    "title": "Grammar 1–3 · Pages 116–118",
    "grammarPages": [
      {
        "id": "B1L05-G01-P116"
      },
      {
        "id": "B1L05-G02-P117"
      },
      {
        "id": "B1L05-G03-P118"
      }
    ]
  },
  {
    "id": "B1L05-P02-D02",
    "bookId": 1,
    "lessonId": 5,
    "partId": 2,
    "title": "Grammar 4–5 · Pages 124–126",
    "grammarPages": [
      {
        "id": "B1L05-G04-P124"
      },
      {
        "id": "B1L05-G05-P126"
      }
    ]
  },
  {
    "id": "B1L06-P01-D01",
    "bookId": 1,
    "lessonId": 6,
    "partId": 1,
    "title": "Grammar 1–2 · Pages 135–140",
    "grammarPages": [
      {
        "id": "B1L06-G01-P135"
      },
      {
        "id": "B1L06-G02-P136"
      }
    ]
  },
  {
    "id": "B1L06-P02-D02",
    "bookId": 1,
    "lessonId": 6,
    "partId": 2,
    "title": "Grammar 3–4 · Pages 146–148",
    "grammarPages": [
      {
        "id": "B1L06-G03-P146"
      },
      {
        "id": "B1L06-G04-P147"
      }
    ]
  },
  {
    "id": "B1L07-P01-D01",
    "bookId": 1,
    "lessonId": 7,
    "partId": 1,
    "title": "Grammar 1–3 · Routes and changing situations",
    "grammarPages": [
      {
        "id": "B1L07-G01-P158"
      },
      {
        "id": "B1L07-G02-P160"
      },
      {
        "id": "B1L07-G03-P162"
      }
    ]
  },
  {
    "id": "B1L07-P02-D02",
    "bookId": 1,
    "lessonId": 7,
    "partId": 2,
    "title": "Grammar 4–5 · Topics and paired qualities",
    "grammarPages": [
      {
        "id": "B1L07-G04-P170"
      },
      {
        "id": "B1L07-G05-P172"
      }
    ]
  },
  {
    "id": "B1L08-P01-D01",
    "bookId": 1,
    "lessonId": 8,
    "partId": 1,
    "title": "Grammar 1–2 · Evaluate and explain",
    "grammarPages": [
      {
        "id": "B1L08-G01-P185"
      },
      {
        "id": "B1L08-G02-P186"
      }
    ]
  },
  {
    "id": "B1L08-P02-D02",
    "bookId": 1,
    "lessonId": 8,
    "partId": 2,
    "title": "Grammar 3–5 · Confirm, try, and act soon",
    "grammarPages": [
      {
        "id": "B1L08-G03-P193"
      },
      {
        "id": "B1L08-G04-P194"
      },
      {
        "id": "B1L08-G05-P195"
      }
    ]
  },
  {
    "id": "B1L09-P01-D01",
    "bookId": 1,
    "lessonId": 9,
    "partId": 1,
    "title": "Grammar 1–3 · Live actions and study plans",
    "grammarPages": [
      {
        "id": "B1L09-G01-P205"
      },
      {
        "id": "B1L09-G02-P206"
      },
      {
        "id": "B1L09-G03-P207"
      }
    ]
  },
  {
    "id": "B1L09-P02-D02",
    "bookId": 1,
    "lessonId": 9,
    "partId": 2,
    "title": "Grammar 4–5 · Possibility and comparison",
    "grammarPages": [
      {
        "id": "B1L09-G04-P213"
      },
      {
        "id": "B1L09-G05-P216"
      }
    ]
  },
  {
    "id": "B1L10-P01-D01",
    "bookId": 1,
    "lessonId": 10,
    "partId": 1,
    "title": "Grammar 1–3 · People, descriptions, and care advice",
    "grammarPages": [
      {
        "id": "B1L10-G01-P226"
      },
      {
        "id": "B1L10-G02-P228"
      },
      {
        "id": "B1L10-G03-P231"
      }
    ]
  },
  {
    "id": "B1L10-P02-D02",
    "bookId": 1,
    "lessonId": 10,
    "partId": 2,
    "title": "Grammar 4–5 · Future care and if–then plans",
    "grammarPages": [
      {
        "id": "B1L10-G04-P236"
      },
      {
        "id": "B1L10-G05-P237"
      }
    ]
  },
  {
    "id": "B1L11-P01-D01",
    "bookId": 1,
    "lessonId": 11,
    "partId": 1,
    "title": "Grammar 1–3 · Completed, unfinished, and focused past events",
    "grammarPages": [
      {
        "id": "B1L11-G01-P247"
      },
      {
        "id": "B1L11-G02-P249"
      },
      {
        "id": "B1L11-G03-P251"
      }
    ]
  },
  {
    "id": "B1L11-P02-D02",
    "bookId": 1,
    "lessonId": 11,
    "partId": 2,
    "title": "Grammar 4–5 · Waiting, sequencing, and receivers",
    "grammarPages": [
      {
        "id": "B1L11-G04-P257"
      },
      {
        "id": "B1L11-G05-P259"
      }
    ]
  },
  {
    "id": "B1L12-P01-D01",
    "bookId": 1,
    "lessonId": 12,
    "partId": 1,
    "title": "Grammar 1–3 · Tools, timelines, and work relationships",
    "grammarPages": [
      {
        "id": "B1L12-G01-P271"
      },
      {
        "id": "B1L12-G02-P272"
      },
      {
        "id": "B1L12-G03-P281"
      }
    ]
  },
  {
    "id": "B1L12-P02-D02",
    "bookId": 1,
    "lessonId": 12,
    "partId": 2,
    "title": "Grammar 4–5 · Experience and life moments",
    "grammarPages": [
      {
        "id": "B1L12-G04-P282"
      },
      {
        "id": "B1L12-G05-P284"
      }
    ]
  },
  {
    "id": "B1L13-P01-D01",
    "bookId": 1,
    "lessonId": 13,
    "partId": 1,
    "title": "Grammar 1–3 · Quick actions, directions, and route results",
    "grammarPages": [
      {
        "id": "B1L13-G01-P295"
      },
      {
        "id": "B1L13-G02-P296"
      },
      {
        "id": "B1L13-G03-P297"
      }
    ]
  },
  {
    "id": "B1L13-P02-D02",
    "bookId": 1,
    "lessonId": 13,
    "partId": 2,
    "title": "Grammar 4–5 · Countdown and duration",
    "grammarPages": [
      {
        "id": "B1L13-G04-P303"
      },
      {
        "id": "B1L13-G05-P304"
      }
    ]
  },
  {
    "id": "B1L14-P01-D01",
    "bookId": 1,
    "lessonId": 14,
    "partId": 1,
    "title": "Grammar 1–2 · A finished time and a time that reaches now",
    "grammarPages": [
      {
        "id": "B1L14-G01-P319"
      },
      {
        "id": "B1L14-G02-P322"
      }
    ]
  },
  {
    "id": "B1L14-P02-D02",
    "bookId": 1,
    "lessonId": 14,
    "partId": 2,
    "title": "Grammar 3 · Compare two sides with 比",
    "grammarPages": [
      {
        "id": "B1L14-G03-P331"
      }
    ]
  },
  {
    "id": "B1L15-P01-R01",
    "bookId": 1,
    "lessonId": 15,
    "partId": 1,
    "title": "Grammar 1 · Compare with 跟…(不)一樣",
    "grammarPages": [
      {
        "id": "B1L15-G01"
      }
    ]
  },
  {
    "id": "B1L15-P02-R02",
    "bookId": 1,
    "lessonId": 15,
    "partId": 2,
    "title": "Grammar 2 · Describe Ongoing States with 著",
    "grammarPages": [
      {
        "id": "B1L15-G02"
      }
    ]
  },
  {
    "id": "B1L15-P03-R03",
    "bookId": 1,
    "lessonId": 15,
    "partId": 3,
    "title": "Grammar 3 · Immediate Sequence with 一……就……",
    "grammarPages": [
      {
        "id": "B1L15-G03"
      }
    ]
  },
  {
    "id": "B1L16-P01-R01",
    "bookId": 1,
    "lessonId": 16,
    "partId": 1,
    "title": "Grammar 1 · Distances with 離",
    "grammarPages": [
      {
        "id": "B1L16-G01"
      }
    ]
  },
  {
    "id": "B1L16-P02-R02",
    "bookId": 1,
    "lessonId": 16,
    "partId": 2,
    "title": "Grammar 2–5 · Changes, Comparatives, Sequences, and Complements",
    "grammarPages": [
      {
        "id": "B1L16-G02"
      },
      {
        "id": "B1L16-G03"
      },
      {
        "id": "B1L16-G04"
      },
      {
        "id": "B1L16-G05"
      }
    ]
  },
  {
    "id": "B2L01-P01-D01",
    "bookId": 2,
    "lessonId": 1,
    "partId": 1,
    "title": "Grammar 1–4 · Meeting New Friends",
    "grammarPages": [
      {
        "id": "B2L01-G01-P30"
      },
      {
        "id": "B2L01-G02-P31"
      },
      {
        "id": "B2L01-G03-P32"
      },
      {
        "id": "B2L01-G04-P32"
      }
    ]
  },
  {
    "id": "B2L01-P02-D02",
    "bookId": 2,
    "lessonId": 1,
    "partId": 2,
    "title": "Grammar 5–9 · The First Time They Met",
    "grammarPages": [
      {
        "id": "B2L01-G05-P38"
      },
      {
        "id": "B2L01-G06-P38"
      },
      {
        "id": "B2L01-G07-P39"
      },
      {
        "id": "B2L01-G08-P40"
      },
      {
        "id": "B2L01-G09-P41"
      }
    ]
  },
  {
    "id": "B2L02-P01-D01",
    "bookId": 2,
    "lessonId": 2,
    "partId": 1,
    "title": "Grammar 1–9 · I Have to Do Housework",
    "grammarPages": [
      {
        "id": "B2L02-G01-P51"
      },
      {
        "id": "B2L02-G02-P51"
      },
      {
        "id": "B2L02-G03-P52"
      },
      {
        "id": "B2L02-G04-P53"
      },
      {
        "id": "B2L02-G05-P54"
      },
      {
        "id": "B2L02-G06-P54"
      },
      {
        "id": "B2L02-G07-P55"
      },
      {
        "id": "B2L02-G08-P56"
      },
      {
        "id": "B2L02-G09-P56"
      }
    ]
  },
  {
    "id": "B2L02-P02-D02",
    "bookId": 2,
    "lessonId": 2,
    "partId": 2,
    "title": "Grammar 10–11 · I Want to Live in a Clean Place",
    "grammarPages": [
      {
        "id": "B2L02-G10-P62"
      },
      {
        "id": "B2L02-G11-P63"
      }
    ]
  },
  {
    "id": "B2L03-P01-D01",
    "bookId": 2,
    "lessonId": 3,
    "partId": 1,
    "title": "Grammar 1–7 · I Want to Rent a House",
    "grammarPages": [
      {
        "id": "B2L03-G01-P75"
      },
      {
        "id": "B2L03-G02-P77"
      },
      {
        "id": "B2L03-G03-P78"
      },
      {
        "id": "B2L03-G04-P79"
      },
      {
        "id": "B2L03-G05-P79"
      },
      {
        "id": "B2L03-G06-P80"
      },
      {
        "id": "B2L03-G07-P81"
      }
    ]
  },
  {
    "id": "B2L03-P02-D02",
    "bookId": 2,
    "lessonId": 3,
    "partId": 2,
    "title": "Grammar 8–9 · Renting a House Is Not Easy",
    "grammarPages": [
      {
        "id": "B2L03-G08-P86"
      },
      {
        "id": "B2L03-G09-P87"
      }
    ]
  },
  {
    "id": "B2L04-P01-D01",
    "bookId": 2,
    "lessonId": 4,
    "partId": 1,
    "title": "Grammar 1–3 · It’s Fun to Go to the Night Market",
    "grammarPages": [
      {
        "id": "B2L04-G01-P99"
      },
      {
        "id": "B2L04-G02-P100"
      },
      {
        "id": "B2L04-G03-P101"
      }
    ]
  },
  {
    "id": "B2L04-P02-D02",
    "bookId": 2,
    "lessonId": 4,
    "partId": 2,
    "title": "Grammar 4–8 · The Night Market Culture in Taiwan",
    "grammarPages": [
      {
        "id": "B2L04-G04-P108"
      },
      {
        "id": "B2L04-G05-P110"
      },
      {
        "id": "B2L04-G06-P111"
      },
      {
        "id": "B2L04-G07-P112"
      },
      {
        "id": "B2L04-G08-P113"
      }
    ]
  },
  {
    "id": "B2L05-P01-D01",
    "bookId": 2,
    "lessonId": 5,
    "partId": 1,
    "title": "Grammar 1–4 · Welcome to My House",
    "grammarPages": [
      {
        "id": "B2L05-G01-P122"
      },
      {
        "id": "B2L05-G02-P123"
      },
      {
        "id": "B2L05-G03-P124"
      },
      {
        "id": "B2L05-G04-P124"
      }
    ]
  },
  {
    "id": "B2L05-P02-D02",
    "bookId": 2,
    "lessonId": 5,
    "partId": 2,
    "title": "Grammar 5–8 · Happy Community",
    "grammarPages": [
      {
        "id": "B2L05-G05-P130"
      },
      {
        "id": "B2L05-G06-P130"
      },
      {
        "id": "B2L05-G07-P131"
      },
      {
        "id": "B2L05-G08-P132"
      }
    ]
  },
  {
    "id": "B2L06-P01-D01",
    "bookId": 2,
    "lessonId": 6,
    "partId": 1,
    "title": "Grammar 1–6 · Let’s Go to KTV to Sing!",
    "grammarPages": [
      {
        "id": "B2L06-G01-P143"
      },
      {
        "id": "B2L06-G02-P144"
      },
      {
        "id": "B2L06-G03-P145"
      },
      {
        "id": "B2L06-G04-P145"
      },
      {
        "id": "B2L06-G05-P146"
      },
      {
        "id": "B2L06-G06-P147"
      }
    ]
  },
  {
    "id": "B2L06-P02-D02",
    "bookId": 2,
    "lessonId": 6,
    "partId": 2,
    "title": "Grammar 7–8 · Taiwanese KTV Bars",
    "grammarPages": [
      {
        "id": "B2L06-G07-P153"
      },
      {
        "id": "B2L06-G08-P154"
      }
    ]
  },
  {
    "id": "B2L07-P01-D01",
    "bookId": 2,
    "lessonId": 7,
    "partId": 1,
    "title": "Grammar 1–6 · Traveling to Hualien by Train",
    "grammarPages": [
      {
        "id": "B2L07-G01-P165"
      },
      {
        "id": "B2L07-G02-P166"
      },
      {
        "id": "B2L07-G03-P166"
      },
      {
        "id": "B2L07-G04-P167"
      },
      {
        "id": "B2L07-G05-P168"
      },
      {
        "id": "B2L07-G06-P169"
      }
    ]
  },
  {
    "id": "B2L07-P02-D02",
    "bookId": 2,
    "lessonId": 7,
    "partId": 2,
    "title": "Grammar 7–8 · Online Ticket Booking",
    "grammarPages": [
      {
        "id": "B2L07-G07-P176"
      },
      {
        "id": "B2L07-G08-P176"
      }
    ]
  },
  {
    "id": "B2L08-P01-D01",
    "bookId": 2,
    "lessonId": 8,
    "partId": 1,
    "title": "Grammar 1–5 · Give Me the Stickers, please. I Want to Exchange Them for Snoopy!",
    "grammarPages": [
      {
        "id": "B2L08-G01-P188"
      },
      {
        "id": "B2L08-G02-P188"
      },
      {
        "id": "B2L08-G03-P189"
      },
      {
        "id": "B2L08-G04-P190"
      },
      {
        "id": "B2L08-G05-P191"
      }
    ]
  },
  {
    "id": "B2L08-P02-D02",
    "bookId": 2,
    "lessonId": 8,
    "partId": 2,
    "title": "Grammar 6–7 · Give Me the Stickers, please. I Want to Exchange Them for Snoopy!",
    "grammarPages": [
      {
        "id": "B2L08-G06-P197"
      },
      {
        "id": "B2L08-G07-P198"
      }
    ]
  },
  {
    "id": "B2L09-P01-D01",
    "bookId": 2,
    "lessonId": 9,
    "partId": 1,
    "title": "Grammar 1–6 · Are You Afraid of Taking Exams?",
    "grammarPages": [
      {
        "id": "B2L09-G01-P208"
      },
      {
        "id": "B2L09-G02-P209"
      },
      {
        "id": "B2L09-G03-P209"
      },
      {
        "id": "B2L09-G04-P211"
      },
      {
        "id": "B2L09-G05-P212"
      },
      {
        "id": "B2L09-G06-P212"
      }
    ]
  },
  {
    "id": "B2L09-P02-D02",
    "bookId": 2,
    "lessonId": 9,
    "partId": 2,
    "title": "Grammar 7 · Ryosuke Yamamoto’s Life of Studying Abroad",
    "grammarPages": [
      {
        "id": "B2L09-G01-P218"
      }
    ]
  },
  {
    "id": "B2L10-P01-D01",
    "bookId": 2,
    "lessonId": 10,
    "partId": 1,
    "title": "Grammar 1–4 · Let’s Go Work Out after Class!",
    "grammarPages": [
      {
        "id": "B2L10-G01-P231"
      },
      {
        "id": "B2L10-G02-P232"
      },
      {
        "id": "B2L10-G03-P232"
      },
      {
        "id": "B2L10-G04-P233"
      }
    ]
  },
  {
    "id": "B2L10-P02-D02",
    "bookId": 2,
    "lessonId": 10,
    "partId": 2,
    "title": "Grammar 1–3 · The Numerous Benefits of Sports",
    "grammarPages": [
      {
        "id": "B2L10-G01-P239"
      },
      {
        "id": "B2L10-G02-P240"
      },
      {
        "id": "B2L10-G03-P241"
      }
    ]
  },
  {
    "id": "B2L11-P01-D01",
    "bookId": 2,
    "lessonId": 11,
    "partId": 1,
    "title": "Grammar 1–5 · Which Club Would You Like to Join?",
    "grammarPages": [
      {
        "id": "B2L11-G01-P250"
      },
      {
        "id": "B2L11-G02-P252"
      },
      {
        "id": "B2L11-G03-P252"
      },
      {
        "id": "B2L11-G04-P253"
      },
      {
        "id": "B2L11-G05-P254"
      }
    ]
  },
  {
    "id": "B2L11-P02-D02",
    "bookId": 2,
    "lessonId": 11,
    "partId": 2,
    "title": "Grammar 6–7 · The Influence of Club Activities on Yamamoto Ryosuke",
    "grammarPages": [
      {
        "id": "B2L11-G06-P260"
      },
      {
        "id": "B2L11-G07-P260"
      }
    ]
  },
  {
    "id": "B2L12-P01-D01",
    "bookId": 2,
    "lessonId": 12,
    "partId": 1,
    "title": "Grammar 1–6 · A Small Clerk? A Big Boss?",
    "grammarPages": [
      {
        "id": "B2L12-G01-P271"
      },
      {
        "id": "B2L12-G02-P272"
      },
      {
        "id": "B2L12-G03-P273"
      },
      {
        "id": "B2L12-G04-P273"
      },
      {
        "id": "B2L12-G05-P274"
      },
      {
        "id": "B2L12-G06-P275"
      }
    ]
  },
  {
    "id": "B2L12-P02-D02",
    "bookId": 2,
    "lessonId": 12,
    "partId": 2,
    "title": "Grammar 7–8 · A Small Clerk? A Big Boss?",
    "grammarPages": [
      {
        "id": "B2L12-G07-P282"
      },
      {
        "id": "B2L12-G08-P283"
      }
    ]
  },
  {
    "id": "B2L13-P01-D01",
    "bookId": 2,
    "lessonId": 13,
    "partId": 1,
    "title": "Grammar 1–3 · I Want to Buy a Laptop",
    "grammarPages": [
      {
        "id": "B2L13-G01-P293"
      },
      {
        "id": "B2L13-G02-P294"
      },
      {
        "id": "B2L13-G03-P294"
      }
    ]
  },
  {
    "id": "B2L13-P02-D02",
    "bookId": 2,
    "lessonId": 13,
    "partId": 2,
    "title": "Grammar 4–6 · I Want to Buy a Laptop",
    "grammarPages": [
      {
        "id": "B2L13-G04-P301"
      },
      {
        "id": "B2L13-G05-P302"
      },
      {
        "id": "B2L13-G06-P303"
      }
    ]
  },
  {
    "id": "B2L14-P01-D01",
    "bookId": 2,
    "lessonId": 14,
    "partId": 1,
    "title": "Grammar 1–3 · Fish on the Dish, Abundance Year after Year",
    "grammarPages": [
      {
        "id": "B2L14-G01-P316"
      },
      {
        "id": "B2L14-G02-P317"
      },
      {
        "id": "B2L14-G03-P317"
      }
    ]
  },
  {
    "id": "B2L14-P02-D02",
    "bookId": 2,
    "lessonId": 14,
    "partId": 2,
    "title": "Grammar 4–8 · Here Comes the “Nian”",
    "grammarPages": [
      {
        "id": "B2L14-G04-P325"
      },
      {
        "id": "B2L14-G05-P325"
      },
      {
        "id": "B2L14-G06-P327"
      },
      {
        "id": "B2L14-G07-P328"
      },
      {
        "id": "B2L14-G08-P329"
      }
    ]
  },
  {
    "id": "B2L15-P01-D01",
    "bookId": 2,
    "lessonId": 15,
    "partId": 1,
    "title": "Grammar 1–4 · The Thing that Confucius Did Not Know",
    "grammarPages": [
      {
        "id": "B2L15-G01-P341"
      },
      {
        "id": "B2L15-G02-P342"
      },
      {
        "id": "B2L15-G03-P343"
      },
      {
        "id": "B2L15-G04-P343"
      }
    ]
  },
  {
    "id": "B2L15-P02-D02",
    "bookId": 2,
    "lessonId": 15,
    "partId": 2,
    "title": "Grammar 5 · The Thing that Confucius Did Not Know",
    "grammarPages": [
      {
        "id": "B2L15-G05-P351"
      }
    ]
  },
  {
    "id": "B2L16-P01-D01",
    "bookId": 2,
    "lessonId": 16,
    "partId": 1,
    "title": "Grammar 1–4 · Friends from All Over the World",
    "grammarPages": [
      {
        "id": "B2L16-G01-P361"
      },
      {
        "id": "B2L16-G02-P362"
      },
      {
        "id": "B2L16-G03-P363"
      },
      {
        "id": "B2L16-G04-P364"
      }
    ]
  },
  {
    "id": "B2L16-P02-D02",
    "bookId": 2,
    "lessonId": 16,
    "partId": 2,
    "title": "Grammar 5–6 · Friends from All Over the World",
    "grammarPages": [
      {
        "id": "B2L16-G05-P370"
      },
      {
        "id": "B2L16-G06-P371"
      }
    ]
  },
  {
    "id": "B3L01-P01-D01",
    "bookId": 3,
    "lessonId": 1,
    "partId": 1,
    "title": "Grammar 1–3 · My Dream",
    "grammarPages": [
      {
        "id": "B3L01-G01-P29"
      },
      {
        "id": "B3L01-G02-P30"
      },
      {
        "id": "B3L01-G03-P32"
      }
    ]
  },
  {
    "id": "B3L01-P02-D02",
    "bookId": 3,
    "lessonId": 1,
    "partId": 2,
    "title": "Grammar 4–6 · My Dream",
    "grammarPages": [
      {
        "id": "B3L01-G04-P38"
      },
      {
        "id": "B3L01-G05-P40"
      },
      {
        "id": "B3L01-G06-P42"
      }
    ]
  },
  {
    "id": "B3L02-P01-D01",
    "bookId": 3,
    "lessonId": 2,
    "partId": 1,
    "title": "Grammar 1–4 · Convenience Stores Are So Convenient",
    "grammarPages": [
      {
        "id": "B3L02-G01-P51"
      },
      {
        "id": "B3L02-G02-P52"
      },
      {
        "id": "B3L02-G03-P53"
      },
      {
        "id": "B3L02-G04-P54"
      }
    ]
  },
  {
    "id": "B3L02-P02-D02",
    "bookId": 3,
    "lessonId": 2,
    "partId": 2,
    "title": "Grammar 5–7 · Convenience Stores Are So Convenient",
    "grammarPages": [
      {
        "id": "B3L02-G05-P62"
      },
      {
        "id": "B3L02-G06-P64"
      },
      {
        "id": "B3L02-G07-P65"
      }
    ]
  },
  {
    "id": "B3L03-P01-D01",
    "bookId": 3,
    "lessonId": 3,
    "partId": 1,
    "title": "Grammar 1–4 · It Doesn't Hurt to Shop Around",
    "grammarPages": [
      {
        "id": "B3L03-G01-P78"
      },
      {
        "id": "B3L03-G02-P80"
      },
      {
        "id": "B3L03-G03-P81"
      },
      {
        "id": "B3L03-G04-P82"
      }
    ]
  },
  {
    "id": "B3L03-P02-D02",
    "bookId": 3,
    "lessonId": 3,
    "partId": 2,
    "title": "Grammar 5–6 · It Doesn't Hurt to Shop Around",
    "grammarPages": [
      {
        "id": "B3L03-G05-P88"
      },
      {
        "id": "B3L03-G06-P90"
      }
    ]
  },
  {
    "id": "B3L04-P01-D01",
    "bookId": 3,
    "lessonId": 4,
    "partId": 1,
    "title": "Grammar 1–3 · The Baby's Full Month",
    "grammarPages": [
      {
        "id": "B3L04-G01-P101"
      },
      {
        "id": "B3L04-G02-P103"
      },
      {
        "id": "B3L04-G03-P105"
      }
    ]
  },
  {
    "id": "B3L04-P02-D02",
    "bookId": 3,
    "lessonId": 4,
    "partId": 2,
    "title": "Grammar 4–7 · The Baby's Full Month",
    "grammarPages": [
      {
        "id": "B3L04-G04-P113"
      },
      {
        "id": "B3L04-G05-P114"
      },
      {
        "id": "B3L04-G06-P115"
      },
      {
        "id": "B3L04-G07-P117"
      }
    ]
  },
  {
    "id": "B3L05-P01-D01",
    "bookId": 3,
    "lessonId": 5,
    "partId": 1,
    "title": "Grammar 1–4 · Earthquakes and Typhoons",
    "grammarPages": [
      {
        "id": "B3L05-G01-P128"
      },
      {
        "id": "B3L05-G02-P130"
      },
      {
        "id": "B3L05-G03-P132"
      },
      {
        "id": "B3L05-G04-P133"
      }
    ]
  },
  {
    "id": "B3L05-P02-D02",
    "bookId": 3,
    "lessonId": 5,
    "partId": 2,
    "title": "Grammar 5–7 · Earthquakes and Typhoons",
    "grammarPages": [
      {
        "id": "B3L05-G05-P141"
      },
      {
        "id": "B3L05-G06-P143"
      },
      {
        "id": "B3L05-G07-P144"
      }
    ]
  },
  {
    "id": "B3L06-P01-D01",
    "bookId": 3,
    "lessonId": 6,
    "partId": 1,
    "title": "Grammar 1–4 · Balanced Work and Leisure",
    "grammarPages": [
      {
        "id": "B3L06-G01-P155"
      },
      {
        "id": "B3L06-G02-P157"
      },
      {
        "id": "B3L06-G03-P159"
      },
      {
        "id": "B3L06-G04-P160"
      }
    ]
  },
  {
    "id": "B3L06-P02-D02",
    "bookId": 3,
    "lessonId": 6,
    "partId": 2,
    "title": "Grammar 5–7 · Balanced Work and Leisure",
    "grammarPages": [
      {
        "id": "B3L06-G05-P167"
      },
      {
        "id": "B3L06-G06-P169"
      },
      {
        "id": "B3L06-G07-P171"
      }
    ]
  },
  {
    "id": "B3L07-P01-D01",
    "bookId": 3,
    "lessonId": 7,
    "partId": 1,
    "title": "Grammar 1–4 · Travel Decisions and Outcomes",
    "grammarPages": [
      {
        "id": "B3L07-G01-P184"
      },
      {
        "id": "B3L07-G02-P186"
      },
      {
        "id": "B3L07-G03-P187"
      },
      {
        "id": "B3L07-G04-P189"
      }
    ]
  },
  {
    "id": "B3L07-P02-D02",
    "bookId": 3,
    "lessonId": 7,
    "partId": 2,
    "title": "Grammar 5–6 · Perspective and Degree of Impact",
    "grammarPages": [
      {
        "id": "B3L07-G05-P195"
      },
      {
        "id": "B3L07-G06-P197"
      }
    ]
  },
  {
    "id": "B3L08-P01-D01",
    "bookId": 3,
    "lessonId": 8,
    "partId": 1,
    "title": "Grammar 1–3 · Clothes and Taste",
    "grammarPages": [
      {
        "id": "B3L08-G01-P210"
      },
      {
        "id": "B3L08-G02-P211"
      },
      {
        "id": "B3L08-G03-P213"
      }
    ]
  },
  {
    "id": "B3L08-P02-D02",
    "bookId": 3,
    "lessonId": 8,
    "partId": 2,
    "title": "Grammar 4–6 · Fast Fashion and Rational Choices",
    "grammarPages": [
      {
        "id": "B3L08-G04-P219"
      },
      {
        "id": "B3L08-G05-P221"
      },
      {
        "id": "B3L08-G06-P222"
      }
    ]
  },
  {
    "id": "B3L09-P01-D01",
    "bookId": 3,
    "lessonId": 9,
    "partId": 1,
    "title": "Grammar 1–4 · College and Future Prospects",
    "grammarPages": [
      {
        "id": "B3L09-G01-P235"
      },
      {
        "id": "B3L09-G02-P237"
      },
      {
        "id": "B3L09-G03-P238"
      },
      {
        "id": "B3L09-G04-P240"
      }
    ]
  },
  {
    "id": "B3L09-P02-D02",
    "bookId": 3,
    "lessonId": 9,
    "partId": 2,
    "title": "Grammar 5–7 · Education Is Meaningful Learning",
    "grammarPages": [
      {
        "id": "B3L09-G05-P247"
      },
      {
        "id": "B3L09-G06-P248"
      },
      {
        "id": "B3L09-G07-P250"
      }
    ]
  },
  {
    "id": "B3L10-P01-D01",
    "bookId": 3,
    "lessonId": 10,
    "partId": 1,
    "title": "Grammar 1–3 · Health Examinations Are Easy",
    "grammarPages": [
      {
        "id": "B3L10-G01-P262"
      },
      {
        "id": "B3L10-G02-P263"
      },
      {
        "id": "B3L10-G03-P265"
      }
    ]
  },
  {
    "id": "B3L10-P02-D02",
    "bookId": 3,
    "lessonId": 10,
    "partId": 2,
    "title": "Grammar 4–7 · Pursuing Health and Happiness",
    "grammarPages": [
      {
        "id": "B3L10-G04-P272"
      },
      {
        "id": "B3L10-G05-P274"
      },
      {
        "id": "B3L10-G06-P275"
      },
      {
        "id": "B3L10-G07-P276"
      }
    ]
  },
  {
    "id": "B3L11-P01-D01",
    "bookId": 3,
    "lessonId": 11,
    "partId": 1,
    "title": "Grammar 1–3 · Be Careful When Making Online Friends",
    "grammarPages": [
      {
        "id": "B3L11-G01-P289"
      },
      {
        "id": "B3L11-G02-P291"
      },
      {
        "id": "B3L11-G03-P292"
      }
    ]
  },
  {
    "id": "B3L11-P02-D02",
    "bookId": 3,
    "lessonId": 11,
    "partId": 2,
    "title": "Grammar 4–6 · Advantages and Disadvantages of Online Friends",
    "grammarPages": [
      {
        "id": "B3L11-G04-P299"
      },
      {
        "id": "B3L11-G05-P301"
      },
      {
        "id": "B3L11-G06-P302"
      }
    ]
  },
  {
    "id": "B3L12-P01-D01",
    "bookId": 3,
    "lessonId": 12,
    "partId": 1,
    "title": "Grammar 1–4 · Do You Have Interview Experience?",
    "grammarPages": [
      {
        "id": "B3L12-G01-P313"
      },
      {
        "id": "B3L12-G02-P314"
      },
      {
        "id": "B3L12-G03-P316"
      },
      {
        "id": "B3L12-G04-P318"
      }
    ]
  },
  {
    "id": "B3L12-P02-D02",
    "bookId": 3,
    "lessonId": 12,
    "partId": 2,
    "title": "Grammar 5–6 · My Interview Experience",
    "grammarPages": [
      {
        "id": "B3L12-G05-P325"
      },
      {
        "id": "B3L12-G06-P327"
      }
    ]
  },
  {
    "id": "B3L13-P01-D01",
    "bookId": 3,
    "lessonId": 13,
    "partId": 1,
    "title": "Grammar 1–3 · Cloud Technology Is Really Convenient",
    "grammarPages": [
      {
        "id": "B3L13-G01-P338"
      },
      {
        "id": "B3L13-G02-P339"
      },
      {
        "id": "B3L13-G03-P341"
      }
    ]
  },
  {
    "id": "B3L13-P02-D02",
    "bookId": 3,
    "lessonId": 13,
    "partId": 2,
    "title": "Grammar 4–5 · Entering the New Era of the Cloud",
    "grammarPages": [
      {
        "id": "B3L13-G04-P347"
      },
      {
        "id": "B3L13-G05-P348"
      }
    ]
  },
  {
    "id": "B3L14-P01-D01",
    "bookId": 3,
    "lessonId": 14,
    "partId": 1,
    "title": "Grammar 1–3 · The Story of the Double Seventh Festival",
    "grammarPages": [
      {
        "id": "B3L14-G01-P360"
      },
      {
        "id": "B3L14-G02-P362"
      },
      {
        "id": "B3L14-G03-P363"
      }
    ]
  },
  {
    "id": "B3L14-P02-D02",
    "bookId": 3,
    "lessonId": 14,
    "partId": 2,
    "title": "Grammar 4–5 · The Meaning of Chinese Valentine's Day",
    "grammarPages": [
      {
        "id": "B3L14-G04-P369"
      },
      {
        "id": "B3L14-G05-P371"
      }
    ]
  },
  {
    "id": "B3L15-P01-D01",
    "bookId": 3,
    "lessonId": 15,
    "partId": 1,
    "title": "Grammar 1–2 · Visit the Historic Sites in Tamsui",
    "grammarPages": [
      {
        "id": "B3L15-G01-P383"
      },
      {
        "id": "B3L15-G02-P384"
      }
    ]
  },
  {
    "id": "B3L15-P02-D02",
    "bookId": 3,
    "lessonId": 15,
    "partId": 2,
    "title": "Grammar 3–5 · Historic Sites in the Jigsaw Puzzle of History",
    "grammarPages": [
      {
        "id": "B3L15-G03-P392"
      },
      {
        "id": "B3L15-G04-P393"
      },
      {
        "id": "B3L15-G05-P395"
      }
    ]
  },
  {
    "id": "B3L16-P01-D01",
    "bookId": 3,
    "lessonId": 16,
    "partId": 1,
    "title": "Grammar 1–2 · Cherishing Food Starts with You and Me",
    "grammarPages": [
      {
        "id": "B3L16-G01-P404"
      },
      {
        "id": "B3L16-G02-P406"
      }
    ]
  },
  {
    "id": "B3L16-P02-D02",
    "bookId": 3,
    "lessonId": 16,
    "partId": 2,
    "title": "Grammar 3–5 · Xie Laoban's Food Bank",
    "grammarPages": [
      {
        "id": "B3L16-G03-P413"
      },
      {
        "id": "B3L16-G04-P415"
      },
      {
        "id": "B3L16-G05-P417"
      }
    ]
  }
];

export function getInteractiveGrammarManifestForLesson(
  bookId: number,
  lessonId: number,
): GrammarManifestPart[] {
  return INTERACTIVE_GRAMMAR_MANIFEST.filter(
    (part) => part.bookId === bookId && part.lessonId === lessonId,
  );
}

export function findNeighbourGrammarPartId(
  partId: string,
  direction: 'next' | 'previous',
  hasFullCourseAccess = false,
): string | null {
  const index = INTERACTIVE_GRAMMAR_MANIFEST.findIndex((p) => p.id === partId);
  if (index === -1) return null;
  const nextIndex = direction === 'next' ? index + 1 : index - 1;
  const neighbour = INTERACTIVE_GRAMMAR_MANIFEST[nextIndex];
  return neighbour && !isLessonLocked(neighbour.bookId, neighbour.lessonId, hasFullCourseAccess) ? neighbour.id : null;
}

export function findGrammarManifestPartForReading(reading: { bookId: number; lessonId: number; dialogueNumber?: number }): GrammarManifestPart | null {
  return INTERACTIVE_GRAMMAR_MANIFEST.find(
    (p) => p.bookId === reading.bookId && p.lessonId === reading.lessonId && p.partId === reading.dialogueNumber,
  ) ?? null;
}

export function findNextGrammarManifestPartForReading(
  reading: { bookId: number; lessonId: number; dialogueNumber?: number },
  hasFullCourseAccess = false,
): GrammarManifestPart | null {
  const part = findGrammarManifestPartForReading(reading);
  if (!part) return null;
  const index = INTERACTIVE_GRAMMAR_MANIFEST.findIndex((p) => p.id === part.id);
  if (index === -1) return null;
  const next = INTERACTIVE_GRAMMAR_MANIFEST[index + 1];
  return next && !isLessonLocked(next.bookId, next.lessonId, hasFullCourseAccess) ? next : null;
}
