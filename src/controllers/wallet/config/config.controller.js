import { parametersValidation } from '../../../helpers/validations.helper';

export async function getLastLoadedAddressIndex(req, res) {
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  const index = await wallet.storage.store.getLastLoadedAddressIndex();
  res.send({ success: true, index });
}

export async function indexLimitSetEndIndex(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet, body: { index } } = req;
  await wallet.indexLimitSetEndIndex(index);
  res.send({ success: true });
}

export async function indexLimitLoadMoreAddresses(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet, body: { count } } = req;
  await wallet.indexLimitLoadMore(count);
  res.send({ success: true });
}
