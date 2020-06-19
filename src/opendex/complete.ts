import { BigNumber } from 'bignumber.js';
import { interval, Observable } from 'rxjs';
import { exhaustMap, mapTo, startWith, tap } from 'rxjs/operators';
import { getCentralizedExchangePrice$ } from '../centralized/exchange-price';
import { Config } from '../config';
import { Loggers } from '../logger';
import {
  GetTradeInfoParams,
  TradeInfo,
  tradeInfoArrayToObject,
} from '../trade/info';
import { getOpenDEXassets$ } from './assets';
import { logAssetBalance, parseOpenDEXassets } from './assets-utils';
import { CreateOpenDEXordersParams } from './create-orders';
import { tradeInfoToOpenDEXorders } from './orders';
import { removeOpenDEXorders$ } from './remove-orders';
import { getXudBalance$ } from './xud/balance';
import { getXudClient$ } from './xud/client';
import { createXudOrder$ } from './xud/create-order';
import { getXudTradingLimits$ } from './xud/trading-limits';

type GetOpenDEXcompleteParams = {
  config: Config;
  loggers: Loggers;
  tradeInfo$: ({
    config,
    openDexAssets$,
    centralizedExchangeAssets$,
    centralizedExchangePrice$,
  }: GetTradeInfoParams) => Observable<TradeInfo>;
  createOpenDEXorders$: ({
    config,
    logger,
    getTradeInfo,
    tradeInfoToOpenDEXorders,
    getXudClient$,
    createXudOrder$,
  }: CreateOpenDEXordersParams) => Observable<boolean>;
};

const getOpenDEXcomplete$ = ({
  config,
  loggers,
  tradeInfo$,
  createOpenDEXorders$,
}: GetOpenDEXcompleteParams): Observable<boolean> => {
  const openDEXassetsWithConfig = (config: Config) => {
    return getOpenDEXassets$({
      config,
      logger: loggers.opendex,
      parseOpenDEXassets,
      logBalance: logAssetBalance,
      xudClient$: getXudClient$,
      xudBalance$: getXudBalance$,
      xudTradingLimits$: getXudTradingLimits$,
    });
  };
  // Mock centralized exchange assets for testing
  const getCentralizedExchangeAssets$ = (config: Config) => {
    const testCentralizedBalances = {
      baseAssetBalance: new BigNumber(
        config.TEST_CENTRALIZED_EXCHANGE_BASEASSET_BALANCE
      ),
      quoteAssetBalance: new BigNumber(
        config.TEST_CENTRALIZED_EXCHANGE_QUOTEASSET_BALANCE
      ),
    };
    return interval(30000).pipe(
      startWith(testCentralizedBalances),
      mapTo(testCentralizedBalances),
      tap(({ baseAssetBalance, quoteAssetBalance }) => {
        loggers.centralized.info(
          `Base asset balance ${baseAssetBalance.toString()} and quote asset balance ${quoteAssetBalance.toString()}`
        );
      })
    );
  };
  return tradeInfo$({
    config,
    loggers,
    tradeInfoArrayToObject,
    openDexAssets$: openDEXassetsWithConfig,
    centralizedExchangeAssets$: getCentralizedExchangeAssets$,
    centralizedExchangePrice$: getCentralizedExchangePrice$,
  }).pipe(
    // ignore new trade information when creating orders
    // is already in progress
    exhaustMap((tradeInfo: TradeInfo) => {
      const getTradeInfo = () => {
        return tradeInfo;
      };
      // create orders based on latest trade info
      return createOpenDEXorders$({
        config,
        logger: loggers.opendex,
        getTradeInfo,
        getXudClient$,
        createXudOrder$,
        removeOpenDEXorders$,
        tradeInfoToOpenDEXorders,
      });
    })
  );
};

export { getOpenDEXcomplete$, GetOpenDEXcompleteParams };