export type SiteKind = 'commerce' | 'publishing' | 'enterprise';
export type Params = Record<string, string>;
export interface Field {
  key: string; label: string; type?: 'text' | 'number' | 'select';
  placeholder?: string; default?: string; options?: { value: string; label: string }[];
  required?: boolean; help?: string; advanced?: boolean;
}
export interface Service { port: number; name: string; version: string }
export interface CmsRecord { id: string; title: string; detail: string; status: string }
export interface SiteMetadata {
  title: string; description: string; language: string; accent: string;
  image?: string; icon?: string; source: 'public' | 'generated';
}
export interface Choice { prompt: string; options: { value: string; label: string }[] }
export interface TaskEvent { kind: string; value: string; at: number }
export interface Target {
  id: string; domain: string; seed: number; ip: string; kind: SiteKind; name: string;
  services: Service[]; discoveredPorts?: number[]; username: string; password: string;
  latitude: number; longitude: number; devices: string[];
  scanned: boolean; credentials: boolean; unlocked: boolean; cameraConnected: boolean;
  traced: boolean; traffic: number; latency: number; locked: boolean;
  announcement: string; originalAnnouncement: string; records: CmsRecord[];
  files: Record<string, string>; revision: number; data: Record<string, unknown>; site?: SiteMetadata;
}
export interface Task {
  id: string; moduleId: string; targetId: string; title: string;
  status: 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number; phase: string; logs: string[]; logOffset?: number; startedAt: number; endedAt?: number;
  params: Params; result?: string; error?: string; targetInput?: string; choice?: Choice; events?: TaskEvent[];
}
export interface ModuleContext {
  target: Target; task: Task; signal: AbortSignal;
  log(text: string): void; phase(label: string, progress: number): void;
  wait(ms: number): Promise<void>; changed(): void; choose(prompt: string, options: Choice['options']): Promise<string>;
}
export interface ModuleDefinition {
  id: string; name: string; code: string; description: string; category: string;
  fields: Field[]; view?: string; order?: number; continuous?: boolean; autoReveal?: boolean; targetRequired?: boolean; reveal?: string;
  validate(params: Params, target: Target): Record<string, string | undefined>;
  execute(context: ModuleContext, params: Params): Promise<string>;
}
export interface SessionState {
  targets: Target[]; tasks: Task[]; activeTargetId?: string; ended: boolean;
}
