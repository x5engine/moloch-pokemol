import React, { useState, useEffect, createContext } from 'react';
import { useInterval } from '../utils/PollingUtil';
import { WalletStatuses, currentStatus } from '../utils/WalletStatus';
import { signInWithWeb3, signInWithSdk } from '../utils/Auth';
import { DaoService } from '../utils/DaoService';

export const CurrentUserContext = createContext();
export const CurrentWalletContext = createContext();
export const LoaderContext = createContext(false);
export const ModalContext = createContext();
export const RefreshContext = createContext();
export const DaoServiceContext = createContext();

const loginType = localStorage.getItem('loginType');

// main store of global state
const Store = ({ children }) => {
  // store of aws auth information and sdk
  const [currentUser, setCurrentUser] = useState();
  // stores user wallet balances and shares
  const [currentWallet, setCurrentWallet] = useState({
    eth: 0,
    tokenBalance: 0,
    allowance: 0,
    shares: 0,
    state: null,
    devices: null,
    _txList: [],
    addrByBelegateKey: null,
    status: WalletStatuses.Unknown,
  });

  // modal state for open once
  const [hasOpened, setHasOpened] = useState({});

  // const [name, setName] = useState('MetaCartel DAO');
  const [loading, setLoading] = useState(false);
  // set initial delay to 1 second to update sdk balance
  const [delay, setDelay] = useState(1000);
  // track number of times to do a 1 second update
  const [numTries, setNumTries] = useState(0);

  const [daoService, setDaoService] = useState();

  useEffect(() => {
    // runs on app load, sets up user auth and sdk if necessary
    const initCurrentUser = async () => {
      // do nothing if user is set
      if (currentUser) {
        return;
      }
      let user;
      let dao;
      try {
        switch (loginType) {
          case 'web3':
            user = await signInWithWeb3();
            dao = await DaoService.instantiateWithInjected(
              user.attributes['custom:account_address'],
              window.ethereum,
            );
            setDaoService(dao);
            break;
          case 'sdk':
          default:
            user = await signInWithSdk();
            dao = await DaoService.instantiateWithSDK(
              user.attributes['custom:account_address'],
              user.sdk,
            );
            setDaoService(dao);
            break;
        }
        setCurrentUser(user);
        localStorage.setItem('loginType', loginType);
      } catch (e) {
        console.log(
          `Could not log in with loginType ${loginType}: ${e.toString()}`,
        );
      }
    };

    initCurrentUser();
  }, []);

  // global polling service
  useInterval(async () => {
    if (!daoService) {
      console.log(`DaoService not initialized yet`);
      return;
    }
    // run on interval defined by $delay only if authenticated
    if (!currentUser) {
      return;
    }
    let accountDevices = null;
    // get account address from aws
    const acctAddr = currentUser.attributes['custom:account_address'];
    // get delegate key from contract to see if it is different
    const addrByBelegateKey = await daoService.mcDao.memberAddressByDelegateKey(
      acctAddr,
    );

    // get weth balance and allowance of contract
    // const wethWei = await tokenService.balanceOf(acctAddr);
    const tokenBalanceWei = await daoService.token.balanceOf(acctAddr);
    const allowanceWei = await daoService.token.allowance(
      acctAddr,
      daoService.daoAddress,
    );
    // convert from wei to eth
    const tokenBalance = daoService.web3.utils.fromWei(tokenBalanceWei);
    const allowance = daoService.web3.utils.fromWei(allowanceWei);

    // get member shares of dao contract
    const member = await daoService.mcDao.memberAddressByDelegateKey(acctAddr);
    // shares will be 0 if not a member, could also be 0 if rage quit
    // TODO: check membersheip a different way
    const shares = parseInt(member.shares);

    // use attached sdk
    const sdk = currentUser.sdk;

    // set initial values of contract wallet
    // these are set to zero every interval, maybe needed when user logs out
    let eth = 0;
    let state = WalletStatuses.Unknown;

    setLoading(true);
    eth = await daoService.getAccountEth();
    state = daoService.getAccountState();
    setLoading(false);

    // state.account will be undefined if not connected
    // should be loading durring this?
    //     it seems the sdk loads and then it takes a bit to get the account info
    //     could i check earlier that there is no account info
    //     not with getConnectedDevices because it errors before account connected
    if (loginType === 'sdk') {
      if (sdk && sdk.state.account) {
        // console.log('connected state', sdk.state);
        // check acount devices on sdk
        accountDevices = await sdk.getConnectedAccountDevices();
        // will be 'Created' or 'Delpoyed'
        state = sdk && sdk.state.account.state;
        // console.log('state', state);

        // console.log('when connected?', sdk && sdk.state.account.state);
        // set delay to 10 seconds after sdk balance is updated
      } else {
        // console.log('not connected, try again', sdk);
        state = WalletStatuses.Connecting;

        setNumTries(numTries + 1);
        // console.log('tries', numTries);
        // if sdk is not connected withen 5 seconds it probably is a new account
        // should be loading durring this?
        // TODO: need a better way to check this
        if (numTries >= 5) {
          state = WalletStatuses.NotConnected;
          setLoading(false);
        }
      }
    }
    setDelay(10000);

    // check transactions left over in bcprocessor storage
    const _txList = daoService.bcProcessor.getTxList(acctAddr);
    const pendingList = daoService.bcProcessor.getTxPendingList(acctAddr);

    if (pendingList.length) {
      for (let i = 0; i < pendingList.length; i++) {
        await daoService.bcProcessor.checkTransaction(pendingList[i].tx);
      }
    }

    const status = currentStatus(currentWallet, currentUser, state);

    // set state
    setCurrentWallet({
      ...currentWallet,
      ...{
        // tokenBalance: +tokenBalance,
        // allowance: +allowance,
        tokenBalance,
        allowance,
        eth,
        state,
        shares,
        accountDevices,
        _txList,
        addrByBelegateKey,
        status,
      },
    });
  }, delay);

  return (
    <LoaderContext.Provider value={[loading, setLoading]}>
      <ModalContext.Provider value={[hasOpened, setHasOpened]}>
        <RefreshContext.Provider value={[delay, setDelay]}>
          <DaoServiceContext.Provider value={[daoService]}>
            <CurrentUserContext.Provider value={[currentUser, setCurrentUser]}>
              <CurrentWalletContext.Provider
                value={[currentWallet, setCurrentWallet]}
              >
                {children}
              </CurrentWalletContext.Provider>
            </CurrentUserContext.Provider>
          </DaoServiceContext.Provider>
        </RefreshContext.Provider>
      </ModalContext.Provider>
    </LoaderContext.Provider>
  );
};

export default Store;
