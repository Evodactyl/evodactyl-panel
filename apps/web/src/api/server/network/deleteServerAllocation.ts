import http from '@/api/http';
import type { Allocation } from '@/api/server/getServer';

export default async (uuid: string, id: number): Promise<Allocation> =>
    await http.delete(`/api/client/servers/${uuid}/network/allocations/${id}`);
