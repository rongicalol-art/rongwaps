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
