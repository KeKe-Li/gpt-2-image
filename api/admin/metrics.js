import { getAuthContext } from '../_lib/supabase.js';
import { getGa4Traffic, isGa4Configured } from '../_lib/ga4.js';

function json(res, status, payload) {
  res.status(status).json(payload);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 180;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function utcDay(date = new Date()) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDateInput(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || isoDate(date) !== text) return null;
  return date;
}

function parseRange(req) {
  const raw = String(req.query?.range || '7d').toLowerCase();
  const today = utcDay();
  let startDate;
  let endDate = today;
  let preset = raw;

  if (raw === 'custom') {
    startDate = parseDateInput(req.query?.start);
    endDate = parseDateInput(req.query?.end);
    if (!startDate || !endDate) {
      return { error: 'INVALID_DATE_RANGE' };
    }
  } else if (raw === 'today') {
    startDate = today;
  } else {
    const days = raw === '90d' ? 90 : raw === '30d' ? 30 : raw === '7d' ? 7 : null;
    if (!days) return { error: 'INVALID_DATE_RANGE' };
    preset = `${days}d`;
    startDate = addDays(today, -(days - 1));
  }

  const days = Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
  if (days < 1 || days > MAX_RANGE_DAYS) {
    return { error: 'INVALID_DATE_RANGE' };
  }

  return {
    preset,
    startDate: isoDate(startDate),
    endDate: isoDate(endDate),
    startAt: startDate.toISOString(),
    endAt: addDays(endDate, 1).toISOString(),
    days
  };
}

function normalizeBusinessDailyRows(rows) {
  return (rows || []).map((row) => ({
    date: row?.date || row?.metric_date || '',
    registrations: Number(row?.registrations || row?.new_registrations || 0),
    newMembers: Number(row?.new_members || 0),
    generations: Number(row?.generations || 0),
    succeededGenerations: Number(row?.succeeded_generations || 0),
    failedGenerations: Number(row?.failed_generations || 0),
    creditsConsumed: Number(row?.credits_consumed || 0)
  }));
}

function normalizeBusinessMetrics(row, dailyRows = []) {
  const legacy = {
    totalUsers: Number(row?.total_users || 0),
    rangeUsers: Number(row?.range_users || 0),
    superAdmins: Number(row?.super_admins || 0),
    activeMemberships: Number(row?.active_memberships || 0),
    rangeMemberships: Number(row?.range_memberships || 0),
    totalCreditBalance: Number(row?.total_credit_balance || 0),
    totalGenerations: Number(row?.total_generations || 0),
    rangeGenerations: Number(row?.range_generations || 0),
    succeededGenerations: Number(row?.succeeded_generations || 0),
    failedGenerations: Number(row?.failed_generations || 0),
    pendingGenerations: Number(row?.pending_generations || 0),
    rangeSucceededGenerations: Number(row?.range_succeeded_generations || 0),
    totalGenerationCredits: Number(row?.total_generation_credits || 0),
    rangeGenerationCredits: Number(row?.range_generation_credits || 0),
    purchasedCredits: Number(row?.purchased_credits || 0),
    membershipCredits: Number(row?.membership_credits || 0)
  };

  return {
    ...legacy,
    totals: {
      registeredUsers: legacy.totalUsers,
      activeMembers: legacy.activeMemberships,
      totalGenerations: legacy.totalGenerations,
      totalCreditsConsumed: legacy.totalGenerationCredits,
      totalCreditBalance: legacy.totalCreditBalance,
      purchasedCredits: legacy.purchasedCredits,
      membershipCredits: legacy.membershipCredits,
      superAdmins: legacy.superAdmins,
      succeededGenerations: legacy.succeededGenerations,
      failedGenerations: legacy.failedGenerations,
      pendingGenerations: legacy.pendingGenerations
    },
    range: {
      newRegistrations: legacy.rangeUsers,
      newMembers: legacy.rangeMemberships,
      generations: legacy.rangeGenerations,
      succeededGenerations: legacy.rangeSucceededGenerations,
      failedGenerations: Number(row?.range_failed_generations || 0),
      creditsConsumed: legacy.rangeGenerationCredits
    },
    daily: normalizeBusinessDailyRows(dailyRows)
  };
}

function normalizeTraffic(traffic, range) {
  const rowsByDate = new Map((traffic.daily || []).map((row) => [row.date, row]));
  const daily = [];
  const start = parseDateInput(range.startDate);

  for (let index = 0; index < range.days; index += 1) {
    const date = isoDate(addDays(start, index));
    const row = rowsByDate.get(date) || {};
    daily.push({
      date,
      uv: Number(row.uv ?? row.activeUsers ?? 0),
      pv: Number(row.pv ?? row.pageViews ?? 0),
      visits: Number(row.visits ?? row.sessions ?? 0),
      newUsers: Number(row.newUsers || 0),
      activeUsers: Number(row.uv ?? row.activeUsers ?? 0),
      pageViews: Number(row.pv ?? row.pageViews ?? 0),
      sessions: Number(row.visits ?? row.sessions ?? 0)
    });
  }

  const totals = traffic.totals || {};
  return {
    ...traffic,
    totals: totals
      ? {
          uv: Number(totals.uv ?? totals.activeUsers ?? 0),
          pv: Number(totals.pv ?? totals.pageViews ?? 0),
          visits: Number(totals.visits ?? totals.sessions ?? 0),
          newUsers: Number(totals.newUsers || 0),
          activeUsers: Number(totals.uv ?? totals.activeUsers ?? 0),
          pageViews: Number(totals.pv ?? totals.pageViews ?? 0),
          sessions: Number(totals.visits ?? totals.sessions ?? 0)
        }
      : null,
    daily
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const auth = await getAuthContext(req);
  if (auth.error) {
    return json(res, auth.status || 401, { ok: false, error: auth.error });
  }

  if (!auth.profile?.isSuperAdmin) {
    return json(res, 403, { ok: false, error: 'FORBIDDEN' });
  }

  const range = parseRange(req);
  if (range.error) {
    return json(res, 400, { ok: false, error: range.error });
  }

  try {
    const [businessResult, legacyBusinessResult, dailyBusinessResult, trafficResult] = await Promise.allSettled([
      auth.client.rpc('get_admin_dashboard_metrics_v2', {
        p_start_at: range.startAt,
        p_end_at: range.endAt
      }),
      auth.client.rpc('get_admin_dashboard_metrics', { p_start_at: range.startAt }),
      auth.client.rpc('get_admin_dashboard_daily_metrics', {
        p_start_date: range.startDate,
        p_end_date: range.endDate
      }),
      getGa4Traffic({ startDate: range.startDate, endDate: range.endDate })
    ]);

    const activeBusinessResult = businessResult.status === 'fulfilled' && !businessResult.value?.error
      ? businessResult
      : legacyBusinessResult;

    if (activeBusinessResult.status === 'rejected' || activeBusinessResult.value?.error) {
      throw activeBusinessResult.reason || activeBusinessResult.value?.error;
    }

    const businessRow = Array.isArray(activeBusinessResult.value.data)
      ? activeBusinessResult.value.data[0]
      : activeBusinessResult.value.data;

    const businessDaily = dailyBusinessResult.status === 'fulfilled' && !dailyBusinessResult.value?.error
      ? dailyBusinessResult.value.data || []
      : [];

    const traffic = trafficResult.status === 'fulfilled'
      ? trafficResult.value
      : {
          configured: isGa4Configured(),
          error: 'GA4_REPORT_FAILED',
          totals: null,
          daily: [],
          topPages: [],
          channels: [],
          countries: []
        };

    return json(res, 200, {
      ok: true,
      range: {
        preset: range.preset,
        startDate: range.startDate,
        endDate: range.endDate,
        days: range.days
      },
      business: normalizeBusinessMetrics(businessRow, businessDaily),
      traffic: normalizeTraffic(traffic, range)
    });
  } catch (error) {
    console.warn('Failed to load admin metrics', {
      message: String(error?.message || 'unknown').slice(0, 240)
    });
    return json(res, 500, { ok: false, error: 'SERVER_NOT_CONFIGURED' });
  }
}
