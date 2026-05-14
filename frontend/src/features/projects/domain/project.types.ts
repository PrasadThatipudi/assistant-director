export type Project = {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isArchived: boolean;
  readonly archivedAt: string | null;
};

export type ProjectDraft = {
  title: string;
  description: string;
};
