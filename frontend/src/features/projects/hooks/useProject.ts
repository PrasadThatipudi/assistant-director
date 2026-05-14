import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { openAssistantDatabase } from '../../../data/db/openDatabase';
import { flushOutbox } from '../../../data/sync/outboxFlush';
import type { Project } from '../domain/project.types';
import { projectRepository } from '../data/projectRepository';

export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(Boolean(projectId));

  const refresh = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await projectRepository.getById(projectId);
      setProject(next);
      await flushOutbox(openAssistantDatabase());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { project, loading, refresh };
}
