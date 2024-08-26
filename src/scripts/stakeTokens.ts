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
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("0QA5KSeffz6c5dM7QmGtWIw88Tuab5bU8jFMghUj1OLjnX-q"))) //
    const lockJettonMinter = provider.open(JettonMinter.createFromAddress(Address.parse("kQDp7vL4SZvstANyUd--dr0kbQB876S8taEabdescqAHDNNh")));
    const lockPeriod = 60 * 60 * 24 * 3;
    const jettonsToStake = 612623808080809n; 

    let lockWallet = provider.open(JettonWallet.createFromAddress(await lockJettonMinter.getWalletAddress(provider.sender().address as Address)));
    let transactionRes = await lockWallet.sendTransfer(
        provider.sender(), jettonsToStake, stakingPool.address, provider.sender().address!!, Gas.STAKE_JETTONS, StakingPool.stakePayload(lockPeriod)
    );
}
