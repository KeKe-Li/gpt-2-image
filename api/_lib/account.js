export function formatTransaction(row) {
  const caseId = Number(row.metadata?.caseId || 0);
  return {
    id: row.id,
    amount: Number(row.amount || 0),
    type: row.type || '',
    source: row.source || '',
    metadata: row.metadata || {},
    caseId: Number.isFinite(caseId) && caseId > 0 ? caseId : null,
    createdAt: row.created_at || ''
  };
}

export async function getAccountExtras(client, userId) {
  const [usageResult, transactionsResult] = await Promise.all([
    client.rpc('get_user_account_usage', { p_user_id: userId }),
    client
      .from('credit_transactions')
      .select('id,amount,type,source,metadata,created_at')
      .eq('user_id', userId)
      .eq('type', 'generation')
      .order('created_at', { ascending: false })
      .limit(30)
  ]);

  if (usageResult.error) throw usageResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  const usage = Array.isArray(usageResult.data) ? usageResult.data[0] : usageResult.data;
  return {
    usage: {
      totalGenerations: Number(usage?.total_generations || 0),
      totalGenerationCredits: Number(usage?.total_generation_credits || 0)
    },
    recentTransactions: (transactionsResult.data || []).map(formatTransaction)
  };
}

export async function profileWithAccountExtras(client, profile) {
  if (!profile?.id) return profile;
  const extras = await getAccountExtras(client, profile.id);
  return {
    ...profile,
    ...extras
  };
}
