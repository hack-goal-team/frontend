export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
}

export interface Code {
  code: string;
  description: string;
  commentRequired?: boolean;
}
