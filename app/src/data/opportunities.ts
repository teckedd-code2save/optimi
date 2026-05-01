import type { Opportunity } from '@/types';

/**
 * Default seed opportunities.
 * These are real URLs from verified sources.
 * Users can delete them and add their own.
 */
export const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-1',
    title: 'USAII Global Hackathon 2026',
    organization: 'USAII',
    type: 'hackathon',
    status: 'saved',
    url: 'https://usaii-global-ai-hackathon-2026.devpost.com/',
    deadline: '2026-06-06T23:59:59Z',
    description: 'Global virtual AI hackathon empowering students to build solutions for real-world good — from everyday impact to career readiness.',
    requirements: ['Student or recent graduate', 'Team of 2-5 members', 'Project must use AI'],
    prizes: '$15,000 in cash prizes + USAII AI Certification Scholarships',
    location: 'Online',
    checklist: [
      { id: 'c1-1', text: 'Read hackathon rules and guidelines', completed: false },
      { id: 'c1-2', text: 'Register on Devpost', completed: false },
      { id: 'c1-3', text: 'Form team (2-5 members)', completed: false },
    ],
    notes: '',
    dateAdded: '2026-04-28',
  },
  {
    id: 'opp-2',
    title: 'a16z Speedrun SR007',
    organization: 'Andreessen Horowitz',
    type: 'accelerator',
    status: 'saved',
    url: 'https://speedrun.a16z.com/apply',
    deadline: '2026-05-17T23:59:59Z',
    description: '10-week accelerator for AI and gaming startups. $750K investment on a $10M cap. Demo Day on October 6, 2026.',
    requirements: ['Early-stage AI or gaming startup', 'Working prototype', 'Technical founder(s)'],
    prizes: '$750K at $10M cap',
    location: 'San Francisco, CA (hybrid)',
    checklist: [
      { id: 'c2-1', text: 'Review investment terms', completed: false },
      { id: 'c2-2', text: 'Prepare pitch deck', completed: false },
      { id: 'c2-3', text: 'Submit application form', completed: false },
    ],
    notes: '',
    dateAdded: '2026-04-28',
  },
  {
    id: 'opp-3',
    title: 'Google for Startups Cloud Credits',
    organization: 'Google',
    type: 'grant',
    status: 'saved',
    url: 'https://cloud.google.com/startup',
    deadline: '2026-06-01T23:59:59Z',
    description: 'Up to $200,000 in Google Cloud credits for eligible startups. Includes technical support and mentorship.',
    requirements: ['Seed to Series A stage', 'Less than 5 years old', 'Not previously received GCP credits'],
    prizes: 'Up to $200K cloud credits',
    location: 'Global',
    checklist: [
      { id: 'c3-1', text: 'Verify eligibility criteria', completed: false },
      { id: 'c3-2', text: 'Gather company documents', completed: false },
    ],
    notes: '',
    dateAdded: '2026-04-28',
  },
  {
    id: 'opp-4',
    title: 'Ghana Passport Online Application',
    organization: 'Ministry of Foreign Affairs, Ghana',
    type: 'government',
    status: 'saved',
    url: 'https://passport.mfa.gov.gh/',
    deadline: null,
    description: 'Online passport application or renewal for Ghanaian citizens. Standard 32-page passport costs GHS 500.00.',
    requirements: ['Ghanaian citizen', 'Birth certificate', 'Passport photos', 'Witness (clergyman/public servant)'],
    prizes: undefined,
    location: 'Ghana (14 application centers)',
    checklist: [
      { id: 'c4-1', text: 'Create account on portal', completed: false },
      { id: 'c4-2', text: 'Fill application form', completed: false },
      { id: 'c4-3', text: 'Pay fee and book appointment', completed: false },
    ],
    notes: '',
    dateAdded: '2026-04-28',
  },
];
