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
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQDaC-uD4Q0GkTnG9lXqPb5HKgyUhlzcQVJOHJDnDyVNUdik"))) 
    const rewardsJettonMinter = provider.open(JettonMinter.createFromAddress(Address.parse("EQBsosmcZrD6FHijA7qWGLw5wo_aH8UN435hi935jJ_STORM")));
    const startTime = Math.round(Date.now() / 1000);
    const distributionPeriod = 7 * 24 * 60 * 60;
    const rewardsToAdd = toNano(100_000); 
    let jettonWallet = provider.open(JettonWallet.createFromAddress(await rewardsJettonMinter.getWalletAddress(provider.sender().address as Address)));
    await jettonWallet.sendTransfer(
        provider.sender(), rewardsToAdd, stakingPool.address, provider.sender().address!!, Gas.STAKE_JETTONS, StakingPool.addRewardsPayload(startTime, startTime + distributionPeriod)
    );
}
