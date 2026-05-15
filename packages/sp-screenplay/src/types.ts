export type ParseError = { line: number; code: string };

export type ActionBlock = { kind: 'action'; lines: string[] };
export type NoteBlock = { kind: 'note'; noteType: string; lines: string[] };
export type DialogueBlock = { kind: 'dialogue'; character: string; lines: string[] };
export type SpBlock = ActionBlock | NoteBlock | DialogueBlock;

export type SpScene = {
  number: number;
  meta: Record<string, string>;
  blocks: SpBlock[];
};

export type SpDocument = {
  header: Record<string, string>;
  scenes: SpScene[];
};

export type SpParseResult = {
  document: SpDocument | null;
  errors: ParseError[];
};

export function parseResultOk(r: SpParseResult): boolean {
  return r.errors.length === 0 && r.document !== null;
}
