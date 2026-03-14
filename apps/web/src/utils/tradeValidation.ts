export interface TradeValidationInstrument {
  min_lot: string | number
  lot_step: string | number
}

export interface TradeValidationExitRow {
  price: number
  quantity_lots: number
  executed_at: string
}

export interface TradeValidationInput {
  date: string
  direction: 'buy' | 'sell'
  entry_price: number
  stop_loss: number
  take_profit: number
  position_size: number
  commission: number
  spread_cost: number
  slippage_cost: number
  trade_completed: boolean
  primary_exit: TradeValidationExitRow
  exit_legs: TradeValidationExitRow[]
  instrument?: TradeValidationInstrument | null
  now_ms?: number
}

export function validateTradeIntegrity(input: TradeValidationInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const now = input.now_ms ?? Date.now()
  const closeDate = parseTradeDateTime(input.date)
  const entry = toFiniteNumber(input.entry_price)
  const stop = toFiniteNumber(input.stop_loss)
  const take = toFiniteNumber(input.take_profit)
  const positionSize = toFiniteNumber(input.position_size)
  const commission = toFiniteNumber(input.commission)
  const spreadCost = toFiniteNumber(input.spread_cost)
  const slippageCost = toFiniteNumber(input.slippage_cost)

  if (closeDate === null) {
    errors.date = 'Close date is required.'
  } else if (closeDate > now + 60_000) {
    errors.date = 'Close date cannot be in the future.'
  }

  if (!(entry > 0)) errors.entry_price = 'Entry price must be greater than 0.'
  if (!(stop > 0)) errors.stop_loss = 'Stop loss must be greater than 0.'
  if (!(take > 0)) errors.take_profit = 'Take profit must be greater than 0.'
  if (!(positionSize > 0)) errors.position_size = 'Position size must be greater than 0.'
  if (commission < 0) errors.commission = 'Commission cannot be negative.'
  if (spreadCost < 0) errors.spread_cost = 'Spread cost cannot be negative.'
  if (slippageCost < 0) errors.slippage_cost = 'Slippage cost cannot be negative.'

  const instrumentError = validateInstrumentLotSize(positionSize, input.instrument)
  if (instrumentError) {
    errors.position_size = instrumentError
  }

  if (entry > 0 && stop > 0 && entry === stop) {
    errors.stop_loss = 'Stop loss must differ from entry price.'
  }
  if (entry > 0 && take > 0 && entry === take) {
    errors.take_profit = 'Take profit must differ from entry price.'
  }

  if (entry > 0 && stop > 0 && take > 0) {
    if (input.direction === 'buy') {
      if (stop >= entry) errors.stop_loss = 'For buy trades, stop loss must be below entry.'
      if (take <= entry) errors.take_profit = 'For buy trades, take profit must be above entry.'
    } else {
      if (stop <= entry) errors.stop_loss = 'For sell trades, stop loss must be above entry.'
      if (take >= entry) errors.take_profit = 'For sell trades, take profit must be below entry.'
    }
  }

  if (entry > 0 && stop > 0 && positionSize > 0 && !(Math.abs(entry - stop) * positionSize > 0)) {
    errors.stop_loss = 'Risk must be greater than 0. Check entry, stop loss, and position size.'
  }

  if (!input.trade_completed) {
    errors.trade_completed = 'Mark trade as completed to log this execution.'
    return errors
  }

  const primaryDate = parseTradeDateTime(input.primary_exit.executed_at)
  if (!(toFiniteNumber(input.primary_exit.price) > 0)) {
    errors.exit_price = 'Exit price must be greater than 0.'
  }
  if (!(toFiniteNumber(input.primary_exit.quantity_lots) > 0)) {
    errors.exit_quantity = 'Exit size must be greater than 0.'
  } else {
    const primaryLotError = validateInstrumentLotSize(toFiniteNumber(input.primary_exit.quantity_lots), input.instrument)
    if (primaryLotError) {
      errors.exit_quantity = primaryLotError.replace('Lot size', 'Exit size')
    }
  }
  if (primaryDate === null) {
    errors.exit_time = 'Exit date/time is required.'
  } else if (primaryDate > now + 60_000) {
    errors.exit_time = 'Exit date/time cannot be in the future.'
  }

  let exitQuantity = toFiniteNumber(input.primary_exit.quantity_lots)
  for (let index = 0; index < input.exit_legs.length; index += 1) {
    const leg = input.exit_legs[index]!
    const price = toFiniteNumber(leg.price)
    const quantity = toFiniteNumber(leg.quantity_lots)
    const executedAt = parseTradeDateTime(leg.executed_at)

    if (!(price > 0)) {
      errors[`legs.${index}.price`] = `Partial exit ${index + 1} price must be greater than 0.`
    }
    if (!(quantity > 0)) {
      errors[`legs.${index}.quantity_lots`] = `Partial exit ${index + 1} size must be greater than 0.`
    } else {
      const lotError = validateInstrumentLotSize(quantity, input.instrument)
      if (lotError) {
        errors[`legs.${index}.quantity_lots`] = `Partial exit ${index + 1} ${lotError.toLowerCase()}`
      }
    }
    if (executedAt === null) {
      errors[`legs.${index}.executed_at`] = `Partial exit ${index + 1} time is required.`
    } else if (executedAt > now + 60_000) {
      errors[`legs.${index}.executed_at`] = `Partial exit ${index + 1} time cannot be in the future.`
    }

    exitQuantity += quantity
  }

  if (positionSize > 0 && exitQuantity > (positionSize + 0.0001)) {
    errors.legs = 'Total exit size cannot exceed position size.'
  }

  return errors
}

export function parseTradeDateTime(value: string): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function validateInstrumentLotSize(
  quantity: number,
  instrument?: TradeValidationInstrument | null
): string | null {
  if (!instrument) {
    return null
  }

  const minLot = toFiniteNumber(instrument.min_lot)
  const lotStep = toFiniteNumber(instrument.lot_step)

  if (!(minLot > 0) || !(lotStep > 0) || !(quantity > 0)) {
    return null
  }

  if (quantity + 0.0000001 < minLot) {
    return `Lot size must be at least ${trimNumeric(minLot)}.`
  }

  const steps = quantity / lotStep
  if (Math.abs(steps - Math.round(steps)) >= 0.000001) {
    return `Lot size must align to step ${trimNumeric(lotStep)}.`
  }

  return null
}

function toFiniteNumber(value: unknown): number {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function trimNumeric(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, '')
}
