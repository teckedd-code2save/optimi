import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Mail,
  FileText,
  Send,
  User,
  Copy,
  CheckCircle2,
  Download,
  RefreshCw,
  ChevronRight,
  FileInput,
  Rocket,
  Heart,
  TrendingUp,
  Briefcase,
  Landmark,
  Layers,
  Lightbulb,
  DollarSign,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { generateAI } from '@/lib/api';

type Tone = 'professional' | 'enthusiastic' | 'technical' | 'casual';
type TemplateId = string;

const springEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

import type { OpportunityType } from '@/types';

interface TemplateDef {
  id: TemplateId;
  label: string;
  description: string;
  icon: React.ReactNode;
  applicableTypes: OpportunityType[];
  fields: { key: string; label: string; placeholder: string; rows?: number }[];
  generate: (fields: Record<string, string>, tone: Tone, type: OpportunityType | null) => string;
}

/* ------------------------------------------------------------------ */
/*  Type-aware tone helpers                                            */
/* ------------------------------------------------------------------ */
function getToneIntro(tone: Tone, type: OpportunityType | null): string {
  const map: Record<string, Record<Tone, string>> = {
    hackathon: {
      professional: 'Our team is excited to participate in this hackathon and build something impactful.',
      enthusiastic: "We are SO pumped for this hackathon! We have an incredible idea and can't wait to build it.",
      technical: 'We are approaching this hackathon with a clear technical vision and a stack optimized for rapid prototyping.',
      casual: "Hey! We're a team of builders and we think this hackathon is going to be awesome.",
    },
    accelerator: {
      professional: 'We are seeking to join this accelerator to scale our startup with the right guidance and capital.',
      enthusiastic: 'We are incredibly excited about the possibility of joining this accelerator! This is exactly what our startup needs.',
      technical: 'Our startup has achieved strong technical validation and we are ready to scale with structured support.',
      casual: 'Hey! Our startup is growing fast and we think this accelerator would be a perfect fit.',
    },
    grant: {
      professional: 'We are applying for this grant to fund a project with clear social and technical impact.',
      enthusiastic: 'We are thrilled to apply for this grant! This project means everything to us and the community we serve.',
      technical: 'This grant will enable us to execute a technically ambitious project with measurable outcomes.',
      casual: 'Hey! We have this amazing project idea and this grant would help us make it real.',
    },
    job: {
      professional: 'I am writing to express my interest in this role. With my background, I believe I can contribute meaningfully.',
      enthusiastic: 'I am incredibly excited about this role! This aligns perfectly with my passions and skills.',
      technical: 'With hands-on experience in relevant technologies, I am eager to contribute technical expertise to your team.',
      casual: "Hey! I came across this role and thought it would be a great fit. I'd love to tell you a bit about myself.",
    },
    government: {
      professional: 'I am submitting this application in accordance with the stated requirements and guidelines.',
      enthusiastic: 'I am glad to have the opportunity to apply for this program and look forward to a favorable outcome.',
      technical: 'I have prepared all required documentation and verified compliance with the technical specifications.',
      casual: "Hi, I'm applying for this and wanted to make sure everything looks good. Let me know if you need anything else.",
    },
    platform: {
      professional: 'We are looking to integrate with this platform to enhance our product offering.',
      enthusiastic: 'We are super excited to build on this platform! The API and community look incredible.',
      technical: 'Our architecture is well-suited for this platform integration and we have a clear implementation plan.',
      casual: "Hey! We think your platform is exactly what we need for our next project.",
    },
    other: {
      professional: 'I am reaching out regarding this opportunity and would appreciate your consideration.',
      enthusiastic: 'I am really excited about this opportunity and would love to explore it further!',
      technical: 'I have reviewed the requirements and believe my skills are well-aligned with this opportunity.',
      casual: 'Hey! This looks interesting and I\'d love to learn more.',
    },
  };
  return map[type || 'other']?.[tone] || map.other[tone];
}

function getToneClosing(tone: Tone, type: OpportunityType | null): string {
  const map: Record<string, Record<Tone, string>> = {
    hackathon: {
      professional: 'Thank you for organizing this event. We look forward to building something remarkable.',
      enthusiastic: "Can't wait to hack with everyone! See you there!",
      technical: 'We are ready to ship. Looking forward to demo day.',
      casual: "Let's build something cool. See you at the hackathon!",
    },
    accelerator: {
      professional: 'Thank you for considering our application. We look forward to the possibility of working together.',
      enthusiastic: 'We would be absolutely thrilled to join! Please reach out — we\'re eager to discuss.',
      technical: 'We welcome the opportunity to discuss our architecture, metrics, and growth plan in detail.',
      casual: 'Thanks for reading! Let me know if you want to chat more.',
    },
    grant: {
      professional: 'Thank you for considering our proposal. We are committed to delivering measurable impact.',
      enthusiastic: 'This grant would change everything for us. Thank you for the opportunity!',
      technical: 'We are confident in our approach and welcome any technical or methodological questions.',
      casual: 'Thanks for taking the time to read this. Fingers crossed!',
    },
    job: {
      professional: 'Thank you for considering my application. I look forward to the possibility of contributing to your team.',
      enthusiastic: 'I would be absolutely thrilled to be part of this! Please feel free to reach out.',
      technical: 'I welcome the opportunity to discuss architecture, implementation details, or any technical questions.',
      casual: 'Thanks for taking the time to read this! Let me know if you need anything else.',
    },
    government: {
      professional: 'Thank you for your time and consideration. I look forward to a favorable response.',
      enthusiastic: 'Thank you for this opportunity. I hope to hear from you soon!',
      technical: 'All documentation is in order. Please let me know if any additional information is required.',
      casual: 'Thanks! Let me know if I missed anything.',
    },
    platform: {
      professional: 'Thank you for building this platform. We look forward to a productive integration.',
      enthusiastic: 'So excited to get started! Your platform is exactly what we needed.',
      technical: 'We are ready to implement. Let us know if you have any integration best practices to share.',
      casual: "Thanks for the great platform. Let's build something together!",
    },
    other: {
      professional: 'Thank you for your time and consideration.',
      enthusiastic: 'Looking forward to what comes next!',
      technical: 'Happy to discuss any questions you may have.',
      casual: 'Thanks! Talk soon.',
    },
  };
  return map[type || 'other']?.[tone] || map.other[tone];
}

/* ------------------------------------------------------------------ */
/*  Templates organized by type                                        */
/* ------------------------------------------------------------------ */
const TEMPLATE_REGISTRY: TemplateDef[] = [
  // ─── Hackathon ───
  {
    id: 'hackathon-pitch',
    label: 'Project Pitch',
    description: 'Pitch your hackathon idea to judges',
    icon: <Rocket className="w-5 h-5" />,
    applicableTypes: ['hackathon'],
    fields: [
      { key: 'projectName', label: 'Project Name', placeholder: 'e.g., AI-Powered Accessibility Tool' },
      { key: 'hook', label: 'The Hook', placeholder: 'One surprising fact or counter-intuitive insight that makes judges lean in', rows: 2 },
      { key: 'problem', label: 'Problem & Stakes', placeholder: 'Who suffers, by how much, and why does it matter NOW? Include a stat or real story.', rows: 4 },
      { key: 'solution', label: 'Your Solution', placeholder: 'What did you build? How does it work? What makes your approach different from every other attempt?', rows: 4 },
      { key: 'techStack', label: 'Technical Depth', placeholder: 'Architecture, key stack choices, and why you made hard trade-offs instead of easy defaults', rows: 3 },
      { key: 'validation', label: 'Impact & Validation', placeholder: 'Who tested it? What did they say? Any metrics, even preliminary ones?', rows: 3 },
      { key: 'whyThis', label: 'Why This Hackathon', placeholder: 'What does THIS specific event, sponsor, or community uniquely unlock for you?', rows: 2 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      const name = fields.projectName || 'our project';
      return [
        intro,
        fields.hook ? `\n${fields.hook}` : '',
        fields.problem ? `\nThe problem we are tackling is not theoretical. ${fields.problem}` : '',
        fields.solution ? `\nOur answer is ${name}. ${fields.solution}` : '',
        fields.techStack ? `\nUnder the hood, we made deliberate architectural choices. ${fields.techStack}` : '',
        fields.validation ? `\nWe did not stop at building. ${fields.validation}` : '',
        fields.whyThis ? `\nThis hackathon is the right stage for us because ${fields.whyThis}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },
  {
    id: 'hackathon-bio',
    label: 'Team Bio',
    description: 'Introduce your team',
    icon: <User className="w-5 h-5" />,
    applicableTypes: ['hackathon'],
    fields: [
      { key: 'teamName', label: 'Team Name', placeholder: 'e.g., Code Wizards' },
      { key: 'origin', label: 'Origin Story', placeholder: 'How did this team come together? Shared trauma? A side project that would not die?', rows: 3 },
      { key: 'members', label: 'Team Members & Superpowers', placeholder: 'Each member: name, role, deepest skill, and one concrete proof point (ship, paper, repo, job)', rows: 4 },
      { key: 'trackRecord', label: 'Collective Track Record', placeholder: 'Have you shipped together before? Won anything? Built under time pressure?', rows: 3 },
      { key: 'whyThisTeam', label: 'Why This Team for This Problem', placeholder: 'Connect your lived experience or past work directly to the problem domain', rows: 2 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      return [
        intro,
        fields.origin ? `\n${fields.origin}` : '',
        fields.members ? `\nOur team is ${fields.teamName || 'our team'}. ${fields.members}` : '',
        fields.trackRecord ? `\nWe are not strangers to pressure. ${fields.trackRecord}` : '',
        fields.whyThisTeam ? `\nThe reason we chose this problem is personal. ${fields.whyThisTeam}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },

  // ─── Accelerator ───
  {
    id: 'accel-pitch',
    label: 'One-Liner Pitch',
    description: 'What you do, who for, why now',
    icon: <Send className="w-5 h-5" />,
    applicableTypes: ['accelerator'],
    fields: [
      { key: 'what', label: 'What You Do', placeholder: 'State what you do in plain English a non-technical person understands' },
      { key: 'who', label: 'Who For', placeholder: 'Name the exact customer segment and the burning pain they feel' },
      { key: 'whyNow', label: 'Why Now', placeholder: 'What changed in tech, regulation, or market behavior that makes this possible TODAY?', rows: 3 },
      { key: 'traction', label: 'Traction', placeholder: 'Revenue, users, growth rate, LOIs, pilot customers. Be specific. Metrics beat promises.', rows: 4 },
      { key: 'differentiation', label: 'Differentiation', placeholder: 'Who is the incumbent and why will they fail to copy you?', rows: 2 },
      { key: 'milestone', label: 'Next 12-Month Milestone', placeholder: 'The single biggest milestone you will hit in the next year', rows: 1 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      return [
        intro,
        fields.what ? `\n${fields.what}` : '',
        fields.who ? `\nWe serve ${fields.who}` : '',
        fields.whyNow ? `\nTiming is everything. ${fields.whyNow}` : '',
        fields.traction ? `\nWe are not a slide deck. ${fields.traction}` : '',
        fields.differentiation ? `\nIncumbents exist, but they will not win because ${fields.differentiation}` : '',
        fields.milestone ? `\nIn the next twelve months, our singular focus is ${fields.milestone}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },
  {
    id: 'accel-traction',
    label: 'Traction Summary',
    description: 'Metrics and milestones',
    icon: <TrendingUp className="w-5 h-5" />,
    applicableTypes: ['accelerator'],
    fields: [
      { key: 'northStar', label: 'North Star Metric', placeholder: 'The one metric that captures value delivered to users. Why this metric?' },
      { key: 'growthStory', label: 'Growth Story', placeholder: 'What experiments drove inflection? What channels worked and which died?', rows: 4 },
      { key: 'unitEconomics', label: 'Unit Economics', placeholder: 'CAC, LTV, payback period, or your path to monetization with assumptions', rows: 3 },
      { key: 'milestones', label: 'Key Milestones', placeholder: '3 concrete achievements with dates and numbers', rows: 3 },
      { key: 'nextBets', label: 'What Comes Next', placeholder: 'The next 2-3 bets and how you will measure them', rows: 2 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      return [
        intro,
        fields.northStar ? `\nOur north star is ${fields.northStar}` : '',
        fields.growthStory ? `\n${fields.growthStory}` : '',
        fields.unitEconomics ? `\nOn unit economics: ${fields.unitEconomics}` : '',
        fields.milestones ? `\nOur track record so far: ${fields.milestones}` : '',
        fields.nextBets ? `\nLooking ahead, ${fields.nextBets}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },

  // ─── Grant ───
  {
    id: 'grant-impact',
    label: 'Impact Statement',
    description: 'The change you will create',
    icon: <Heart className="w-5 h-5" />,
    applicableTypes: ['grant'],
    fields: [
      { key: 'stakes', label: 'The Stakes', placeholder: 'What happens if this problem goes unsolved? Who loses, and by how much?', rows: 3 },
      { key: 'theory', label: 'Theory of Change', placeholder: 'Your intervention → short-term outcome → long-term systemic change', rows: 4 },
      { key: 'beneficiaries', label: 'Beneficiaries', placeholder: 'Who exactly? How many? How did you validate their need?', rows: 3 },
      { key: 'evidence', label: 'Evidence Base', placeholder: 'Similar interventions that worked. Citations, comparable programs, or your own pilot data', rows: 3 },
      { key: 'measurement', label: 'Measurement Plan', placeholder: 'KPIs, evaluation design, and how you will know you succeeded versus just stayed busy', rows: 3 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      return [
        intro,
        fields.stakes ? `\nThe stakes could not be higher. ${fields.stakes}` : '',
        fields.theory ? `\nOur theory of change is simple but rigorous. ${fields.theory}` : '',
        fields.beneficiaries ? `\nThe people we serve are not abstractions. ${fields.beneficiaries}` : '',
        fields.evidence ? `\nWe are not guessing. ${fields.evidence}` : '',
        fields.measurement ? `\nSuccess will be measured by ${fields.measurement}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },
  {
    id: 'grant-budget',
    label: 'Budget Narrative',
    description: 'How funds will be used',
    icon: <DollarSign className="w-5 h-5" />,
    applicableTypes: ['grant'],
    fields: [
      { key: 'totalBudget', label: 'Total Ask & Timeline', placeholder: 'e.g., $50,000 over 6 months' },
      { key: 'personnel', label: 'Personnel', placeholder: 'Who will be hired or retained? What do they do? Why essential versus nice-to-have?', rows: 4 },
      { key: 'directCosts', label: 'Direct Costs', placeholder: 'Equipment, software, travel, materials. Each line tied to a deliverable.', rows: 3 },
      { key: 'leverage', label: 'Leverage & Matching', placeholder: 'Matching funds, in-kind contributions, or volunteer hours. Show this is a catalyst.', rows: 2 },
      { key: 'risk', label: 'Risk Mitigation', placeholder: 'What if costs overrun? What is your contingency plan?', rows: 2 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      return [
        intro,
        fields.totalBudget ? `\nWe are requesting ${fields.totalBudget}` : '',
        fields.personnel ? `\nThe people make the project. ${fields.personnel}` : '',
        fields.directCosts ? `\nEvery dollar has a job. ${fields.directCosts}` : '',
        fields.leverage ? `\nThis grant is a catalyst, not the whole budget. ${fields.leverage}` : '',
        fields.risk ? `\nWe have also planned for the unexpected. ${fields.risk}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },

  // ─── Job ───
  {
    id: 'job-cover',
    label: 'Cover Letter',
    description: 'Tailored cover letter',
    icon: <Mail className="w-5 h-5" />,
    applicableTypes: ['job'],
    fields: [
      { key: 'hook', label: 'The Hook', placeholder: 'The specific moment, product, or mission that made you apply. Not "I saw your posting."', rows: 2 },
      { key: 'bridge', label: 'The Bridge Story', placeholder: 'A narrative arc connecting your past work to this role. One story with metrics, conflict, and resolution.', rows: 5 },
      { key: 'proof', label: 'Proof Points', placeholder: '2-3 achievements with numbers, context, and impact. Be specific.', rows: 4 },
      { key: 'alignment', label: 'Alignment', placeholder: 'Why this company, this team, this moment? Reference a recent launch, blog post, or value.', rows: 3 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      return [
        intro,
        fields.hook ? `\n${fields.hook}` : '',
        fields.bridge ? `\n${fields.bridge}` : '',
        fields.proof ? `\nThe results speak louder than intent. ${fields.proof}` : '',
        fields.alignment ? `\n${fields.alignment}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },
  {
    id: 'job-linkedin',
    label: 'LinkedIn Outreach',
    description: 'Message to a hiring manager',
    icon: <Briefcase className="w-5 h-5" />,
    applicableTypes: ['job'],
    fields: [
      { key: 'context', label: 'Context', placeholder: 'How you found them and why them specifically' },
      { key: 'credibility', label: 'Credibility Signal', placeholder: 'One impressive, relevant proof point that makes them want to reply', rows: 2 },
      { key: 'value', label: 'Value Exchange', placeholder: 'What can you offer? Insight, introduction, help with a problem? Give first.', rows: 3 },
      { key: 'ask', label: 'The Ask', placeholder: 'One low-friction ask. Not "can we chat?" but "Would you be open to 15 min next Tuesday about X?"', rows: 2 },
    ],
    generate: (fields, tone, type) => {
      const greeting = tone === 'casual' ? `Hi ${fields.recipient || 'there'},` : `Dear ${fields.recipient || 'Hiring Manager'},`;
      return [
        greeting,
        fields.context ? `\n${fields.context}` : '',
        fields.credibility ? `\n${fields.credibility}` : '',
        fields.value ? `\n${fields.value}` : '',
        fields.ask ? `\n${fields.ask}` : '',
        `\n${getToneClosing(tone, type)}`,
      ].filter(Boolean).join('\n');
    },
  },

  // ─── Government ───
  {
    id: 'gov-statement',
    label: 'Application Statement',
    description: 'Why you qualify',
    icon: <Landmark className="w-5 h-5" />,
    applicableTypes: ['government'],
    fields: [
      { key: 'purpose', label: 'Purpose & Authority', placeholder: 'The exact program name and why you are statutorily eligible', rows: 2 },
      { key: 'eligibility', label: 'Eligibility Proof', placeholder: 'Walk through each requirement with your matching credential', rows: 4 },
      { key: 'publicValue', label: 'Public Value', placeholder: 'How does your participation advance the program\'s stated goals? Use the agency\'s language.', rows: 3 },
      { key: 'capacity', label: 'Capacity', placeholder: 'Past performance, team qualifications, and infrastructure', rows: 2 },
      { key: 'timeline', label: 'Timeline & Deliverables', placeholder: 'Specific milestones and completion dates', rows: 2 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      return [
        intro,
        fields.purpose ? `\n${fields.purpose}` : '',
        fields.eligibility ? `\n${fields.eligibility}` : '',
        fields.publicValue ? `\n${fields.publicValue}` : '',
        fields.capacity ? `\n${fields.capacity}` : '',
        fields.timeline ? `\n${fields.timeline}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },

  // ─── Platform ───
  {
    id: 'platform-usecase',
    label: 'Integration Use Case',
    description: 'How you will use the platform',
    icon: <Layers className="w-5 h-5" />,
    applicableTypes: ['platform'],
    fields: [
      { key: 'pain', label: 'Customer Pain', placeholder: 'What do your users struggle with that this platform solves?', rows: 3 },
      { key: 'integration', label: 'Integration Story', placeholder: 'How it works end-to-end. Screens, flows, API calls. Concrete enough that a PM could visualize it.', rows: 4 },
      { key: 'mutualValue', label: 'Mutual Value', placeholder: 'What do you bring (users, data, distribution)? What do they bring (capability, reach)?', rows: 3 },
      { key: 'gtm', label: 'Go-to-Market', placeholder: 'How will you launch this integration to your users?', rows: 2 },
      { key: 'metrics', label: 'Success Metrics', placeholder: 'Activation rate, retention lift, revenue impact. Commit to numbers.', rows: 2 },
    ],
    generate: (fields, tone, type) => {
      const intro = getToneIntro(tone, type);
      const close = getToneClosing(tone, type);
      return [
        intro,
        fields.pain ? `\n${fields.pain}` : '',
        fields.integration ? `\n${fields.integration}` : '',
        fields.mutualValue ? `\n${fields.mutualValue}` : '',
        fields.gtm ? `\n${fields.gtm}` : '',
        fields.metrics ? `\n${fields.metrics}` : '',
        `\n${close}`,
      ].filter(Boolean).join('\n');
    },
  },

  // ─── Generic / Other ───
  {
    id: 'other-cold',
    label: 'Cold Email',
    description: 'Outreach email',
    icon: <Send className="w-5 h-5" />,
    applicableTypes: ['other', 'hackathon', 'accelerator', 'grant', 'job', 'government', 'platform'],
    fields: [
      { key: 'recipient', label: 'Recipient', placeholder: 'e.g., Jane Doe, Engineering Lead' },
      { key: 'pattern', label: 'Pattern Interrupt', placeholder: 'Something unexpected, funny, or sharply relevant to grab attention' },
      { key: 'context', label: 'Why Them', placeholder: 'Proof you know their work, their company, or their problem', rows: 2 },
      { key: 'credibility', label: 'Credibility', placeholder: 'One result, one name, one metric' },
      { key: 'value', label: 'Value Prop', placeholder: 'What you do, who it is for, and the before/after', rows: 3 },
      { key: 'ask', label: 'Low-Friction Ask', placeholder: 'Specific, easy to say yes to. Not "can we chat?"', rows: 2 },
    ],
    generate: (fields, tone, type) => {
      const greeting = tone === 'casual' ? `Hi ${fields.recipient || 'there'},` : `Dear ${fields.recipient || 'Sir/Madam'},`;
      return [
        greeting,
        fields.pattern ? `\n${fields.pattern}` : '',
        fields.context ? `\n${fields.context}` : '',
        fields.credibility ? `\n${fields.credibility}` : '',
        fields.value ? `\n${fields.value}` : '',
        fields.ask ? `\n${fields.ask}` : '',
        `\n${getToneClosing(tone, type)}`,
      ].filter(Boolean).join('\n');
    },
  },
  {
    id: 'other-custom',
    label: 'Custom',
    description: 'Freeform request',
    icon: <Lightbulb className="w-5 h-5" />,
    applicableTypes: ['other', 'hackathon', 'accelerator', 'grant', 'job', 'government', 'platform'],
    fields: [
      { key: 'prompt', label: 'What do you need help writing?', placeholder: 'Describe what you need. The more specific, the better the result.', rows: 10 },
    ],
    generate: (fields, tone, type) => {
      return `${getToneIntro(tone, type)}\n\n${fields.prompt || ''}\n\n${getToneClosing(tone, type)}`;
    },
  },
];

function getTemplatesForType(type: OpportunityType | null): TemplateDef[] {
  if (!type) return TEMPLATE_REGISTRY.filter((t) => t.applicableTypes.includes('other'));
  const specific = TEMPLATE_REGISTRY.filter((t) => t.applicableTypes.includes(type) && !t.applicableTypes.includes('other'));
  const generic = TEMPLATE_REGISTRY.filter((t) => t.applicableTypes.includes('other'));
  return [...specific, ...generic];
}

const tones: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'technical', label: 'Technical' },
  { value: 'casual', label: 'Casual' },
];

interface GenerationRecord {
  id: string;
  templateId: TemplateId;
  title: string;
  content: string;
  tone: Tone;
  wordCount: number;
  timestamp: Date;
}

export function AIAssistant() {
  const { opportunities } = useAppStore();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('other-custom');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [tone, setTone] = useState<Tone>('professional');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState('');
  const [recentGens, setRecentGens] = useState<GenerationRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [isDesktop, setIsDesktop] = useState(false);

  const selectedOppData = useMemo(
    () => opportunities.find((o) => o.id === selectedOpp) || null,
    [opportunities, selectedOpp]
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Reset template when opportunity changes to ensure it's applicable
  useEffect(() => {
    const type = selectedOppData?.type || null;
    const valid = getTemplatesForType(type);
    if (!valid.some((t) => t.id === selectedTemplate)) {
      setSelectedTemplate(valid[0]?.id || 'other-custom');
      setFields({});
      setGeneratedText('');
    }
  }, [selectedOppData, selectedTemplate]);

  const availableTemplates = useMemo(
    () => getTemplatesForType(selectedOppData?.type || null),
    [selectedOppData]
  );

  const template = useMemo(
    () => availableTemplates.find((t) => t.id === selectedTemplate) || availableTemplates[0],
    [availableTemplates, selectedTemplate]
  );

  const wordCount = useMemo(() => {
    if (!generatedText) return 0;
    return generatedText.split(/\s+/).filter(Boolean).length;
  }, [generatedText]);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setMobileTab('preview');

    const { settings } = useAppStore.getState();
    const opp = selectedOpp ? opportunities.find((o) => o.id === selectedOpp) : null;

    let text: string;

    try {
      if (settings.backendUrl && settings.aiEnabled) {
        // Call backend OpenAI endpoint
        text = await generateAI(settings.backendUrl, {
          template: template.label,
          tone,
          fields,
          opportunity: opp
            ? {
                title: opp.title,
                organization: opp.organization,
                type: opp.type,
                description: opp.description,
              }
            : null,
        }).then((r) => r.content);
      } else {
        // Local template fallback
        await new Promise((r) => setTimeout(r, 800));
        text = template.generate(fields, tone, selectedOppData?.type || null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
      text = template.generate(fields, tone, selectedOppData?.type || null);
    }

    setGeneratedText(text);
    setIsGenerating(false);

    const rec: GenerationRecord = {
      id: crypto.randomUUID(),
      templateId: selectedTemplate,
      title: `${template.label} ${opp ? `— ${opp.title || ''}` : ''}`,
      content: text,
      tone,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      timestamp: new Date(),
    };
    setRecentGens((prev) => [rec, ...prev].slice(0, 10));
  }, [template, fields, tone, selectedTemplate, selectedOpp, opportunities]);

  const handleCopy = useCallback(async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [generatedText]);

  const handleDownload = useCallback(() => {
    if (!generatedText) return;
    const blob = new Blob([generatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimi-${selectedTemplate}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded as .txt');
  }, [generatedText, selectedTemplate]);

  const handleInsertToNotes = useCallback(() => {
    if (!generatedText) return;
    if (selectedOpp) {
      const opp = opportunities.find((o) => o.id === selectedOpp);
      if (opp) {
        const newNotes = opp.notes ? `${opp.notes}\n\n---\n\n${generatedText}` : generatedText;
        useAppStore.getState().updateNotes(selectedOpp, newNotes);
        toast.success(`Added to ${opp.title} notes`);
        return;
      }
    }
    toast.error('Please select an opportunity first');
  }, [generatedText, selectedOpp, opportunities]);

  const hasRequiredFields = useMemo(() => {
    return template.fields.every((f) => {
      const val = fields[f.key];
      return val && val.trim().length > 0;
    });
  }, [template, fields]);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: springEase }}
        className="mb-1"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-6 h-6 text-[var(--accent-primary)]" />
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">AI Assistant</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Get help crafting winning applications
        </p>
      </motion.div>

      {/* Template Selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.08 }}
        className="mt-5"
      >
        <div className="flex gap-2.5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
          {availableTemplates.map((t, idx) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04, duration: 0.2, ease: springEase }}
              onClick={() => {
                setSelectedTemplate(t.id);
                setFields({});
                setGeneratedText('');
              }}
              className={`snap-start flex-shrink-0 min-w-[130px] sm:min-w-0 flex flex-col items-center gap-2 px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedTemplate === t.id
                  ? 'bg-[#e0e7ff] border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.icon}
              <span className="text-xs font-medium whitespace-nowrap">{t.label}</span>
              <span className="hidden sm:block text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">
                {t.description}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Mobile Toggle */}
      <div className="flex sm:hidden bg-[var(--bg-elevated)] rounded-lg p-[3px] mb-4">
        <button
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
            mobileTab === 'form'
              ? 'bg-white text-[var(--accent-primary)] shadow-sm'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Form
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
            mobileTab === 'preview'
              ? 'bg-white text-[var(--accent-primary)] shadow-sm'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Preview
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Form Panel */}
        <AnimatePresence mode="wait">
          {(mobileTab === 'form' || isDesktop) && (
            <motion.div
              key={`form-${selectedTemplate}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: springEase }}
              className={`flex-1 ${mobileTab === 'preview' ? 'hidden lg:block' : ''}`}
              style={{ maxWidth: '100%' }}
            >
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 lg:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedTemplate}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Opportunity Selector */}
                    <div className="mb-5">
                      <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wide font-medium">
                        Opportunity (optional)
                      </label>
                      <select
                        value={selectedOpp}
                        onChange={(e) => setSelectedOpp(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[rgba(79,70,229,0.08)] transition-all"
                      >
                        <option value="">Select an opportunity...</option>
                        {opportunities.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title}
                          </option>
                        ))}
                      </select>
                      {selectedOpp && (
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="mt-2 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-default)]"
                        >
                          <p className="text-xs font-medium text-[var(--text-primary)]">
                            {opportunities.find((o) => o.id === selectedOpp)?.title}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                            {opportunities.find((o) => o.id === selectedOpp)?.deadline
                              ? `Deadline: ${opportunities.find((o) => o.id === selectedOpp)?.deadline}`
                              : 'No deadline'}
                          </p>
                        </motion.div>
                      )}
                    </div>

                    {/* Template Fields */}
                    {template.fields.map((field) => (
                      <div key={field.key} className="mb-4">
                        <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wide font-medium">
                          {field.label}
                        </label>
                        {field.rows && field.rows > 1 ? (
                          <textarea
                            value={fields[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={field.rows}
                            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[rgba(79,70,229,0.08)] transition-all resize-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={fields[field.key] || ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[rgba(79,70,229,0.08)] transition-all"
                          />
                        )}
                      </div>
                    ))}

                    {/* Tone Selector */}
                    <div className="mb-5">
                      <label className="block text-xs text-[var(--text-tertiary)] mb-2 uppercase tracking-wide font-medium">
                        Tone
                      </label>
                      <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
                        {tones.map((t) => (
                          <button
                            key={t.value}
                            onClick={() => setTone(t.value)}
                            className={`flex-1 py-2 text-xs font-medium transition-all ${
                              tone === t.value
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Generate Button */}
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  onClick={handleGenerate}
                  disabled={!hasRequiredFields || isGenerating}
                  className="w-full h-12 bg-[var(--accent-primary)] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(79,70,229,0.15)] hover:bg-[var(--accent-primary-hover)] hover:shadow-[0_2px_4px_rgba(79,70,229,0.2)] hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  {isGenerating ? 'Writing...' : 'Generate Draft'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Panel */}
        <AnimatePresence mode="wait">
          {(mobileTab === 'preview' || isDesktop) && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25, delay: 0.1, ease: springEase }}
              className={`flex-1 ${mobileTab === 'form' ? 'hidden lg:block' : ''}`}
            >
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 lg:p-6 min-h-[400px] flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Preview</h2>
                  <span className="text-xs font-mono text-[var(--text-tertiary)]">
                    ~{wordCount} words
                  </span>
                </div>

                <div className="flex-1">
                  {isGenerating ? (
                    <div className="space-y-3">
                      {[0.8, 0.95, 0.9, 0.6, 0.85, 0.7, 0.95, 0.5].map((width, i) => (
                        <div
                          key={i}
                          className="h-4 bg-[var(--bg-elevated)] rounded animate-pulse"
                          style={{ width: `${width * 100}%` }}
                        />
                      ))}
                      <p className="text-sm text-[var(--text-tertiary)] text-center pt-4">
                        Writing your draft...
                      </p>
                    </div>
                  ) : generatedText ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="whitespace-pre-wrap text-sm text-[var(--text-primary)] leading-[1.7]"
                    >
                      {generatedText}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Sparkles className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                      <p className="text-sm text-[var(--text-muted)] max-w-[240px]">
                        Fill in the form and click Generate to see a draft
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                {generatedText && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-2"
                  >
                    <button
                      onClick={handleCopy}
                      className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleInsertToNotes}
                      className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
                    >
                      <FileInput className="w-3.5 h-3.5" />
                      Insert to Notes
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="btn-ghost text-sm flex items-center gap-1.5 px-3 py-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate
                    </button>
                    <button
                      onClick={handleDownload}
                      className="btn-ghost text-sm flex items-center gap-1.5 px-3 py-2 ml-auto"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent Generations */}
      {recentGens.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15, ease: springEase }}
          className="mt-8 pt-6 border-t border-[var(--border-subtle)]"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Recent Generations
            </h2>
            <button
              onClick={() => setRecentGens([])}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-0">
            {recentGens.map((gen, idx) => (
              <motion.div
                key={gen.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.2, ease: springEase }}
                onClick={() => {
                  setGeneratedText(gen.content);
                  setMobileTab('preview');
                }}
                className="flex items-center gap-3 py-3 border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--bg-hover)] -mx-2 px-2 rounded-lg transition-colors"
              >
                <FileText className="w-[18px] h-[18px] text-[var(--accent-primary)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {TEMPLATE_REGISTRY.find((t) => t.id === gen.templateId)?.label}
                    {gen.title.includes('—') ? ` — ${gen.title.split('—')[1].trim()}` : ''}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    ~{gen.wordCount} words • {gen.tone.charAt(0).toUpperCase() + gen.tone.slice(1)} tone
                  </p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {Math.round((Date.now() - gen.timestamp.getTime()) / 60000)}m ago
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
