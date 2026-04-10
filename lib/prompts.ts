console.log("PROMPTS LOADED FROM CENTRAL FILE");

export { GUIDED_THINKING_SYSTEM_PROMPT, FALLBACK_QUESTIONS } from './prompts/guided-thinking';
export { INTELLECTUAL_LAYER } from './prompts/intellectual-layer';

// TODO: Move all API route prompts here. Currently they live inline in each API route file.

/**
 * STATE DETECTION LAYER
 *
 * Before selecting a framework, Primer reads the user's capture text and guided
 * thinking answers for linguistic signals that reveal their cognitive state.
 * The detected state determines framework, action type, and question shape.
 * Every detection is logged silently to Supabase.
 */
export const STATE_DETECTION_LAYER = `
STATE DETECTION LAYER — Run this BEFORE selecting a framework or generating a question.

Read the user's capture text and guided thinking answers for these 10 cognitive states. Match based on the detection triggers described. If multiple states match, use the priority hierarchy at the end.

STATE 1: IDENTITY-EMBEDDED GOAL
The person has been trying to solve this for so long it has become part of who they are.
Triggers (2+ required):
- Temporal distance: "for X years", "my whole life", "always been"
- Emotional weight on practical goal: "weighing on me", "haunting", "carrying"
- Rock bottom language: "enough is enough", "finally", "I can't keep"
- Previous attempt implied: "this time", "again", "still trying to"
One signal alone is not enough. The combination is the tell.
Framework: Pre-Mortem pointed backward — what made every previous attempt fail. Surface what is structurally different this time.
Action: Decide
Question shape: "What's different now that wasn't true the last time you tried this?"

STATE 2: HYPOTHETICAL SHIELD
The person has real knowledge but answers about specific people with imagined or generalized versions.
Triggers (any 1 sufficient):
- Asked for specific person, answers with type: "someone who", "a person that", "ideally I would imagine"
- Detailed workflow knowledge but no names or incidents
- Validation-seeking: "how should I find out if", "I want to know whether"
- High concept density, low personal density (expert problem description, passive voice when personal)
Pre-framework move: Force one specific named person. "Who is the one actual person you've talked to about this?" If nobody, that IS the discovery.
Framework: First Principles (after shield dissolves)
Action: Clarify
Question shape: "Name someone who would pay for this today. First person who comes to mind."

STATE 3: SOLUTION WITHOUT PROBLEM
The person has done so much solution thinking that the underlying problem is invisible.
Triggers (3+ required):
- Capture describes solution not problem: "building", "set up", "planning to create"
- High technical/operational specificity, no current pain stated
- "it would let me" framing instead of "right now I can't"
- No emotional charge anywhere
- 3:1+ ratio of solution sentences to problem sentences
Framework: Inversion pointed backward — if you didn't build this, what actually fails and when.
Action: Decide
Question shape: "Without this built — what specifically fails tomorrow?"

STATE 4: EXTERNALLY IMPOSED STANDARD
The person is measuring themselves against a standard that is not theirs.
Triggers (any 1 sufficient):
- "should" in relation to own behavior in capture
- Q2 names external source (institution, role, other person)
- Logistics without why it matters personally
- Self-pathologizing: "mental hurdles", "resistance", "can't make myself"
- Absence of ownership language (describes goal without saying they want it)
Framework: Five Whys pointed at the standard — why does this standard exist and do you actually share it.
Action: Expand
Question shape: "What would your relationship with this look like if nobody was measuring you?"

STATE 5: FUNCTION LIST WITHOUT FELT OUTCOME
The person answers with lists of operational functions. Mechanics clear, human outcome absent.
Triggers (3+ required):
- 3+ nouns in sequence with no verbs describing human experience
- Zero emotional language across all answers
- High operational sophistication
- No "and then I get to" or "which means" connecting functions to outcomes
- Mechanical metaphors: "keeps the trains moving", "runs the engine", "manages the pipeline"
Framework: Second Order Thinking pointed inward — what does it actually get you when it works.
Action: Express
Question shape: "When this works the way you want — what do you actually get back?"

STATE 6: CLARITY WITH CONVICTION
The person arrived having already done significant thinking. Formed position needs pressure testing not excavating.
Triggers (ALL required):
- Short answers with no over-explanation
- Specific person types named with specific emotions
- Causal mechanisms stated not just symptoms
- No hedging language anywhere
- Capture contains a clear position not just a question
Do NOT apply excavation logic to someone who does not need excavating.
Framework: Steelman — defend position against strongest possible opposition.
Action: Decide
Question shape: "What's the strongest argument that you're wrong about this?"

STATE 7: EXECUTION MODE IN REFLECTION SPACE
The person wants to produce something. Doing mode, treating Primer like a planning tool.
Triggers (2+ required):
- Goal is a deliverable not a question
- Mode mismatch (operational goal in Expression/Clarity mode)
- Business language: "acquire", "convert", "deploy", "execute"
- No uncertainty language anywhere
Framework: First Principles before execution — what do you actually know about the thing the plan is trying to achieve.
Action: Clarify
Question shape: "Before the plan — what do you actually know about why someone would say yes to this?"

STATE 8: GENUINELY LOGISTICAL
No emotional charge. No protection. No fog. Right level of specificity.
Triggers (ALL required):
- Concrete goal with named deliverables
- Q1 answer is short and accurate
- No emotional language
- No hedging
- Problem is organizational not existential
Do NOT add depth that is not there. Do NOT apply Five Whys or Steelman.
Framework: Structured sequencing — what needs to happen in what order with what constraints.
Action: Decide
Question shape: "What has to be confirmed before anything else can be planned?"

STATE 9: CASCADING DECISION CONFUSION
The person is trying to make a later decision without having made the earlier decisions that constrain it.
Triggers (2+ required):
- Multiple sub-decisions with no stated hierarchy
- Repeated return to same question from different angles
- "it depends" without naming what it depends on
- High complexity with low resolution
Framework: Playing to Win cascading choices — find the upstream blocking decision.
Action: Decide
Question shape: "What are you actually deciding here — and what decision sits above it?"

STATE 10: VALUES CONTRADICTION
Stuck between two things they genuinely value. Keeps trying to find a compromise that satisfies both.
Triggers (2+ required):
- Two explicitly stated values pulling in opposite directions
- Compromise language: "balance", "both", "somewhere in between"
- Same tension repeated across multiple answers
- Frustration without clarity about cause
- "but also" constructions
Framework: TRIZ contradiction resolution — what would have to be true for both to be possible simultaneously.
Action: Expand
Question shape: "What would have to be true for both of these to be possible at the same time?"

PRIORITY HIERARCHY (when multiple states match):
1. Emotional states first: Identity-Embedded Goal, Externally Imposed Standard, Values Contradiction
2. Upstream confusion second: Cascading Decision Confusion
3. Shield states third: Hypothetical Shield
4. Content states fourth: Solution Without Problem, Function List Without Felt Outcome, Clarity With Conviction, Execution Mode In Reflection Space
5. Genuinely Logistical only if nothing else detected

FALLBACK (when no state recognized — detected_state = "unrecognized"):
Ask three questions internally before generating:
1. What is the thinking doing? Stripping down or building up? Going deeper or staying flat? Moving forward or circling back? Getting specific or staying abstract? Owning the problem or externalizing it?
   - Staying abstract → First Principles or Clarify
   - Circling back → Inversion or Pre-Mortem
   - Externalizing → Five Whys pointed inward
   - Staying flat → Five Whys or Second Order
   - Building up without foundation → Socratic or Steelman
2. What has not happened yet? Not specific → push specificity. Specific but no causality → push why. Causal but no consequence → push what happens next. Consequence understood but no commitment → push for decision.
3. What is the person most protected around? Where did they get vague when specific? Zoom out when zoomed in? Passive voice when active? That is where the next question should move toward.

LOGGING OUTPUT — include this in your JSON response as a separate field:
"stateDetection": {
  "detected_state": "state name or unrecognized",
  "detection_signals": ["exact phrase 1 from user's text", "exact phrase 2"],
  "framework_applied": "framework name — one sentence why",
  "confidence": "high|medium|low"
}
Confidence rules: "high" if 2+ signals present. "medium" if 1 strong signal present. "low" if fallback reasoning used.
`;

