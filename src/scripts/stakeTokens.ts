import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQDgOwSfRZYbDS6LJftQ0hwlan3VORQAbsYNhOk_pNh0Uyqi"))) //
    const lockJettonMinter = provider.open(JettonMinter.createFromAddress(Address.parse("EQBH-lTgGoe6x-wBoZGbOSBdVjfImvLEA2bueS_JR3GBsqFb")));
    const lockPeriod = 604800;
    const jettonsToStake = toNano(10n); 

    let lockWallet = provider.open(JettonWallet.createFromAddress(await lockJettonMinter.getWalletAddress(provider.sender().address as Address)));
    // await lockWallet.sendTransfer(provider.sender(), 100n, Address.parse("EQCVU4jFv4D7lkWSc8VMP4YMK_xm0w_IW93YC7PT1DKPmTKX"), provider.sender().address!!, 1n, null, toNano("0.07"))
    let transactionRes = await lockWallet.sendTransfer(
        provider.sender(), jettonsToStake, stakingPool.address, provider.sender().address!!, Gas.STAKE_JETTONS, StakingPool.stakePayload(lockPeriod)
    );
}
