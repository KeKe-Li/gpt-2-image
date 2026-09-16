import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { OAuth2Client } from 'google-auth-library';

let analyticsClient;
let oauthClient;

function privateKey() {
  return process.env.GOOGLE_ANALYTICS_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

function hasOAuthConfig() {
  return Boolean(
    process.env.GA4_PROPERTY_ID
      && process.env.GOOGLE_ANALYTICS_CLIENT_ID
      && process.env.GOOGLE_ANALYTICS_CLIENT_SECRET
      && process.env.GOOGLE_ANALYTICS_REFRESH_TOKEN
  );
}

function hasServiceAccountConfig() {
  return Boolean(
    process.env.GA4_PROPERTY_ID
      && process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL
      && privateKey()
  );
}

export function isGa4Configured() {
  return hasOAuthConfig() || hasServiceAccountConfig();
}

function getServiceAccountClient() {
  if (!hasServiceAccountConfig()) return null;
  if (!analyticsClient) {
    analyticsClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
        private_key: privateKey()
      }
    });
  }
  return analyticsClient;
}

function getOAuthClient() {
  if (!hasOAuthConfig()) return null;
  if (!oauthClient) {
    oauthClient = new OAuth2Client(
      process.env.GOOGLE_ANALYTICS_CLIENT_ID,
      process.env.GOOGLE_ANALYTICS_CLIENT_SECRET
    );
    oauthClient.setCredentials({
      refresh_token: process.env.GOOGLE_ANALYTICS_REFRESH_TOKEN
    });
  }
  return oauthClient;
}

function rowMetric(row, name) {
  const index = row.metricHeaders?.findIndex((metric) => metric.name === name);
  if (index == null || index < 0) return 0;
  return Number(row.metricValues?.[index]?.value || 0);
}

function rowDimension(row, name) {
  const index = row.dimensionHeaders?.findIndex((dimension) => dimension.name === name);
  if (index == null || index < 0) return '';
  return row.dimensionValues?.[index]?.value || '';
}

function normalizeGaDate(value) {
  const text = String(value || '');
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  return text;
}

function normalizeRows(response) {
  const headers = {
    metricHeaders: response.metricHeaders || [],
    dimensionHeaders: response.dimensionHeaders || []
  };
  return (response.rows || []).map((row) => ({ ...row, ...headers }));
}

async function runReport(request) {
  const oauth = getOAuthClient();
  if (oauth) {
    const accessToken = await oauth.getAccessToken();
    const token = typeof accessToken === 'string' ? accessToken : accessToken?.token;
    if (!token) throw new Error('GA4_OAUTH_TOKEN_FAILED');

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(request)
      }
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || `GA4 report failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.code = payload?.error?.code;
      throw error;
    }
    return payload;
  }

  const client = getServiceAccountClient();
  if (!client) return null;
  const [response] = await client.runReport({
    property: `properties/${process.env.GA4_PROPERTY_ID}`,
    ...request
  });
  return response;
}

function normalizeDateRange(input) {
  if (typeof input === 'number') {
    return {
      startDate: `${input}daysAgo`,
      endDate: 'today'
    };
  }

  return {
    startDate: input?.startDate || '7daysAgo',
    endDate: input?.endDate || 'today'
  };
}

export async function getGa4Traffic(rangeInput) {
  if (!isGa4Configured()) {
    return {
      configured: false,
      totals: null,
      daily: [],
      topPages: [],
      channels: [],
      countries: []
    };
  }

  const dateRange = normalizeDateRange(rangeInput);

  const [totalsReport, dailyReport, pageReport, channelReport, countryReport] = await Promise.all([
    runReport({
      dateRanges: [dateRange],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'newUsers' }
      ]
    }),
    runReport({
      dateRanges: [dateRange],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'newUsers' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    }),
    runReport({
      dateRanges: [dateRange],
      dimensions: [{ name: 'pagePathPlusQueryString' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' }
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8
    }),
    runReport({
      dateRanges: [dateRange],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8
    }),
    runReport({
      dateRanges: [dateRange],
      dimensions: [{ name: 'country' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' }
      ],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8
    })
  ]);

  const daily = normalizeRows(dailyReport).map((row) => ({
    date: normalizeGaDate(rowDimension(row, 'date')),
    uv: rowMetric(row, 'activeUsers'),
    pv: rowMetric(row, 'screenPageViews'),
    visits: rowMetric(row, 'sessions'),
    newUsers: rowMetric(row, 'newUsers')
  })).map((row) => ({
    ...row,
    activeUsers: row.uv,
    pageViews: row.pv,
    sessions: row.visits
  }));

  const totalsRow = normalizeRows(totalsReport)[0];
  const totals = totalsRow
    ? {
        uv: rowMetric(totalsRow, 'activeUsers'),
        pv: rowMetric(totalsRow, 'screenPageViews'),
        visits: rowMetric(totalsRow, 'sessions'),
        newUsers: rowMetric(totalsRow, 'newUsers')
      }
    : { uv: 0, pv: 0, visits: 0, newUsers: 0 };

  return {
    configured: true,
    totals: {
      ...totals,
      activeUsers: totals.uv,
      pageViews: totals.pv,
      sessions: totals.visits
    },
    daily,
    topPages: normalizeRows(pageReport).map((row) => ({
      page: rowDimension(row, 'pagePathPlusQueryString') || '/',
      pageViews: rowMetric(row, 'screenPageViews'),
      pv: rowMetric(row, 'screenPageViews'),
      activeUsers: rowMetric(row, 'activeUsers')
    })),
    channels: normalizeRows(channelReport).map((row) => ({
      channel: rowDimension(row, 'sessionDefaultChannelGroup') || 'Unassigned',
      sessions: rowMetric(row, 'sessions'),
      visits: rowMetric(row, 'sessions'),
      activeUsers: rowMetric(row, 'activeUsers')
    })),
    countries: normalizeRows(countryReport).map((row) => ({
      country: rowDimension(row, 'country') || 'Unknown',
      activeUsers: rowMetric(row, 'activeUsers'),
      uv: rowMetric(row, 'activeUsers'),
      pageViews: rowMetric(row, 'screenPageViews'),
      pv: rowMetric(row, 'screenPageViews')
    }))
  };
}
