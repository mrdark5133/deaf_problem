# ASL Sign Specification Draft Descriptions & Verification Register

**Document Version:** 1.0.0  
**Phase:** S3 (Demo-Critical Sign Specification)  
**Verification Policy:** In accordance with the Handshape-First signing architecture, all signs are compiled from canonical handshapes and explicit kinematic anchors. Every sign starts with `verified_by: null` and displays `[UNVERIFIED]` until verified by an ASL signer.

---

## 1. Demo Scenario Sign Specifications

| Gloss | Hands | Handshape(s) | Palm Direction | Location / Anchors | Movement & Trajectory | Reference & Linguistic Notes | Verified By |
|---|---|---|---|---|---|---|---|
| `HELLO` | Dominant | `flat_b` | `forward` | `temple` $\to$ `neutral` (offset `[+0.25, -0.15, +0.35]`) | Salute outward and forward from temple | ASL Standard Greeting (Lifeprint/ASL University) | null |
| `THANK-YOU` | Dominant | `flat_b` | `toward_body` $\to$ `up` | `chin` $\to$ `neutral` (offset `[+0.05, 0.0, +0.32]`) | Fingers touch chin and extend outward toward recipient | ASL Standard Courtesy Sign | null |
| `YES` | Dominant | `fist_s` | `forward` | `neutral` (offset `[+0.05, -0.10, +0.20]` $\to$ `[+0.05, +0.05, +0.25]`) | Fist nods downward at wrist like a head nodding | ASL Standard Affirmation | null |
| `NO` | Dominant | `letter_u` $\to$ `flat_o` | `forward` | `neutral` (offset `[+0.08, -0.05, +0.22]`) | Index and middle fingers snap onto thumb | ASL Standard Negation | null |
| `PLEASE` | Dominant | `flat_b` | `toward_body` | `chest` (circular trajectory) | Open palm rubs in clockwise circle over center of chest | ASL Standard Courtesy Sign | null |
| `HELP` | Two | Dom: `fist_a`<br>NonDom: `flat_b` | Dom: `left`<br>NonDom: `up` | `neutral` (offset `[0, +0.15, +0.20]` $\to$ `[0, -0.10, +0.22]`) | Dominant fist rests on non-dominant palm, both lifted upwards together | ASL Standard Assistance Sign | null |
| `DOCTOR` | Two | Dom: `flat_m`<br>NonDom: `flat_b` | Dom: `down`<br>NonDom: `up` | Dom: `non_dominant_wrist`<br>NonDom: `neutral` | Dominant bent fingers tap twice on radial pulse of non-dominant wrist | ASL Standard Medical Profession Sign | null |
| `NURSE` | Two | Dom: `letter_n`<br>NonDom: `flat_b` | Dom: `down`<br>NonDom: `up` | Dom: `non_dominant_wrist`<br>NonDom: `neutral` | Dominant N-fingers tap twice on non-dominant wrist pulse point | ASL Standard Medical Profession Sign | null |
| `MEDICINE` | Two | Dom: `bent_v`<br>NonDom: `flat_b` | Dom: `down`<br>NonDom: `up` | Dom: `non_dominant_palm`<br>NonDom: `neutral` | Dominant bent middle finger pivots circular in center of non-dominant palm | ASL Standard Pharmacy / Medical Sign | null |
| `PAIN` | Two | Dom: `index_1`<br>NonDom: `index_1` | Dom: `toward_body`<br>NonDom: `toward_body` | `chest` / `neutral` | Both index fingers point toward each other and twist inward twice | ASL Standard Symptom Sign | null |
| `NEED` | Dominant | `bent_v` | `down` | `neutral` (offset `[+0.10, -0.05, +0.22]` $\to$ `[+0.10, +0.10, +0.22]`) | Bent index finger / hooked hand drops downward firmly at wrist | ASL Standard Modal Verb | null |
| `WHERE` | Dominant | `index_1` | `forward` | `neutral` (side-to-side oscillation) | Index finger held upright and shaken side-to-side with furrowed brows | ASL Standard WH-Question Sign | null |
| `WHEN` | Two | Dom: `index_1`<br>NonDom: `index_1` | Dom: `toward_body`<br>NonDom: `right` | `neutral` (offset `[0, 0, +0.20]`) | Dominant index circles around non-dominant index tip and lands on it | ASL Standard WH-Question Sign | null |
| `GOOD` | Two | Dom: `flat_b`<br>NonDom: `flat_b` | Dom: `toward_body` $\to$ `up`<br>NonDom: `up` | Dom: `chin` $\to$ `non_dominant_palm`<br>NonDom: `neutral` | Dominant hand moves from chin down into palm of non-dominant hand | ASL Standard Evaluation Sign | null |
| `MORNING` | Two | Dom: `flat_b`<br>NonDom: `flat_b` | Dom: `toward_body`<br>NonDom: `down` | Dom: `waist` $\to$ `chest`<br>NonDom: `neutral` | Non-dominant arm horizontal across waist; dominant arm rises like the sun | ASL Standard Time Sign | null |
| `TEACHER` | Two | Dom: `flat_o`<br>NonDom: `flat_o` | Dom: `left`<br>NonDom: `right` | `forehead` $\to$ `chest` | Both flat-O hands pull knowledge from temples forward, then drop as agent suffix | ASL Standard Compound (TEACH + PERSON) | null |
| `FINISH` | Two | Dom: `open_5`<br>NonDom: `open_5` | Dom: `toward_body` $\to$ `forward`<br>NonDom: `toward_body` $\to$ `forward` | `chest` $\to$ `neutral` | Both open hands flick outward and downward with fingers splayed | ASL Standard Aspect Marker / Completion | null |
| `AGAIN` | Two | Dom: `bent_v`<br>NonDom: `flat_b` | Dom: `up` $\to$ `toward_body`<br>NonDom: `up` | Dom: `neutral` $\to$ `non_dominant_palm`<br>NonDom: `neutral` | Dominant hand arcs upward and lands firmly in non-dominant palm | ASL Standard Grammar / Repetition | null |
| `REPEAT` | Two | Dom: `bent_v`<br>NonDom: `flat_b` | Dom: `up` $\to$ `toward_body`<br>NonDom: `up` | Dom: `neutral` $\to$ `non_dominant_palm`<br>NonDom: `neutral` | Repetition identical in production to AGAIN | ASL Standard Synonym | null |
| `WANT` | Two | Dom: `open_5`<br>NonDom: `open_5` | Dom: `up`<br>NonDom: `up` | `neutral` (reach $\to$ pull) | Both open claw hands pull toward the torso with palms facing up | ASL Standard Modal Verb | null |
| `LEARN` | Two | Dom: `open_5` $\to$ `flat_o`<br>NonDom: `flat_b` | Dom: `down`<br>NonDom: `up` | Dom: `non_dominant_palm` $\to$ `forehead`<br>NonDom: `neutral` | Dominant hand takes information from palm and presses into forehead | ASL Standard Cognitive Verb | null |
| `MORE` | Two | Dom: `flat_o`<br>NonDom: `flat_o` | Dom: `toward_body`<br>NonDom: `toward_body` | `chest` / `neutral` | Both flat-O hands tap fingertips together twice at chest level | ASL Standard Quantifier | null |
| `FRIEND` | Two | Dom: `index_1`<br>NonDom: `index_1` | Dom: `down` $\to$ `up`<br>NonDom: `up` $\to$ `down` | `chest` | Dominant hooked index interlocks with non-dominant hooked index, then flips | ASL Standard Interpersonal Sign | null |
| `EMERGENCY` | Dominant | `letter_e` | `left` / `forward` | `chest` (side-to-side oscillation) | Letter E hand shakes side-to-side in neutral space | ASL Standard Urgent Concept | null |
| `NOW` | Two | Dom: `horns_y`<br>NonDom: `horns_y` | Dom: `up`<br>NonDom: `up` | `chest` $\to$ `waist` | Both Y hands drop down sharply in unison in front of body | ASL Standard Temporal Marker | null |
| `TODAY` | Two | Dom: `horns_y`<br>NonDom: `horns_y` | Dom: `up`<br>NonDom: `up` | `chest` $\to$ `waist` (double drop) | Compound production: NOW performed with repeated rhythmic drop | ASL Standard Temporal Sign | null |
| `ME` | Dominant | `index_1` | `toward_body` | `chest` | Dominant index finger points directly to signer's sternum | ASL Standard First Person Deixis | null |
| `YOU` | Dominant | `index_1` | `forward` | `neutral` (pointed outward) | Dominant index finger points directly forward toward conversation partner | ASL Standard Second Person Deixis | null |
| `LETTER_J` | Dominant | `letter_i` | `forward` $\to$ `toward_body` | `neutral` (J-curve trace) | Pinky finger traces the letter J downward and hooks upward | ASL Manual Alphabet J-Movement | null |
| `LETTER_Z` | Dominant | `index_1` | `forward` | `neutral` (Z-trace across/down/across) | Index finger traces the letter Z in the air | ASL Manual Alphabet Z-Movement | null |
