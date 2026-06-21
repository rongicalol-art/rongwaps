# System Architecture & UI Guidelines

# Component Organization: Separation of Concerns

As our React application grows, it becomes messy if we put all our code in "god files" like `App.tsx`. Based on our `AGENTS.md` rules, we heavily separate where our code lives depending on its "job".

## 1. The "Screens" (`src/screens/`)
These act as the "managers".
Examples: `CurriculumLibrary.tsx` or `FlashcardScreen.tsx`
- They talk to the Zustand store to get or save data.
- They decide *what* to show to the user.
- **Rule:** Screens shouldn't have hundreds of lines of complex Tailwind markup. They should delegate visual elements to Widgets.

## 2. The "Widgets" (`src/lib/widgets/`)
These are the "dumb" UI building blocks (also called presentational components or "Lego Bricks").
Examples: `Floating3DButton.tsx` or `MainHeader.tsx`
- They generally do not talk to the global store directly.
- They just take inputs (called `props` in React, like `title="Click me"`) and render it beautifully.
- They contain the heavily complex Tailwind CSS classes for animations, 3D borders, and colors.
- **Rule:** Re-use these. If you need a button, don't write `<button className="...">` from scratch. Import the widget.

## 3. The "Hooks" (`src/hooks/`)
These extract complex Javascript logic away from the UI completely.
For example, `useFlashcards.ts` handles the Spaced Repetition (SRS) math, determines if you are at the end of a deck, and calculates the next due date. 
The `FlashcardScreen.tsx` screen just calls `const { currentCard, handleNext } = useFlashcards(...)` and gets the answers instantly, keeping the UI file extremely clean and readable.


# UI Architecture: The Duolingo-Style Vibe

Our application heavily leans into the Duolingo-style UI and vibes. It doesn't look like a standard educational dashboard; it feels physical and tactile, acting as an open study tool where you can choose lessons at your own pace but still get the joy of a gamified app. Here is how we achieve that using code:

## 1. The 3D Button Effect
Traditional web buttons use shadows (`box-shadow`) for depth. We use thick bottom borders to create a chunky, physical look.
- **Normal state**: `border-2 border-b-[6px]` (creates a thick bottom ledge).
- **Active (clicked) state**: `active:border-b-[0px] active:translate-y-[6px]` (the ledge disappears and the button shape moves down, mimicking a real physical spring-loaded button being pressed).

## 2. Dynamic Theming (CSS Variables)
Notice how everything changes color when you select a different book/course?
We don't hardcode `text-blue-500` manually everywhere. Instead, we use CSS Custom Properties (CSS variables).
When you pick a book, `App.tsx` reads the book's colors from `src/data/books.ts` and sets variables on the `:root` element. For example:
- `--color-brand-accent`
- `--color-brand-text-primary`

Then, our components use Tailwind classes like `text-[var(--color-brand-text-primary)]`. This allows the exact same UI component to automatically adapt its theme instantly.

## 3. Motion & Animation
We use `framer-motion` (imported as `motion/react`) to make the app feel alive.
Look for `<motion.div>` tags in the code. We use them for:
- Bouncy pops (`type: 'spring', bounce: 0.5`)
- Smooth page transitions (fade-in, slide-up between screens)
- Expanding and collapsing cards. 
We try to avoid using generic CSS hover transitions for big UI shifts, preferring framer-motion for smooth, interrupted physics-based tracking.


# React State & Zustand: How Our App Remembers Things

In our application, we need to remember a lot of things: What book you are currently studying, how many cards you've learned, and the spaced-repetition data (SRS) for your flashcards.

## Local State vs Global State
1. **Local State (React `useState`)**: This is short-term memory. It only exists inside a specific component. For example, in the `FlashcardScreen`, we use `useState` to track if a card is currently flipped. If you close the screen or move to another part of the app, that memory is gone.
2. **Global State (Zustand)**: This is long-term memory. We use a library called `Zustand` (located in `src/store/useAppStore.ts`). It stores data that multiple screens need to access.

## Why Zustand?
When you finish learning a flashcard, your total learned cards count goes up.
- The `FlashcardScreen` needs to *update* the learned cards list.
- The `ProfileScreen` needs to *display* the total count of learned cards.
Instead of passing that data up and down complicated component trees, both components just "plug in" to the Zustand store using the `useAppStore()` hook.

## Persistence
Zustand is configured with `persist()`. This means it automatically saves your progress (like your SRS data and completed cards) to your browser's `localStorage` engine under the hood. This is why you don't lose your flashcard review progress and learned words when you refresh the page!


# Progressive Disclosure Review UI Plan

## The Concept: "Simple by Default, Powerful on Demand"
Duolingo and modern apps prioritize **reducing cognitive load**. Showing 4 SRS options (Hard, Bad, Good, Easy) on every single card slows down the user's reading flow and forces them to make a complex decision. 

However, we need those 4 options for the Spaced Repetition System (SRS) algorithm to work perfectly. 

Here is the "Duolingo-style" optimized plan:

### 1. The Default State (Tap & Fast Swipes)
When looking at the back of the card, the user only sees **Two Big Buttons**:
*   🟥 **HARD** (Red, Left)
*   🟩 **GOT IT** (Green, Right)

*Fast Actions:*
- Tapping or Swiping LEFT = "HARD" (Level 1)
- Tapping or Swiping RIGHT = "GOT IT" (Level 3 - "Good")

This binary choice is highly satisfying, instinctual, and lets the user breeze through cards they clearly know or don't know without overthinking.

### 2. The Drag State (Precision Dropping)
The moment the user puts their finger on the card and begins **dragging it**, the UI transforms.
Framer Motion will smoothly transition the 2 big buttons into the 4 precise SRS buckets:
*   [ HARD ] [ BAD ] [ GOOD ] [ EASY ]

Because the user is already dragging the card, dropping it into one of these 4 specific buckets feels like a satisfying physical action (like sorting files). 

### 3. Visual Execution
- **Layout Animations**: We will use framer-motion's `<AnimatePresence mode="wait">` or `layout` properties. So when `isDragging` becomes true, the Two-Button layout crossfades/morphs into the Four-Button layout instantly.
- **Color Coding**: 
  - HARD (Red)
  - BAD (Orange)
  - GOOD (Blue or Light Green)
  - EASY / GOT IT (Bright Green)

## Why this is the best approach:
1. **Speed:** 90% of the time, users just want to say "I know this" or "I don't". The 2 buttons accommodate this perfectly.
2. **Satisfaction:** The physical dropping of a card into 4 distinct sorting bins is engaging and gamified.
3. **Clean UI:** The screen isn't cluttered with 4 different colored buttons all the time.

***

*(Note: We will implement this inside FlashcardScreen.tsx by conditionally rendering the button arrays based on the `isDragging` state from the DraggableFlashcard component).*


# How Spaced Repetition (SRS) Works

When you learn something new, your brain starts forgetting it almost immediately. This is famously known as the "Ebbinghaus Forgetting Curve."

Spaced Repetition Systems (SRS) are algorithms that predict *when* you are mathematically about to forget a piece of information, and schedule a review exactly at that moment. The goal is to maximize long-term retention while minimizing study time.

## The Process in Our App

### 1. Learning a New Card
When you first encounter a card (like studying a specific lesson path), it gets registered in our engine. At this point, it has an `interval` of 0 days. This means it is immediately ready for review.

### 2. Rating Your Memory (Good, Bad, or Easy?)
When you flip a flashcard during a review, you must rate how difficult it was to recall. This rating directly determines when you will see the card next. Our system uses a modified version of the famous SM-2 algorithm:

*   **1 (Hard):** You completely forgot it. The card's interval resets to 0 or 1 day. You will see this card again either immediately or tomorrow.
*   **2 (Bad):** You remembered it, but with serious struggle. The interval grows, but very slowly.
*   **3 (Good):** You remembered it correctly with little hesitation. The interval grows normally (usually multiplying your last interval by ~2.5x).
*   **4 (Easy):** You recalled it instantly. The interval grows aggressively (often multiplying by 3.0x or more).

### 3. The Behind-the-Scenes Math (EFactor)
Every single card tracks its own hidden "Easiness Factor" (`efactor`), which starts at 2.5. 
*   **If you consistently press "Easy" or "Good":** The card's `efactor` goes up. Your intervals will multiply faster and faster between reviews (e.g., 1 day -> 3 days -> 8 days -> 21 days -> 2 months).
*   **If you press "Hard" or "Bad":** The multiplier goes down (but never below 1.3). The system realizes you are struggling with this specific word, so it will show it to you more frequently until you master it.

### 4. What Determines What Shows Up Today?
The engine uses the interval to calculate a strict `nextReviewDate` down to the millisecond. 
When you click "Review Due Cards" in your Profile, the app **ignores what lesson you are on**. Instead, it scans *every single card you've ever interacted with*, and builds a dynamic, custom deck containing ONLY the words whose `nextReviewDate` is in the past.

### 5. What Should You Expect to See?
*   **Week 1:** You'll see new words often. A word you learned on Monday will probably show up on Tuesday, Friday, and next Monday.
*   **Month 1:** If you keep answering "Good", those early words will vanish for two or three weeks. You'll spend most of your time reviewing newer words, and occasionally "maintaining" older ones.
*   **Month 6:** Words you know perfectly might have review intervals of 100+ days. You're effectively spending almost zero effort on things you know well, focusing 100% of your brainpower on the trickiest vocabulary.

### 6. Does it "Reset" Every Day?
No! It does not reset. The system works like a continuous alarm clock for every individual card:
*   **If you miss a day:** Your due cards do not disappear or reset. They just stay in the queue as "overdue" and will be waiting for you the next day. If you don't study for a week, they will pile up!
*   **Why a "daily" habit matters:** Because your cards' mathematical alarms are going off every few days (or weeks), a new batch of cards will naturally cross their "due timestamp" every day. This makes it *feel* like a daily refresh, but the app is actually just showing you the cards whose timers just expired.

### 7. Do I Have to Wait a Whole Day to Review a Card?
For the **"Review Due Cards"** pile, **YES**. 
That is the entire point of Spaced Repetition! You *must* wait. The system intentionally hides the card from you for at least a day to let your brain start forgetting it. Recalling it *right before* you forget it is what builds permanent long-term memory. If you review it again 10 minutes later, it stays in your short-term memory, which doesn't help you learn.

However, if you feel like you just need more practice *right now*, you can bypass the SRS queue! 
You can always go directly to the **Library** screen and click on any Lesson you want to play. This allows you to practice specific topics as much as you want without messing up the underlying memory timers.

### Conclusion
By relying on the "Review Due Cards" button daily, you ensure your vocabulary is permanently locked in your long-term memory without over-studying things you already know!


# End-of-Set Review Flow Plan

Currently, our flashcard sessions end immediately with a "Lesson Complete!" screen when the user goes through all the cards in the queue. 

Moving forward, we will implement a Two-Stage Review System:

## Phase 1: The Main Session
During the flashcard session, the user rates cards from 1 (Hard) to 4 (Easy).
- **"Hard" (1) & "Bad" (2)** will categorize the card as **"Unlearned"**.
- **"Good" (3) & "Easy" (4)** will categorize the card as **"Learned"**.

*(Note: We will track this per-session inside the `useFlashcards` hook to remember how the user rated each card in the current study session.)*

## Phase 2: The End-of-Set Recap
Instead of an immediate "Lesson Complete!" screen, finishing the queue will bring up a Recap Screen. This screen will show:
- How many cards were categorized as Learned vs Unlearned in this session.
- Options to:
   1. **"Review Unlearned"**: Starts a new mini-session containing ONLY the cards marked as Hard/Bad.
   2. **"Review All Again"**: Starts a fresh session with all cards.
   3. **"Continue"**: Leaves the study flow and returns to the curriculum profile.

## State Changes Needed
Inside `useFlashcards.ts`:
1. Track a `sessionResults` state mapping `cardId -> quality (1-5)`.
2. Update the `handleNext` function to log the card's result into `sessionResults`.
3. Provide helper functions or computed variables: `unlearnedCards` and `learnedCards`.
4. Create a function `startUnlearnedReview()` that resets the deck using only the `unlearnedCards`.

Inside `FlashcardScreen.tsx`:
1. When `completed` is true, render the new Recap UI instead of the simple "Lesson Complete!" screen.
2. The Recap UI will display the stats and provide the options mentioned in Phase 2.

Does this plan accurately capture your vision before we implement it?


