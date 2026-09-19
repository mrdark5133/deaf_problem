import type { GlossToken } from '../lib/types';

export interface DemoSentence {
  text: string;
  isQuestion: boolean;
  questionType: 'wh' | 'yes_no' | null;
  tokens: GlossToken[];
}

export interface DemoScenario {
  id: string;
  title: string;
  iconName: 'stethoscope' | 'graduation-cap' | 'help-circle';
  description: string;
  sentences: DemoSentence[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'doctor',
    title: 'Doctor Visit',
    iconName: 'stethoscope',
    description: 'Medical intake consultation and pain assessment',
    sentences: [
      {
        text: 'Hello doctor.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'HELLO', kind: 'sign', clip_id: 'hello', source: 'Hello' },
          { gloss: 'DOCTOR', kind: 'sign', clip_id: 'doctor', source: 'doctor' },
        ],
      },
      {
        text: 'Where is the medicine?',
        isQuestion: true,
        questionType: 'wh',
        tokens: [
          { gloss: 'MEDICINE', kind: 'sign', clip_id: 'medicine', source: 'medicine' },
          { gloss: 'WHERE', kind: 'sign', clip_id: 'where', source: 'Where' },
        ],
      },
      {
        text: 'I need help today.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'TODAY', kind: 'sign', clip_id: 'today', source: 'today' },
          { gloss: 'ME', kind: 'sign', clip_id: 'me', source: 'I' },
          { gloss: 'NEED', kind: 'sign', clip_id: 'need', source: 'need' },
          { gloss: 'HELP', kind: 'sign', clip_id: 'help', source: 'help' },
        ],
      },
      {
        text: 'Do you have pain?',
        isQuestion: true,
        questionType: 'yes_no',
        tokens: [
          { gloss: 'YOU', kind: 'sign', clip_id: 'you', source: 'you' },
          { gloss: 'PAIN', kind: 'sign', clip_id: 'pain', source: 'pain' },
        ],
      },
      {
        text: 'Thank you nurse.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'THANK-YOU', kind: 'sign', clip_id: 'thank-you', source: 'Thank you' },
          { gloss: 'NURSE', kind: 'sign', clip_id: 'nurse', source: 'nurse' },
        ],
      },
    ],
  },
  {
    id: 'classroom',
    title: 'Classroom',
    iconName: 'graduation-cap',
    description: 'Teacher instruction, lecture questions, and comprehension',
    sentences: [
      {
        text: 'Good morning teacher.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'GOOD', kind: 'sign', clip_id: 'good', source: 'Good' },
          { gloss: 'MORNING', kind: 'sign', clip_id: 'morning', source: 'morning' },
          { gloss: 'TEACHER', kind: 'sign', clip_id: 'teacher', source: 'teacher' },
        ],
      },
      {
        text: 'When will class finish?',
        isQuestion: true,
        questionType: 'wh',
        tokens: [
          { gloss: 'FINISH', kind: 'sign', clip_id: 'finish', source: 'finish' },
          { gloss: 'WHEN', kind: 'sign', clip_id: 'when', source: 'When' },
        ],
      },
      {
        text: 'Please repeat again.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'PLEASE', kind: 'sign', clip_id: 'please', source: 'Please' },
          { gloss: 'REPEAT', kind: 'sign', clip_id: 'repeat', source: 'repeat' },
          { gloss: 'AGAIN', kind: 'sign', clip_id: 'again', source: 'again' },
        ],
      },
      {
        text: 'I want to learn more.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'ME', kind: 'sign', clip_id: 'me', source: 'I' },
          { gloss: 'WANT', kind: 'sign', clip_id: 'want', source: 'want' },
          { gloss: 'LEARN', kind: 'sign', clip_id: 'learn', source: 'learn' },
          { gloss: 'MORE', kind: 'sign', clip_id: 'more', source: 'more' },
        ],
      },
      {
        text: 'Thank you friend.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'THANK-YOU', kind: 'sign', clip_id: 'thank-you', source: 'Thank you' },
          { gloss: 'FRIEND', kind: 'sign', clip_id: 'friend', source: 'friend' },
        ],
      },
    ],
  },
  {
    id: 'helpdesk',
    title: 'Help Desk / ER',
    iconName: 'help-circle',
    description: 'Emergency reception, urgent location assistance, and routing',
    sentences: [
      {
        text: 'Hello.',
        isQuestion: false,
        questionType: null,
        tokens: [{ gloss: 'HELLO', kind: 'sign', clip_id: 'hello', source: 'Hello' }],
      },
      {
        text: 'Where is the emergency room?',
        isQuestion: true,
        questionType: 'wh',
        tokens: [
          { gloss: 'EMERGENCY', kind: 'sign', clip_id: 'emergency', source: 'emergency' },
          { gloss: 'WHERE', kind: 'sign', clip_id: 'where', source: 'Where' },
        ],
      },
      {
        text: 'I have pain now.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'NOW', kind: 'sign', clip_id: 'now', source: 'now' },
          { gloss: 'ME', kind: 'sign', clip_id: 'me', source: 'I' },
          { gloss: 'PAIN', kind: 'sign', clip_id: 'pain', source: 'pain' },
        ],
      },
      {
        text: 'Please help me.',
        isQuestion: false,
        questionType: null,
        tokens: [
          { gloss: 'PLEASE', kind: 'sign', clip_id: 'please', source: 'Please' },
          { gloss: 'HELP', kind: 'sign', clip_id: 'help', source: 'help' },
          { gloss: 'ME', kind: 'sign', clip_id: 'me', source: 'me' },
        ],
      },
      {
        text: 'Thank you.',
        isQuestion: false,
        questionType: null,
        tokens: [{ gloss: 'THANK-YOU', kind: 'sign', clip_id: 'thank-you', source: 'Thank you' }],
      },
    ],
  },
];
