/**
 * Canvas State Machine
 *
 * Centralizes canvas model state into a single useReducer.
 * UI-only state (toggles, animations, form inputs) stays as useState in the component.
 *
 * What's in the reducer:
 *   notes, connections, edit/drag IDs, timer, AI loading,
 *   dimStatus, dimQAs, discoveries, patterns, synthesis, toast, saveStatus
 *
 * What stays as useState:
 *   URL params (capture, mode, qas, dimensions), UI toggles (showGoal, showExport, etc.),
 *   response flow, selection, connection modal, statusState, animation states, zoom, etc.
 */

export type Action = "clarify" | "expand" | "decide" | "express";

export interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  source?: "goal" | "thinking" | "ai" | "user" | "dimension";
  action?: Action;
  aiInstruction?: boolean;
  qIndex?: number;
  dimIndex?: number;
  dimLabel?: string;
  dimDesc?: string;
  aiTitle?: string;
  discipline?: "design" | "systems" | "strategic" | "critical" | "creative";
  promptQuestion?: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  color?: string;
}

export interface Discovery {
  id: string;
  text: string;
  dimLabel: string;
  discipline?: string;
  createdAt: string;
}

export interface Pattern {
  type: string;
  label: string;
  description: string;
  suggestion: string;
  behavior?: string;
  question?: string;
  suggestedAction?: string;
  noteId?: string;
  detected_at: string;
}

export interface SynthesisData {
  deliverable_label: string;
  sections: { heading: string; content: string }[];
  reflection?: string;
  deliverable?: string;
  thinking_approaches?: string;
}

export interface CanvasState {
  notes: Note[];
  connections: Connection[];
  editingNoteId: string | null;
  dragId: string | null;

  timerSeconds: number;
  timerActive: boolean;
  timerStarted: boolean;
  timerRemoved: boolean;
  timerPaused: boolean;

  aiLoading: boolean;

  dimStatus: Record<string, "unexplored" | "in_progress" | "complete">;
  dimQAs: Record<string, { question: string; answer: string; action: string }[]>;

  discoveries: Discovery[];
  patterns: Pattern[];

  synthesis: SynthesisData | null;
  synthLoading: boolean;

  toast: string;
  saveStatus: "saved" | "saving" | "unsaved";
}

export type CanvasAction =
  | { type: "RESTORE_SESSION"; payload: Partial<CanvasState> }
  | { type: "SET_NOTES"; payload: Note[] }
  | { type: "ADD_NOTE"; payload: Note }
  | { type: "UPDATE_NOTE"; payload: { id: string; updates: Partial<Note> } }
  | { type: "DELETE_NOTE"; payload: string }
  | { type: "FINISH_EDIT"; payload: string }
  | { type: "SET_CONNECTIONS"; payload: Connection[] }
  | { type: "ADD_CONNECTION"; payload: Connection }
  | { type: "DELETE_NOTE_CONNECTIONS"; payload: string }
  | { type: "SET_EDIT_ID"; payload: string | null }
  | { type: "SET_DRAG_ID"; payload: string | null }
  | { type: "TIMER_START" }
  | { type: "TIMER_TICK" }
  | { type: "TIMER_TOGGLE_PAUSE" }
  | { type: "TIMER_REMOVE" }
  | { type: "SET_AI_LOADING"; payload: boolean }
  | { type: "INIT_DIM_STATUS"; payload: Record<string, "unexplored" | "in_progress" | "complete"> }
  | { type: "SET_DIM_STATUS"; payload: { label: string; status: "unexplored" | "in_progress" | "complete" } }
  | { type: "SET_DIM_QAS"; payload: { label: string; qas: { question: string; answer: string; action: string }[] } }
  | { type: "ADD_DISCOVERY"; payload: Discovery }
  | { type: "ADD_PATTERN"; payload: Pattern }
  | { type: "CLEAR_PATTERN_NOTE"; payload: string }
  | { type: "SET_SYNTHESIS"; payload: SynthesisData | null }
  | { type: "SET_SYNTH_LOADING"; payload: boolean }
  | { type: "SET_TOAST"; payload: string }
  | { type: "SET_SAVE_STATUS"; payload: "saved" | "saving" | "unsaved" };

export function createInitialState(notes: Note[] = [], connections: Connection[] = []): CanvasState {
  return {
    notes,
    connections,
    editingNoteId: null,
    dragId: null,
    timerSeconds: 900,
    timerActive: false,
    timerStarted: false,
    timerRemoved: false,
    timerPaused: false,
    aiLoading: false,
    dimStatus: {},
    dimQAs: {},
    discoveries: [],
    patterns: [],
    synthesis: null,
    synthLoading: false,
    toast: "",
    saveStatus: "saved",
  };
}

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case "RESTORE_SESSION":
      return { ...state, ...action.payload };

    case "SET_NOTES":
      return { ...state, notes: action.payload };
    case "ADD_NOTE":
      return { ...state, notes: [...state.notes, action.payload] };
    case "UPDATE_NOTE":
      return { ...state, notes: state.notes.map(n => n.id === action.payload.id ? { ...n, ...action.payload.updates } : n) };
    case "DELETE_NOTE":
      return { ...state, notes: state.notes.filter(n => n.id !== action.payload) };
    case "FINISH_EDIT":
      return { ...state, notes: state.notes.filter(n => n.id !== action.payload || n.text.trim()), editingNoteId: null };

    case "SET_CONNECTIONS":
      return { ...state, connections: action.payload };
    case "ADD_CONNECTION":
      return { ...state, connections: [...state.connections, action.payload] };
    case "DELETE_NOTE_CONNECTIONS":
      return { ...state, connections: state.connections.filter(c => c.from !== action.payload && c.to !== action.payload) };

    case "SET_EDIT_ID":
      return { ...state, editingNoteId: action.payload };
    case "SET_DRAG_ID":
      return { ...state, dragId: action.payload };

    case "TIMER_START":
      return { ...state, timerStarted: true, timerActive: true, timerPaused: false };
    case "TIMER_TICK":
      return state.timerSeconds <= 1
        ? { ...state, timerSeconds: 0, timerActive: false }
        : { ...state, timerSeconds: state.timerSeconds - 1 };
    case "TIMER_TOGGLE_PAUSE":
      return { ...state, timerPaused: !state.timerPaused };
    case "TIMER_REMOVE":
      return { ...state, timerRemoved: true, timerActive: false };

    case "SET_AI_LOADING":
      return { ...state, aiLoading: action.payload };

    case "INIT_DIM_STATUS":
      return { ...state, dimStatus: action.payload };
    case "SET_DIM_STATUS":
      return { ...state, dimStatus: { ...state.dimStatus, [action.payload.label]: action.payload.status } };
    case "SET_DIM_QAS":
      return { ...state, dimQAs: { ...state.dimQAs, [action.payload.label]: action.payload.qas } };

    case "ADD_DISCOVERY":
      return { ...state, discoveries: [...state.discoveries, action.payload] };
    case "ADD_PATTERN":
      if (state.patterns.length >= 3) return state;
      return { ...state, patterns: [...state.patterns, action.payload] };
    case "CLEAR_PATTERN_NOTE":
      return { ...state, patterns: state.patterns.map(p => p.noteId === action.payload ? { ...p, noteId: undefined } : p) };

    case "SET_SYNTHESIS":
      return { ...state, synthesis: action.payload };
    case "SET_SYNTH_LOADING":
      return { ...state, synthLoading: action.payload };

    case "SET_TOAST":
      return { ...state, toast: action.payload };
    case "SET_SAVE_STATUS":
      return { ...state, saveStatus: action.payload };

    default:
      return state;
  }
}
