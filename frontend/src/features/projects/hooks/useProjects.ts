import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { flushOutbox } from '../../../data/sync/outboxFlush';
import { openAssistantDatabase } from '../../../data/db/openDatabase';
import type { Project } from '../domain/project.types';
import { projectRepository } from '../data/projectRepository';

export function useProjects() {
  const [active, setActive] = useState<Project[]>([]);
  const [archived, setArchived] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextActive, nextArchived] = await Promise.all([
        projectRepository.listActive(),
        projectRepository.listArchived(),
      ]);
      setActive(nextActive);
      setArchived(nextArchived);
      await flushOutbox(openAssistantDatabase());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { active, archived, loading, refresh };
}
