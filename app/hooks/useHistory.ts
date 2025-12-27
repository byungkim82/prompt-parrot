import { useInfiniteQuery } from '@tanstack/react-query';

export interface Translation {
  id: number;
  korean_text: string;
  english_text: string;
  edited_english_text: string | null;
  is_edited: number;
  created_at: string;
  updated_at: string;
}

export function useHistory() {
  return useInfiniteQuery({
    queryKey: ['translations'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `/api/history?offset=${pageParam}`
      );

      if (!response.ok) {
        throw new Error('히스토리 조회 실패');
      }

      const data = await response.json() as { translations: Translation[] };
      return data.translations;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
    initialPageParam: 0,
  });
}
