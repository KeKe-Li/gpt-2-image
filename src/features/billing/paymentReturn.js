const supportedProviders = new Set(['alipay', 'stripe']);

export function inspectPaymentReturn(searchParams) {
  const provider = searchParams.get('provider');

  return {
    provider: supportedProviders.has(provider) ? provider : null,
    status: 'unconfigured',
    message: '支付服务尚未配置，当前无法确认订单结果。'
  };
}
