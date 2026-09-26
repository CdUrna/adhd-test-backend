export type ReportSection = {
  key: string;
  type: "text" | "list";
  title: string;
  content: string;
  items?: string[];
  outro?: string;
};

export type ReportFaq = {
  question: string;
  answer: string;
};

export type ReportPayload = {
  disclaimer: string;
  sections: ReportSection[];
  faq: ReportFaq[];
};

export type GeneratedReport = {
  reportVersion: number;
  payload: ReportPayload;
};
