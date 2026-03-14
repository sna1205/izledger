export function shouldApplyTradeHydration(
  requestedTradeId: number | null,
  currentTradeId: number | null,
  requestId: number,
  latestRequestId: number
): boolean {
  return requestId === latestRequestId && requestedTradeId === currentTradeId
}
