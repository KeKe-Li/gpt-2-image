import { profileWithAccountExtras } from './account.js';
import { getProfileById } from './supabase.js';

export async function getGenerationResponseUser(client, userId) {
  const profile = await getProfileById(userId).catch(() => null);
  if (!profile) return null;
  try {
    return await profileWithAccountExtras(client, profile);
  } catch (error) {
    console.warn('Failed to refresh generation response profile', {
      userId,
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return null;
  }
}

export function providerFieldsForTask(task) {
  const expiresAt = task?.expiresAt
    ? new Date(Number(task.expiresAt) * 1000).toISOString()
    : null;
  return {
    provider_cost_usd: Number.isFinite(Number(task?.cost)) ? Number(task.cost) : null,
    provider_result_url: task?.image || null,
    provider_result_expires_at: expiresAt
  };
}

export function formatStoredGeneration(reservation) {
  if (!reservation) return null;
  const succeeded = reservation.status === 'succeeded';
  const failed = reservation.status === 'failed';
  if (!succeeded && !failed) return null;
  return {
    taskId: reservation.provider_task_id,
    status: succeeded ? 'completed' : 'failed',
    progress: 100,
    image: reservation.provider_result_url || '',
    expiresAt: reservation.provider_result_expires_at
      ? Math.floor(new Date(reservation.provider_result_expires_at).getTime() / 1000)
      : null,
    cost: reservation.provider_cost_usd == null ? null : Number(reservation.provider_cost_usd),
    errorMessage: failed ? reservation.error_code || 'GENERATION_FAILED' : '',
    errorCode: failed ? reservation.error_code || 'GENERATION_FAILED' : ''
  };
}

export async function findPlatformGeneration(client, taskId, userId = '') {
  let query = client
    .from('generation_reservations')
    .select('id,user_id,status,error_code,provider,provider_task_id,provider_cost_usd,provider_result_url,provider_result_expires_at')
    .eq('provider', 'apimart')
    .eq('provider_task_id', taskId);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function settlePlatformGeneration(client, reservation, task) {
  if (!reservation || !['completed', 'failed'].includes(task?.status)) return false;
  if (reservation.status !== 'pending') return false;

  const { error: updateError } = await client
    .from('generation_reservations')
    .update(providerFieldsForTask(task))
    .eq('id', reservation.id)
    .eq('status', 'pending');
  if (updateError) throw updateError;

  if (task.status === 'completed' && task.image) {
    const { error } = await client.rpc('complete_generation_reservation', {
      p_reservation_id: reservation.id
    });
    if (error) throw error;
    return true;
  }

  const { error } = await client.rpc('release_generation_reservation', {
    p_reservation_id: reservation.id,
    p_error_code: task.errorCode || 'GENERATION_FAILED'
  });
  if (error) throw error;
  return true;
}
