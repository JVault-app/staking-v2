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
    
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQAbbvEka-WfyrG1yXpnDNW72fkzNY6iplU12JVcPvXWE8R0")));
    await poolFactory.sendWithdrawJetton(provider.sender(), Address.parse("EQCC2NrD-Q-6U0CXitmJuB3fknnPF12y7jezYRvfb24sJPN8"), 100000000n)
}