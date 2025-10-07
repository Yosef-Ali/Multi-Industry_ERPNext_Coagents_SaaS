'use client';

import useSWR from 'swr';

type ChatItem = {
  id: string;
  title: string;
  createdAt: string | Date;
  visibility: 'public' | 'private';
};

type HistoryResponse = {
  chats: ChatItem[];
  hasMore: boolean;
};

const fetcher = async (url: string): Promise<HistoryResponse> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return res.json();
};

export function useChatHistory(limit: number = 20) {
  const { data, error, isLoading, mutate } = useSWR<HistoryResponse>(
    `/developer/api/history?limit=${limit}`,
    fetcher,
    { revalidateOnFocus: true, revalidateIfStale: true }
  );

  return {
    chats: data?.chats ?? [],
    hasMore: data?.hasMore ?? false,
    isLoading,
    error,
    refresh: () => mutate(),
  };
}

