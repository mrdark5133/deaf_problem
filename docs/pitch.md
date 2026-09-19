# SignBridge — 3-Minute Hackathon Pitch & Judge Q&A Pack

---

## 🎙️ 3-Minute Live Presentation Script

### 1. The Hook & The Problem (0:00 – 0:40)
> *"Imagine walking into an emergency room or a doctor's clinic in severe pain, but nobody on the medical staff knows your language. In the United States alone, over 500,000 Deaf people rely on American Sign Language (ASL) as their primary language.*
>
> *Certified in-person medical interpreters are often unavailable on short notice, and hearing healthcare workers rarely know sign language. This creates dangerous delays in care and immense anxiety.*
>
> *Today, we built **SignBridge** — a real-time, browser-based assistive tool that translates spoken English directly into animated American Sign Language on a responsive 2D skeleton avatar, synchronized with live captions and ASL gloss notation."*

---

### 2. The Live Demo (0:40 – 1:30)
> *(Demonstrator clicks the Microphone or selects the 'Doctor Visit' Demo Scenario)*
>
> *"Watch what happens when a doctor speaks:  
> **'Where is the medicine? I need help today.'**  
>
> 1. **Speech to Text:** Web Speech API captures speech in real time with continuous interim debounce.
> 2. **ASL Grammar Transformation:** Rather than signing English word-for-word, our FastAPI pipeline rearranges English syntax into natural ASL Topic-Comment order: `'MEDICINE WHERE'` and moves temporal markers first: `'TODAY ME NEED HELP'`.
> 3. **Live Canvas Avatar:** Our custom 60 FPS HTML5 Canvas avatar immediately signs the sentence with smooth landmark blending and hand articulation.
> 4. **Fingerspelling Fallback:** If a doctor mentions an unknown drug name like `'ASPIRIN'`, SignBridge automatically decomposes it into character-by-character fingerspelling.*
>
> *Notice the question eyebrow indicator at the top — ASL uses non-manual facial cues for questions, and SignBridge displays raised or furrowed brow indicators accordingly."*

---

### 3. Technical Architecture & Innovation (1:30 – 2:20)
> *"Under the hood, SignBridge combines three distinct engineering innovations:*
>
> 1. **Deterministic NLP Grammar Engine:** Powered by spaCy and custom linguistic rule transforms that drop articles, invert WH-questions, apply aspectual tense markers (`FINISH`, `WILL`), and resolve synonyms in **under 4 milliseconds (p50: 3.57 ms)**.
> 2. **Computer Vision Sign Capture Studio:** An integrated MediaPipe Pose and Hand landmark studio that normalizes coordinates (shoulder-width scale, shoulder-midpoint origin) to record reusable sign clips.
> 3. **Backpressure & Ordering Engine:** Monotonic sequence guards prevent out-of-order execution, while dynamic rate adaptation raises playback speed when audio queues exceed 2 seconds to ensure latency never exceeds 4 seconds."*

---

### 4. Accessibility, Impact & Conclusion (2:20 – 3:00)
> *"SignBridge is built from the ground up for WCAG 2.2 AA accessibility:
> - High-Contrast AAA mode for low-vision signers
> - Full keyboard-only navigation
> - Avatar mirror view and variable caption scaling
> - 100% offline scripted demo modes
>
> SignBridge does not replace human interpreters; it empowers immediate, dignifying communication where none previously existed. Thank you!"*

---

## 🧑‍⚖️ Top 5 Anticipated Judge Questions & Winning Answers

### Q1: *"Why did you use deterministic NLP rules instead of relying entirely on an LLM like GPT-4?"*
**Answer:**
> *"In emergency medical intake and public help desks, latency, predictability, and offline resilience are paramount. An LLM call introduces 800–2000 ms of unpredictable network latency, requires internet access, and risks hallucinating non-existent words.
>
> Our rule-based spaCy pipeline executes in **under 5 milliseconds**, is 100% deterministic (verified by our 42 golden test fixtures with a 100% pass rate), and functions fully offline. We also include an optional LLM flag for open-domain expansion where latency permits."*

---

### Q2: *"How is ASL different from English, and how does your grammar engine handle that?"*
**Answer:**
> *"ASL is an independent language with completely different grammar from English. SignBridge handles 6 core ASL syntactic structures:
> 1. **Topic-Comment Syntax:** Placing topic before comment (e.g., 'Where is the doctor?' $\rightarrow$ `DOCTOR WHERE`).
> 2. **Time-First Ordering:** Temporal adverbs move to the clause start (e.g., 'Yesterday I went home' $\rightarrow$ `YESTERDAY ME GO HOME`).
> 3. **Omission of Copulas and Articles:** Drops *is, am, are, the, a*.
> 4. **Aspectual Tense Markers:** Uses lexical markers like `FINISH` (past) and `WILL` (future).
> 5. **WH-Question Inversion:** Moves *WHO, WHAT, WHERE, WHEN, WHY, HOW* to the end of the sentence.
> 6. **Non-Manual Markers:** Distinguishes WH-questions (furrowed brows) from Yes/No questions (raised brows)."*

---

### Q3: *"What happens when a user speaks an unknown medical term or name?"*
**Answer:**
> *"SignBridge implements automatic **fingerspelling fallback**. Any word outside our canonical vocabulary (e.g., 'John' or 'Morphine') is decomposed into an array of individual alphabet landmarks (A–Z) and played with standardized per-letter durations. The gloss strip clearly highlights these as fingerspelled chips so the user is never left with missing information."*

---

### Q4: *"How do you maintain a smooth 60 FPS animation without visual jumping between signs?"*
**Answer:**
> *"We implemented a linear interpolation (`lerpFrames`) transition engine. When the player finishes one sign clip and starts another, it generates a 150 ms ease transition connecting the signer's ending pose directly to the next clip's first frame. When the queue is empty, the avatar smoothly returns to a natural rest pose."*

---

### Q5: *"What are the limitations and how will you validate this with the Deaf community?"*
**Answer:**
> *"We documented our linguistic boundaries transparently in `docs/limitations.md`. While our 2D skeleton avatar renders hands and poses accurately, natural ASL utilizes rich 3D facial expressions and spatial classifiers.
>
> Our next step is conducting collaborative user studies with Deaf native signers and certified RID interpreters to expand vocabulary recordings and validate signing clarity in real hospital settings."*
