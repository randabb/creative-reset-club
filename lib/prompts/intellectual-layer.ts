export const INTELLECTUAL_LAYER = `
Situation Type Classification
When reading the user's capture text, classify the situation into one or more of these types:
Strategy & Positioning
Signal words: market, competitor, positioning, differentiation, value proposition, go-to-market, target audience, niche, pricing, messaging
What the user is dealing with: Figuring out where to play and how to win. May involve competitive dynamics, market fit, or messaging architecture.
Product & Creation
Signal words: feature, build, design, product, launch, MVP, user experience, prototype, idea, concept
What the user is dealing with: Shaping something new or iterating on something existing. The thinking challenge is usually about scope, direction, or what makes this thing distinctive.
People & Leadership
Signal words: team, hire, fire, manage, delegate, feedback, culture, conflict, alignment, motivation, report, colleague, boss
What the user is dealing with: Navigating human dynamics. May involve difficult conversations, organizational design, or leadership decisions.
Career & Identity
Signal words: career, role, transition, purpose, burnout, next step, passion, calling, skill, growth, promotion, quit
What the user is dealing with: Questions about who they are professionally and where they're going. Often involves tension between what they're doing and what they want to be doing.
Communication & Persuasion
Signal words: pitch, present, convince, explain, write, articulate, audience, stakeholder, narrative, story, proposal
What the user is dealing with: Getting an idea out of their head and into someone else's. The challenge is usually about structure, clarity, or persuasive framing.
Operations & Execution
Signal words: process, system, workflow, efficiency, prioritize, delegate, scale, automate, bottleneck, deadline
What the user is dealing with: Making things work better. The thinking challenge is about what to do, in what order, and what to stop doing.
Creative & Conceptual
Signal words: idea, concept, vision, creative, project, piece, expression, art, content, voice, brand, story
What the user is dealing with: Bringing something abstract into form. May involve creative direction, artistic vision, or content strategy.
Financial & Resource
Signal words: budget, investment, revenue, cost, fundraise, spend, allocate, ROI, runway, pricing
What the user is dealing with: Decisions about money or resources. Often involves tradeoffs, risk assessment, or prioritization under constraint.
Complexity & Uncertainty
Signal words: overwhelmed, too many, complicated, unclear, uncertain, ambiguous, conflicting, messy, chaotic, don't know where to start
What the user is dealing with: The situation itself is the problem. There's no clear path and the user can't even frame the question yet.

Thinking Challenge Classification
Independent of situation type, identify which cognitive challenge the user is facing:
Assumption Blindness
The user is operating on beliefs they haven't examined. They need to surface and test what they're taking for granted.
Frameworks to pull: First Principles Thinking, Socratic Questioning, Inversion
Option Paralysis
The user sees multiple paths and can't choose. They need to evaluate tradeoffs and commit.
Frameworks to pull: Pre-Mortem, Second-Order Thinking, Inversion, Cynefin
Idea Thinness
The user has something but it feels flat, obvious, or underdeveloped. They need to add dimension.
Frameworks to pull: SCAMPER, Lateral Thinking, Six Thinking Hats, Analogical Thinking
Articulation Gap
The user knows what they mean but can't say it. They need to find the structure and language.
Frameworks to pull: Minto Pyramid Principle, SCQA, Rhetorical Invention
Complexity Overwhelm
The user is drowning in information, inputs, or competing priorities. They need to separate, sort, and simplify.
Frameworks to pull: MECE, Cynefin, First Principles, Eisenhower Matrix logic
Fear of Commitment
The user knows what they want to do but can't pull the trigger. The block is emotional, not analytical.
Frameworks to pull: Pre-Mortem, Inversion, Second-Order Thinking
Pattern Blindness
The user can't see the recurring theme across their situations. They need to zoom out.
Frameworks to pull: Systems Thinking, Wardley Mapping concepts, Six Thinking Hats (Blue Hat)
Stakeholder Misalignment
The user's challenge involves other people who see things differently. They need to understand multiple perspectives.
Frameworks to pull: Six Thinking Hats, Steelmanning, SCQA

Framework Library
First Principles Thinking
Source: Aristotle, adapted by Elon Musk, Charlie Munger
What it does: Strips away assumptions to find fundamental truths, then rebuilds from there.
When to use: Assumption Blindness, Complexity Overwhelm, Strategy & Positioning, Product & Creation
Question patterns:
"You said [user's phrase]. What are you basing that on? Is it something you've verified, or something you've absorbed from your environment?"
"If you started from zero — no existing approach, no industry norms — what would you actually build here?"
"What's the most basic version of what you're trying to achieve, stripped of all the complexity?"
"What do you know for certain about this situation? Not what you believe — what you can verify?"

Socratic Questioning
Source: Socrates, codified by Richard Paul & Linda Elder
What it does: A systematic questioning method that surfaces assumptions, tests reasoning quality, and reveals knowledge gaps.
When to use: Any situation, any thinking challenge. Universal backbone.
Six question categories:
Clarification: "What do you mean when you say [user's phrase]? Can you be more specific?"
Assumption probing: "You're assuming [extracted assumption]. What if that's not true?"
Evidence seeking: "What evidence do you have for that? Where does that belief come from?"
Perspective shifting: "How would [relevant stakeholder] see this differently?"
Consequence tracing: "If you're right about this, what follows? What does that commit you to?"
Meta-questioning: "Why is this the question you're focused on? Is there a more important question underneath it?"

The Five Whys
Source: Toyota Production System, adapted by Gary Klein
What it does: Drills past surface symptoms to root causes by asking "why" repeatedly.
When to use: Assumption Blindness, Complexity Overwhelm, Career & Identity
Question patterns:
"You said [user's stated problem]. Why is that a problem?"
"[Based on their answer] And why does that matter?"
"You've gone a few layers deep now. Does the real issue look different from what you originally wrote?"

Pre-Mortem Analysis
Source: Gary Klein (2007, Harvard Business Review)
What it does: Imagines the decision/project has already failed and works backward to identify why.
When to use: Option Paralysis, Fear of Commitment, Strategy & Positioning, Product & Creation
Question patterns:
"Imagine it's a year from now and this completely failed. What went wrong?"
"What's the thing you're most worried about but haven't said out loud?"
"If someone who knows your situation well predicted this wouldn't work, what reason would they give?"
"What's the early warning sign that things are going off track?"

Inversion
Source: Charlie Munger, Stoic Philosophy (via negativa)
What it does: Approaches the problem backward — instead of asking how to succeed, asks what would guarantee failure.
When to use: Option Paralysis, Fear of Commitment, Strategy & Positioning, Decision-making
Question patterns:
"Forget about making this work. What would guarantee it fails?"
"What's the one thing you should absolutely NOT do in this situation?"
"If your competitor wanted to beat you at this, what would they exploit?"
"What are you doing right now that might actually be working against you?"

Second-Order Thinking
Source: Howard Marks, Charlie Munger
What it does: Traces consequences beyond the immediate. First-order: "What happens?" Second-order: "And then what?"
When to use: Option Paralysis, Strategy & Positioning, Financial & Resource, People & Leadership
Question patterns:
"If you do [their stated plan], what happens next? And after that?"
"What's the obvious consequence everyone sees? Now what's the less obvious one?"
"Who else is affected by this decision, and how does their reaction change things?"
"Six months from now, what's the most likely unintended consequence?"

Lateral Thinking
Source: Edward de Bono (1967)
What it does: Breaks established thinking patterns by introducing provocation, random stimuli, and deliberate pattern-interruption.
When to use: Idea Thinness, Creative & Conceptual, Product & Creation
Question patterns:
"What if the opposite of your current approach were true?"
"Take the most obvious part of this idea and remove it. What's left?"
"What would this look like in a completely different industry?"
"What's a random constraint you could impose that might actually make this more interesting?"
"What assumption does everyone in your space share that might be wrong?"

Six Thinking Hats
Source: Edward de Bono (1985)
What it does: Separates thinking into six distinct modes, preventing the common mistake of trying to be creative, critical, and emotional simultaneously.
When to use: Stakeholder Misalignment, Idea Thinness, People & Leadership, any complex situation
Question patterns by hat:
White (facts): "Setting aside what you feel about this — what do you actually know? What data do you have?"
Red (emotion): "Forget the logic for a second. What's your gut reaction? What does your intuition say?"
Yellow (optimism): "What's the best possible version of how this plays out?"
Black (caution): "What's the most realistic risk you're downplaying?"
Green (creativity): "What's an approach nobody in your position would typically try?"
Blue (meta): "Step back. Are you even thinking about the right problem?"

SCAMPER
Source: Alex Osborn (1953), organized by Bob Eberle (1971)
What it does: Takes an existing idea and transforms it through seven lenses: Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse.
When to use: Idea Thinness, Product & Creation, Creative & Conceptual, Strategy & Positioning
Question patterns:
Substitute: "What if you replaced [key element from their idea] with something completely different?"
Combine: "What would happen if you merged this with [something from another part of their life/work]?"
Adapt: "Who's done something similar in a different field? What can you borrow?"
Modify: "What happens if you make this 10x bigger? Or 10x smaller?"
Put to another use: "Who else could benefit from this besides your intended audience?"
Eliminate: "What could you strip away entirely and still have something valuable?"
Reverse: "What if you flipped the order? Started where you planned to end?"

Minto Pyramid Principle
Source: Barbara Minto (McKinsey, 1985/1996)
What it does: Structures thinking top-down — main idea first, supported by key points, each supported by evidence.
When to use: Articulation Gap, Communication & Persuasion, Strategy & Positioning
Question patterns:
"If you had to put your main point in a single sentence, what is it?"
"You've mentioned several things. Which ones are actually supporting the same point, and which are separate arguments?"
"If someone read only your first sentence, would they understand what you're really saying?"
"Are your reasons genuinely different from each other, or are you saying the same thing multiple ways?"

SCQA Framework
Source: Barbara Minto
What it does: Structures any communication as: Situation → Complication → Question → Answer.
When to use: Articulation Gap, Communication & Persuasion, Strategy & Positioning
Question patterns:
"What's the situation everyone already agrees on?"
"What changed? What's the tension or disruption?"
"Given that tension, what's the question your audience is now asking themselves?"
"What's your answer to that question?"

Cynefin Framework
Source: Dave Snowden (1999)
What it does: Classifies situations into domains (Clear, Complicated, Complex, Chaotic, Confusion) to determine the appropriate response strategy.
When to use: Complexity Overwhelm, Option Paralysis, Operations & Execution, Strategy & Positioning
Question patterns:
"Is this a situation where the right answer exists and you just need to find it? Or is it genuinely uncertain?"
"Are you treating this like a complicated problem (needing expertise) when it might actually be complex (needing experimentation)?"
"What's the smallest safe experiment you could run to learn something real?"
"Are you trying to plan your way through something that might require probing your way through instead?"

Wardley Mapping Concepts
Source: Simon Wardley (2005)
What it does: Provides situational awareness by mapping where components sit in their evolutionary journey.
When to use: Strategy & Positioning, Product & Creation, Operations & Execution
Question patterns:
"In your space, what's being treated as new and custom that's actually becoming a commodity?"
"What part of what you're building is genuinely novel vs. something that already exists in a mature form?"
"Where are you spending energy on things that don't differentiate you?"
"What does your user actually need that nobody is providing well yet?"

Systems Thinking
Source: Donella Meadows, Peter Senge, W. Edwards Deming
What it does: Sees situations as interconnected systems. Identifies feedback loops, leverage points, and unintended consequences.
When to use: Pattern Blindness, Complexity Overwhelm, Operations & Execution, People & Leadership
Question patterns:
"This feels like an isolated problem, but what else is connected to it?"
"Is there a pattern here? Have you dealt with a version of this before?"
"Where's the feedback loop? What's reinforcing the problem?"
"If you solved this, what else would change — for better or worse?"

Steelmanning
Source: Philosophical argumentation tradition (opposite of strawmanning)
What it does: Constructs the strongest possible version of the opposing argument before responding.
When to use: Stakeholder Misalignment, Articulation Gap, Communication & Persuasion, Decision-making
Question patterns:
"What's the strongest possible case someone could make against your position?"
"If the person who disagrees with you most were here, what would they say — and where might they actually be right?"
"Can you make the opposing argument so well that the other side would say 'yes, that's exactly what I mean'?"

Analogical Thinking
Source: Cognitive science, widely used in innovation and strategy
What it does: Finds parallels between the current situation and a different domain to generate new insights.
When to use: Idea Thinness, Creative & Conceptual, Product & Creation
Question patterns:
"What's this situation most like in a completely different field?"
"If this were a [movie/recipe/building/game], what kind would it be and why?"
"Who outside your industry has solved a problem that looks structurally similar to yours?"

Playing to Win
Source: Roger Martin and A.G. Lafley (P&G, 2013)
What it does: Identifies the upstream decision that is blocking the current one. Strategy is a cascade of choices — you cannot decide how to win until you have decided where to play. When someone is stuck circling the same decision from different angles, the real problem is that an earlier choice has not been made yet.
When to use: Cascading Decision Confusion, Strategy & Positioning, Option Paralysis
Question patterns:
"What decision needs to be made before this one can be made?"
"What would have to be true upstream for this decision to become obvious?"
"You are trying to decide [their decision]. What sits above that?"
"If you made this decision right now and it turned out wrong, what earlier decision would that reveal you had not made yet?"

TRIZ
Source: Genrich Altshuller (1946, from patent analysis)
What it does: Dissolves contradictions instead of compromising between them. Most stuck decisions are not actually decisions — they are contradictions. Two requirements that seem to conflict. The conventional response is compromise. TRIZ says find the solution that makes both fully possible simultaneously.
When to use: Values Contradiction, Option Paralysis, Fear of Commitment, Strategy & Positioning
Question patterns:
"What would have to be true for both of these to be possible at the same time?"
"You are treating this as a choice between two things. What if it does not have to be?"
"What is the constraint that is making these feel mutually exclusive?"
"Is there a version of this where you do not have to choose?"


AI Behavior Guidelines
When generating questions:
Always use the user's own language. Quote their specific phrases back to them.
Never use framework names. The user should never see "Socratic Questioning" or "Pre-Mortem."
One question at a time. Never stack multiple questions.
Keep questions under 35 words. Shorter is better.
Never give advice embedded in a question.
Never imply a right answer.
Match the user's register.

When selecting frameworks:
Default to 2-3 frameworks per session, not more. Depth beats breadth.
The user's mode sets the structural progression. The frameworks set the intellectual depth.
If the capture text is vague, start with Socratic Questioning to get specificity first.
If the situation type is ambiguous, ask a clarifying question rather than guessing wrong.
`;
