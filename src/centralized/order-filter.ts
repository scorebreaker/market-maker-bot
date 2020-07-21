import BigNumber from 'bignumber.js';
import { Asset } from '../constants';

type MinimumCEXquantities = {
  BTC: BigNumber;
  ETH: BigNumber;
  DAI: BigNumber;
};

const MINIMUM_ORDER_SIZE: MinimumCEXquantities = {
  BTC: new BigNumber('0.0001'),
  ETH: new BigNumber('0.005'),
  DAI: new BigNumber('1'),
};

const shouldCreateCEXorder = (asset: Asset) => {
  return (quantity: BigNumber): boolean => {
    return quantity.isGreaterThanOrEqualTo(MINIMUM_ORDER_SIZE[asset]);
  };
};

export { shouldCreateCEXorder, MINIMUM_ORDER_SIZE };
