import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Deviders, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("kQBE4iwpzx1o-Fu9Hd7KJxPPVAi-T0ZAWSIF93NT-r1Hztdo"))) //
    const lockJettonMinter = provider.open(JettonMinter.createFromAddress(Address.parse("kQBFCCzRftAknTMfCQWgPhGYIKzCYmG6OtAAqh8IRuFttWwK")));
    const lockPeriod = 60 * 60 * 24 * 3;
    const jettonsToStake = 500n; 

    let lockWallet = provider.open(JettonWallet.createFromAddress(await lockJettonMinter.getWalletAddress(provider.sender().address as Address)));
    let transactionRes = await lockWallet.sendTransfer(
        provider.sender(), jettonsToStake, stakingPool.address, provider.sender().address!!, Gas.STAKE_JETTONS, StakingPool.stakePayload(lockPeriod)
    );
}
